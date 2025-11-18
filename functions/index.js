// This file uses the V2 syntax
const { onObjectFinalized } = require("firebase-functions/v2/storage");
// --- I've added onRequest and onSchedule to your imports ---
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
// ---
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const sharp = require('sharp'); 
const os = require('os');
const path = require('path');
const fs = require('fs');

initializeApp();
const db = getFirestore();

// --- Helper function for Email Content ---
function generateReceiptHtml(name, address, cart, total, orderId) {
    let subtotal = 0;
    let itemsHtml = "";

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        itemsHtml += `<li>${item.name} (Qty: ${item.quantity}) - R${itemTotal.toFixed(2)}</li>`;
        
        if (item.measurements) {
            itemsHtml += `
                <ul style="font-size: 0.9em; color: #555; list-style-type: none; padding-left: 10px;">
                    <li>Size: ${item.size}</li>
                    ${item.measurements.type === 'specific' ? `
                    <li>Bust: ${item.measurements.bust} cm</li>
                    <li>Waist: ${item.measurements.waist} cm</li>
                    <li>Hips: ${item.measurements.hips} cm</li>` : ''}
                </ul>
            `;
        }
    });
    const shipping = total - subtotal;
    return `
        <h1>Thank you for your order, ${name}!</h1>
        <p>Your Order ID is: <strong>#${orderId}</strong></p>
        <p>Your order will be shipped to:</p>
        <p>${address.name}<br>${address.address}<br>${address.city}, ${address.postalCode}</p>
        <hr>
        <h2>Order Summary</h2>
        <ul>${itemsHtml}</ul>
        <hr>
        <p>Subtotal: R${subtotal.toFixed(2)}</p>
        <p>Shipping: R${shipping.toFixed(2)}</p>
        <h3>Total: R${total.toFixed(2)}</h3>
    `;
}

// --- 1. IMAGE CONVERSION FUNCTION (V2 Storage Trigger) ---
exports.convertImageToWebP = onObjectFinalized({
    region: "africa-south1",
    memory: "512MiB", 
}, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name; 
    const contentType = event.data.contentType;

    if (!contentType || !contentType.startsWith('image/') || contentType === 'image/webp') {
        console.log("Exiting: Not a convertible image.");
        return null;
    }
    
    if (!filePath.startsWith('products/')) {
        console.log("Exiting: Not in products folder.");
        return null;
    }

    const uniqueID = path.basename(filePath, path.extname(filePath));
    const bucket = getStorage().bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    
    const webpFileName = uniqueID + '.webp';
    const tempWebpPath = path.join(os.tmpdir(), webpFileName);
    const destinationPath = path.join(path.dirname(filePath), webpFileName);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    
    try {
        await originalFile.download({ destination: tempFilePath });
        console.log("Image downloaded to temp path:", tempFilePath);

        await sharp(tempFilePath).webp({ quality: 80 }).toFile(tempWebpPath);
        console.log("Image converted to WebP at:", tempWebpPath);
        
        await bucket.upload(tempWebpPath, {
            destination: destinationPath,
            metadata: { contentType: 'image/webp' },
        });
        console.log("WebP image uploaded.");

        const newFile = bucket.file(destinationPath);
        const publicUrl = newFile.publicUrl();

        const jobRef = db.collection('image_jobs').doc(uniqueID);
        await jobRef.set({
            status: 'complete',
            publicUrl: publicUrl,
            timestamp: FieldValue.serverTimestamp()
        });
        console.log(`Job ${uniqueID} updated with final URL.`);
        
        await originalFile.delete(); 
        console.log("Original image deleted.");

    } catch (error) {
        console.error('Failed to convert or upload WebP image:', error);
        try {
             const jobRef = db.collection('image_jobs').doc(uniqueID);
             await jobRef.set({ status: 'error', error: error.message });
        } catch (dbError) {
             console.error("Failed to write error to job doc:", dbError);
        }
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    }
    return null;
});


// --- 2. ORDER PLACEMENT WITH INVENTORY CHECK (Secure Transaction) ---
exports.placeOrder = onCall({
    region: "africa-south1",
    memory: "512MiB",
}, async (request) => {
  
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to place an order.");
    }
    const uid = request.auth.uid;
    const { shippingAddress, cartUnits } = request.data;

    if (!shippingAddress || !cartUnits || cartUnits.length === 0) {
        throw new HttpsError("invalid-argument", "Missing required order data.");
    }

    const db = getFirestore();

    try {
        // We return the result of the transaction
        const result = await db.runTransaction(async (transaction) => {
            const finalSecureCart = [];
            let subtotal = 0;
            
            // 1. Group units by Product ID to minimize database reads
            // This allows us to handle "Buy 2 of same item" correctly
            const uniqueIds = [...new Set(cartUnits.map(u => u.id))];
            const productDocs = [];

            // Read all necessary products in the transaction
            for (const id of uniqueIds) {
                // We have to check both collections because we don't know which one it's in yet
                // (Optimized: In a real app, client should send collection name. 
                // Here we infer: if size is 'Custom', it's custom_styles)
                const isCustom = cartUnits.find(u => u.id === id).size === 'Custom';
                const collection = isCustom ? 'custom_styles' : 'products';
                
                const ref = db.collection(collection).doc(id);
                const doc = await transaction.get(ref);
                
                if (!doc.exists) {
                    throw new HttpsError("not-found", `Product ${id} no longer exists.`);
                }
                productDocs.push({ id, ref, data: doc.data(), collection });
            }

            // 2. Process Cart Units
            for (const unit of cartUnits) {
                const product = productDocs.find(p => p.id === unit.id);
                const productData = product.data;

                // --- INVENTORY CHECK (Retail Only) ---
                if (product.collection === 'products') {
                    const variants = productData.variants || [];
                    const variantIndex = variants.findIndex(v => v.size === unit.size);

                    if (variantIndex === -1) {
                        throw new HttpsError("invalid-argument", `Size ${unit.size} is invalid for ${productData.name}.`);
                    }

                    // Check Stock
                    if (variants[variantIndex].stock < 1) {
                        throw new HttpsError("failed-precondition", `Sorry, ${productData.name} (Size: ${unit.size}) is out of stock.`);
                    }

                    // Decrement Stock (in memory for now)
                    variants[variantIndex].stock -= 1;
                }

                // Add to final cart
                finalSecureCart.push({
                    id: unit.id,
                    name: productData.name,
                    image: productData.image_url,
                    price: productData.price,
                    quantity: 1,
                    size: unit.size,
                    measurements: unit.measurements || null
                });
                subtotal += productData.price;
            }

            // 3. Write Updates to DB
            
            // A. Update Stock Levels
            productDocs.forEach(product => {
                if (product.collection === 'products') {
                    transaction.update(product.ref, { variants: product.data.variants });
                }
            });

            // B. Create Order
            const totalAmount = subtotal + 50; // + Shipping
            const orderRef = db.collection("orders").doc(); // Generate ID
            
            transaction.set(orderRef, {
                userId: uid, 
                customer: shippingAddress, 
                order_date: FieldValue.serverTimestamp(),
                total_amount: totalAmount,
                status: "Pending",
                cart: finalSecureCart,
            });

            return { orderId: orderRef.id, finalSecureCart, totalAmount };
        });

        // 4. Send Email (After transaction succeeds)
        const { orderId, finalSecureCart, totalAmount } = result;
        const receiptHtml = generateReceiptHtml(shippingAddress.name, shippingAddress, finalSecureCart, totalAmount, orderId);
        
        await db.collection("mail").add({
            to: [shippingAddress.email],
            message: {
                subject: `Carries Boutique Order Confirmation #${orderId.slice(0, 8)}`,
                html: receiptHtml,
            },
        });

        return { success: true, orderId: orderId };

    } catch (error) {
        console.error("Order Transaction Failed:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Order failed.", error.message);
    }
});- THIS IS THE CORRECT ENDING for placeOrder


// --- 3. SITEMAP GENERATION FUNCTION (Scheduled) ---
// This function runs automatically once per day
exports.generateSitemap = onSchedule("every 24 hours", async (event) => {
    console.log("Starting daily sitemap generation...");
    
    const baseUrl = "https://carries-boutique.web.app";
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // 1. Add static pages (from your original sitemap.xml)
    const staticPages = [
        { loc: '/', priority: '1.0' },
        { loc: '/shop.html', priority: '0.9' },
        { loc: '/collections.html', priority: '0.8' },
        { loc: '/account.html', priority: '0.6' },
        { loc: '/policy.html', priority: '0.5' },
        { loc: '/faq.html', priority: '0.5' },
    ];

    staticPages.forEach(page => {
        xml += `<url><loc>${baseUrl}${page.loc}</loc><priority>${page.priority}</priority><changefreq>weekly</changefreq></url>`;
    });

    try {
        // 2. Add Retail Products
        const productsSnap = await db.collection('products').get();
        productsSnap.forEach(doc => {
            const prodId = doc.id;
            xml += `<url><loc>${baseUrl}/product.html?collection=products&amp;id=${prodId}</loc><priority>0.7</priority><changefreq>daily</changefreq></url>`;
        });

        // 3. Add Custom Styles
        const stylesSnap = await db.collection('custom_styles').get();
        stylesSnap.forEach(doc => {
            const styleId = doc.id;
            xml += `<url><loc>${baseUrl}/product.html?collection=custom_styles&amp;id=${styleId}</loc><priority>0.7</priority><changefreq>daily</changefreq></url>`;
        });

        xml += '</urlset>';

        // 4. Save the sitemap to a special config document
        await db.collection('_config').doc('sitemap').set({
            xml: xml,
            updated: FieldValue.serverTimestamp()
        });
        
        console.log("Sitemap generation successful.");

    } catch (error) {
        console.error("Error generating sitemap:", error);
    }
});


// --- 4. SITEMAP SERVING FUNCTION (HTTPS) ---
// This function serves the generated sitemap
exports.serveSitemap = onRequest({ region: "us-central1" }, async (request, response) => {
    try {
        const sitemapDoc = await db.collection('_config').doc('sitemap').get();
        
        if (!sitemapDoc.exists) {
            response.status(404).send("Sitemap not found.");
            return;
        }

        const sitemapData = sitemapDoc.data();
        response.set('Content-Type', 'application/xml');
        response.send(sitemapData.xml);
        
    } catch (error) {
        console.error("Error serving sitemap:", error);
        response.status(500).send("Could not serve sitemap.");
    }
});
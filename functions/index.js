// This file uses the V2 syntax
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

        await sharp(tempFilePath).webp({ quality: 80 }).toFile(tempWebpPath);
        
        await bucket.upload(tempWebpPath, {
            destination: destinationPath,
            metadata: { contentType: 'image/webp' },
        });

        const newFile = bucket.file(destinationPath);
        const publicUrl = newFile.publicUrl();

        const jobRef = db.collection('image_jobs').doc(uniqueID);
        await jobRef.set({
            status: 'complete',
            publicUrl: publicUrl,
            timestamp: FieldValue.serverTimestamp()
        });
        
        await originalFile.delete(); 

    } catch (error) {
        console.error('Failed to convert:', error);
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

// --- 2. ORDER PLACEMENT (Secure Transaction) ---
exports.placeOrder = onCall({
    region: "africa-south1",
    memory: "512MiB",
}, async (request) => {
  
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }
    const uid = request.auth.uid;
    const { shippingAddress, cartUnits } = request.data;

    if (!shippingAddress || !cartUnits || cartUnits.length === 0) {
        throw new HttpsError("invalid-argument", "Missing required order data.");
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const finalSecureCart = [];
            let subtotal = 0;
            
            const uniqueIds = [...new Set(cartUnits.map(u => u.id))];
            const productDocs = [];

            for (const id of uniqueIds) {
                const isCustom = cartUnits.find(u => u.id === id).size === 'Custom';
                const collection = isCustom ? 'custom_styles' : 'products';
                
                const ref = db.collection(collection).doc(id);
                const doc = await transaction.get(ref);
                
                if (!doc.exists) {
                    throw new HttpsError("not-found", `Product ${id} no longer exists.`);
                }
                productDocs.push({ id, ref, data: doc.data(), collection });
            }

            for (const unit of cartUnits) {
                const product = productDocs.find(p => p.id === unit.id);
                const productData = product.data;

                if (product.collection === 'products') {
                    const variants = productData.variants || [];
                    const variantIndex = variants.findIndex(v => v.size === unit.size);

                    if (variantIndex === -1) {
                        throw new HttpsError("invalid-argument", `Size ${unit.size} is invalid.`);
                    }

                    if (variants[variantIndex].stock < 1) {
                        throw new HttpsError("failed-precondition", `Sorry, ${productData.name} (${unit.size}) is out of stock.`);
                    }
                    variants[variantIndex].stock -= 1;
                }

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

            productDocs.forEach(product => {
                if (product.collection === 'products') {
                    transaction.update(product.ref, { variants: product.data.variants });
                }
            });

            const totalAmount = subtotal + 50; 
            const orderRef = db.collection("orders").doc();
            
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

        const { orderId, finalSecureCart, totalAmount } = result;
        const receiptHtml = generateReceiptHtml(shippingAddress.name, shippingAddress, finalSecureCart, totalAmount, orderId);
        
        await db.collection("mail").add({
            to: [shippingAddress.email],
            message: {
                subject: `Order Confirmation #${orderId.slice(0, 8)}`,
                html: receiptHtml,
            },
        });

        return { success: true, orderId: orderId };

    } catch (error) {
        console.error("Order Transaction Failed:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Order failed.", error.message);
    }
});

// --- 3. SITEMAP GENERATOR (Scheduled) ---
exports.generateSitemap = onSchedule("every 24 hours", async (event) => {
    console.log("Starting sitemap generation...");
    const baseUrl = "https://carries-boutique.web.app";
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    const staticPages = ['/', '/shop.html', '/collections.html', '/account.html', '/policy.html', '/faq.html'];
    staticPages.forEach(loc => {
        xml += `<url><loc>${baseUrl}${loc}</loc><changefreq>weekly</changefreq></url>`;
    });

    try {
        const productsSnap = await db.collection('products').get();
        productsSnap.forEach(doc => {
            xml += `<url><loc>${baseUrl}/product.html?collection=products&amp;id=${doc.id}</loc><changefreq>daily</changefreq></url>`;
        });

        const stylesSnap = await db.collection('custom_styles').get();
        stylesSnap.forEach(doc => {
            xml += `<url><loc>${baseUrl}/product.html?collection=custom_styles&amp;id=${doc.id}</loc><changefreq>daily</changefreq></url>`;
        });

        xml += '</urlset>';

        await db.collection('_config').doc('sitemap').set({
            xml: xml,
            updated: FieldValue.serverTimestamp()
        });
        console.log("Sitemap generated.");
    } catch (error) {
        console.error("Error generating sitemap:", error);
    }
});

// --- 4. SITEMAP SERVER (HTTPS) ---
exports.serveSitemap = onRequest({ region: "us-central1" }, async (request, response) => {
    try {
        const sitemapDoc = await db.collection('_config').doc('sitemap').get();
        if (!sitemapDoc.exists) {
            response.status(404).send("Sitemap not found.");
            return;
        }
        response.set('Content-Type', 'application/xml');
        response.send(sitemapDoc.data().xml);
    } catch (error) {
        console.error("Error serving sitemap:", error);
        response.status(500).send("Error serving sitemap.");
    }
});
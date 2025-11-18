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

// --- Helper function for Email Content (UPDATED) ---
function generateReceiptHtml(name, address, cart, total, orderId) {
    let subtotal = 0;
    let itemsHtml = "";

    // This cart is now the SECURE cart, so we can trust its prices
    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        itemsHtml += `<li>${item.name} (Qty: ${item.quantity}) - R${itemTotal.toFixed(2)}</li>`;
        
        // Check for measurements on custom items
        if (item.measurements) {
            itemsHtml += `
                <ul style="font-size: 0.9em; color: #555; list-style-type: none; padding-left: 10px;">
                    <li>Bust: ${item.measurements.bust || 'N/A'} cm</li>
                    <li>Waist: ${item.measurements.waist || 'N/A'} cm</li>
                    <li>Hips: ${item.measurements.hips || 'N/A'} cm</li>
                    <li>Height: ${item.measurements.height || 'N/A'} cm</li>
                    <li>Type: ${item.measurements.type || 'N/A'}</li>
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


// --- 2. ORDER PLACEMENT & EMAIL TRIGGER FUNCTION (NEW SECURE VERSION) ---
exports.placeOrder = onCall({
    region: "africa-south1",
    memory: "512MiB",
}, async (request) => {
  
    // 1. Check Authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to place an order.");
    }
    const uid = request.auth.uid;
    const userEmail = request.auth.token.email || request.data.shippingAddress.email; 

    // 2. Validate Input
    const { shippingAddress, cartUnits } = request.data;
    if (!shippingAddress || !cartUnits || cartUnits.length === 0 || !shippingAddress.email) {
        throw new HttpsError("invalid-argument", "Missing required order data (shipping, cart, or email).");
    }

    try {
        const finalSecureCart = [];
        let subtotal = 0;

        // 3. SECURE PRICE FETCHING
        for (const unit of cartUnits) {
            if (!unit.id || !unit.collection || !unit.size) {
                console.warn("Skipping invalid cart item:", unit.id);
                continue;
            }

            const productRef = db.collection(unit.collection).doc(unit.id);
            const doc = await productRef.get();

            if (!doc.exists) {
                throw new HttpsError("not-found", `Item ${unit.id} does not exist.`);
            }

            const productData = doc.data();
            const realPrice = productData.price; // Get the price from the DATABASE

            finalSecureCart.push({
                id: unit.id,
                name: productData.name,
                image: productData.image_url,
                price: realPrice, // Use the secure price
                quantity: 1, 
                size: unit.size,
                measurements: unit.measurements || null
            });

            subtotal += realPrice; // Add to subtotal
        }

        if (finalSecureCart.length === 0) {
             throw new HttpsError("invalid-argument", "Cart is empty or contains only invalid items.");
        }

        // 4. Calculate Final Total
        const shipping = 50.00; // Hardcode shipping
        const totalAmount = subtotal + shipping;

        // 5. Create the Order Document
        const orderData = {
            userId: uid, 
            customer: shippingAddress, 
            order_date: FieldValue.serverTimestamp(),
            total_amount: totalAmount,
            status: "Pending",
            cart: finalSecureCart, // Save the NEW, SECURE cart
        };
        
        const orderRef = await db.collection("orders").add(orderData);
        const orderId = orderRef.id;

        // 6. Trigger the Confirmation Email
        const receiptHtml = generateReceiptHtml(shippingAddress.name, shippingAddress, finalSecureCart, totalAmount, orderId);
        
        await db.collection("mail").add({
            to: [shippingAddress.email],
            // bcc: ["admin@your-email.com"], // Optional
            message: {
                subject: `Carries Boutique Order Confirmation #${orderId.slice(0, 8)}`,
                html: receiptHtml,
            },
        });

        // 7. Send Success Response to Client
        return { success: true, orderId: orderId };

    } catch (error) {
        console.error("Error placing order:", error);
        if (error instanceof HttpsError) {
            throw error;
        } else {
            throw new HttpsError("internal", "An error occurred while placing your order.", error.message);
        }
    }
}); // <-- THIS IS THE CORRECT ENDING for placeOrder


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
exports.serveSitemap = onRequest({ region: "africa-south1" }, async (request, response) => {
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
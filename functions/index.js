// This file uses the V2 syntax
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, cert } = require("firebase-admin/app");
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
        if (item.isCustom && item.measurements) {
            itemsHtml += `
                <ul style="font-size: 0.9em; color: #555; list-style-type: none; padding-left: 10px;">
                    <li>Bust: ${item.measurements.bust} cm</li>
                    <li>Waist: ${item.measurements.waist} cm</li>
                    <li>Hips: ${item.measurements.hips} cm</li>
                    <li>Height: ${item.measurements.height} cm</li>
                </ul>
            `;
        }
    });
    const shipping = total - subtotal;
    return `
        <h1>Thank you for your order, ${name}!</h1>
        <p>Your Order ID is: <strong>#${orderId}</strong></p>
        <p>Your order will be shipped to:</p>
        <p>${address.address}<br>${address.city}, ${address.postalCode}</p>
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
exports.convertImageToWebP = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Exit if not an image or if already WebP
    if (!contentType || !contentType.startsWith('image/') || contentType === 'image/webp') {
        console.log("Exiting: Not a convertible image.");
        return null;
    }

    const bucket = getStorage().bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const webpFileName = fileName.replace(/\.[^/.]+$/, "") + '.webp';
    const tempWebpPath = path.join(os.tmpdir(), webpFileName);
    
    try {
        await originalFile.download({ destination: tempFilePath });
        console.log("Image downloaded to temp path:", tempFilePath);

        await sharp(tempFilePath).webp({ quality: 80 }).toFile(tempWebpPath);
        console.log("Image converted to WebP at:", tempWebpPath);
        
        await bucket.upload(tempWebpPath, {
            destination: path.join(path.dirname(filePath), webpFileName),
            metadata: { contentType: 'image/webp' },
        });
        console.log("WebP image uploaded.");
        
        await originalFile.delete(); 
        console.log("Original image deleted.");

    } catch (error) {
        console.error('Failed to convert or upload WebP image:', error);
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    }
    return null;
});


// --- 2. ORDER PLACEMENT & EMAIL TRIGGER FUNCTION (V2 HTTPS Callable) ---
exports.placeOrder = onCall(async (request) => {
    // NOTE: This function relies on the Firebase Extension writing to the 'mail' collection.
  
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in to place an order.");
    }

    const {userInfo, shippingAddress, cart} = request.data;
    const uid = request.auth.uid;

    if (!userInfo || !shippingAddress || !cart || cart.length === 0) {
        throw new HttpsError("invalid-argument", "Missing required order data.");
    }

    try {
        let subtotal = 0;
        cart.forEach((item) => subtotal += item.price * item.quantity);
        const shipping = 50.00;
        const totalAmount = subtotal + shipping;

        const orderData = {
            customer_id: uid,
            customer_email: userInfo.email,
            order_date: FieldValue.serverTimestamp(),
            total_amount: totalAmount,
            status: "Pending",
            shipping_address: shippingAddress,
            items: cart,
        };
        const orderRef = await db.collection("orders").add(orderData);
        const orderId = orderRef.id;

        // Trigger the Email Extension by writing to the 'mail' collection
        const receiptHtml = generateReceiptHtml(userInfo.name, shippingAddress, cart, totalAmount, orderId);
        
        await db.collection("mail").add({
            to: [userInfo.email],
            message: {
                subject: `Order Confirmation #${orderId.slice(0, 8)}`,
                html: receiptHtml,
            },
        });

        return {success: true, orderId: orderId};
    } catch (error) {
        console.error("Error placing order:", error);
        throw new HttpsError("internal", "An error occurred while placing your order.", error.message);
    }
});
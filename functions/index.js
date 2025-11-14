// This file uses the V1 (1st Gen) syntax for maximum stability.

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

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

// --- 1. IMAGE CONVERSION FUNCTION (WebP) ---
exports.convertImageToWebP = functions.storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    // Exit if not an image or if already WebP
    if (!contentType || !contentType.startsWith('image/') || contentType === 'image/webp') return null;

    const bucket = storage.bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const webpFileName = fileName.replace(/\.[^/.]+$/, "") + '.webp';
    const tempWebpPath = path.join(os.tmpdir(), webpFileName);
    const webpFilePath = path.join(path.dirname(filePath), webpFileName);

    try {
        await originalFile.download({ destination: tempFilePath });
        await sharp(tempFilePath).webp({ quality: 80 }).toFile(tempWebpPath);
        
        await bucket.upload(tempWebpPath, {
            destination: webpFilePath,
            metadata: { contentType: 'image/webp' },
        });
        
        await originalFile.delete(); // Delete original JPG/PNG
    } catch (error) {
        console.error('Failed to convert or upload WebP image:', error);
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    }
    return null;
});


// --- 2. ORDER PLACEMENT & EMAIL TRIGGER FUNCTION (V1 HTTPS Callable) ---
exports.placeOrder = functions.https.onCall(async (data, context) => {
  // NOTE: This function now relies on the Firebase Extension to send the email.
  
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in to place an order.",
    );
  }

  const {userInfo, shippingAddress, cart} = data;
  const uid = context.auth.uid;

  if (!userInfo || !shippingAddress || !cart || cart.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required order data.");
  }

  try {
    // --- Order Logic (Save to Database) ---
    let subtotal = 0;
    cart.forEach((item) => subtotal += item.price * item.quantity);
    const shipping = 50.00;
    const totalAmount = subtotal + shipping;

    const orderData = {
      customer_id: uid,
      customer_email: userInfo.email,
      order_date: admin.firestore.FieldValue.serverTimestamp(),
      total_amount: totalAmount,
      status: "Pending",
      shipping_address: shippingAddress,
      items: cart,
    };
    const orderRef = await db.collection("orders").add(orderData);
    const orderId = orderRef.id;

    // --- Email Logic (Trigger the Extension) ---
    // The email body is built, then written to the 'mail' collection
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
    throw new functions.https.HttpsError("internal", "An error occurred while placing your order.", error.message);
  }
});
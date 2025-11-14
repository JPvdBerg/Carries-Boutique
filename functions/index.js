// This file is your new server.js
// It will run securely on Firebase's servers.

// --- Firebase V2 and Setup ---
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/v2/params");
const {onObjectFinalized} = require("firebase-functions/v2/storage"); // NEW: Import for Storage Trigger

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const { Storage } = require('@google-cloud/storage'); // NEW: For File Access
const sharp = require('sharp'); // NEW: For Image Processing
const fs = require('fs');
const os = require('os');
const path = require('path');

// Initialize Firebase Admin SDK and Storage Client
admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

// Define the SendGrid secret.
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

// --- 1. IMAGE CONVERSION FUNCTION: Triggered by new files in Storage ---
exports.convertImageToWebP = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // 1. Exit if not an image or if already WebP (to prevent infinite loop)
    if (!contentType.startsWith('image/') || contentType === 'image/webp') {
        console.log('Skipping non-image or already processed file.');
        return null;
    }

    const bucket = storage.bucket(fileBucket);
    const originalFile = bucket.file(filePath);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const webpFileName = fileName.replace(/\.[^/.]+$/, "") + '.webp';
    const tempWebpPath = path.join(os.tmpdir(), webpFileName);
    const webpFilePath = path.join(path.dirname(filePath), webpFileName); // Final path in storage

    // Check if the file exists
    if (!originalFile.exists()) {
        console.log('File does not exist, exiting.');
        return null;
    }

    // 2. Download original file to temp directory
    try {
        console.log(`Downloading original file: ${filePath}`);
        await originalFile.download({ destination: tempFilePath });

        // 3. Process the image using sharp
        console.log('Converting file to WebP...');
        await sharp(tempFilePath)
            .webp({ quality: 80 }) // Convert to WebP, 80% quality
            .toFile(tempWebpPath); // Save as temp .webp

        // 4. Upload the new WebP file back to storage
        console.log(`Uploading WebP file to ${webpFilePath}`);
        await bucket.upload(tempWebpPath, {
            destination: webpFilePath,
            metadata: {
                contentType: 'image/webp',
                // Add metadata linking it to original product/user here if needed
            },
        });
        
        // 5. Clean up: Delete the original file and temp files
        await originalFile.delete();
        console.log(`Deleted original file and temporary files.`);

    } catch (error) {
        console.error('Failed to convert or upload WebP image:', error);
    } finally {
        // Ensure local temp files are deleted regardless of success/failure
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
    }

    return null;
});


// --- 2. ORDER PROCESSING & EMAIL FUNCTION: Triggered by HTTP Call ---
exports.placeOrder = onCall({secrets: [SENDGRID_API_KEY]}, async (request) => {
  sgMail.setApiKey(SENDGRID_API_KEY.value());

  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "You must be logged in to place an order.",
    );
  }

  const {userInfo, shippingAddress, cart} = request.data;
  const uid = request.auth.uid;

  if (!userInfo || !shippingAddress || !cart || cart.length === 0) {
    throw new HttpsError(
        "invalid-argument",
        "Missing required order data.",
    );
  }

  try {
    const customerRef = db.collection("customers").doc(uid);
    await customerRef.set({
      email: userInfo.email,
      name: userInfo.name,
      firebase_uid: uid,
    }, {merge: true});

    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });
    const shipping = 50.00;
    const totalAmount = subtotal + shipping;

    const orderData = {
      customer_id: uid,
      customer_name: userInfo.name,
      customer_email: userInfo.email,
      order_date: admin.firestore.FieldValue.serverTimestamp(),
      total_amount: totalAmount,
      status: "Pending",
      shipping_address: shippingAddress,
      items: cart,
    };

    const orderRef = await db.collection("orders").add(orderData);
    const orderId = orderRef.id;

    const receiptHtml = generateReceiptHtml(
        userInfo.name,
        shippingAddress,
        cart,
        totalAmount,
        orderId,
    );
    const msg = {
      to: userInfo.email,
      from: "janpaulvdberg@gmail.com", 
      subject: `Order Confirmed - Carries Boutique (#${orderId})`,
      html: receiptHtml,
    };

    await sgMail.send(msg);

    return {success: true, orderId: orderId};
  } catch (error) {
    console.error("Error placing order:", error);
    throw new HttpsError(
        "internal",
        "An error occurred while placing your order.",
        error.message,
    );
  }
});

// Helper function (No changes)
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
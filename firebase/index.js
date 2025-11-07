// This file is your new server.js
// It will run securely on Firebase's servers.

// Use V2 functions and params
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/v2/params");

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// 1. Define the secret.
// This tells Firebase that our function needs this secret to run.
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

/**
 * placeOrder
 * This function is called from your app.js.
 * It validates the user, saves the order to Firestore, and sends an email.
 *
 * We update it to use onCall() and inject the secret.
 */
exports.placeOrder = onCall({secrets: [SENDGRID_API_KEY]}, async (request) => {
  // 2. Set the API key *inside* the function using the secret's value
  sgMail.setApiKey(SENDGRID_API_KEY.value());

  // 3. Check for Authentication (uses request.auth)
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to place an order.",
    );
  }

  // 4. Get data from the client (uses request.data)
  const {userInfo, shippingAddress, cart} = request.data;
  const uid = request.auth.uid;

  // 5. Basic Validation
  if (!userInfo || !shippingAddress || !cart || cart.length === 0) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required order data.",
    );
  }

  try {
    // 6. Find or Create the Customer in Firestore
    const customerRef = db.collection("customers").doc(uid);
    await customerRef.set({
      email: userInfo.email,
      name: userInfo.name,
      firebase_uid: uid,
    }, {merge: true});

    // 7. Calculate total
    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });
    const shipping = 50.00;
    const totalAmount = subtotal + shipping;

    // 8. Create the Order Document in Firestore
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

    // 9. Send the Confirmation Email
    const receiptHtml = generateReceiptHtml(
        userInfo.name,
        shippingAddress,
        cart,
        totalAmount,
        orderId,
    );
    const msg = {
      to: userInfo.email,
      from: "janpaulvdberg@gmail.com", // Your verified SendGrid sender
      subject: `Order Confirmed - Carries Boutique (#${orderId})`,
      html: receiptHtml,
    };

    await sgMail.send(msg);

    // 10. Return the new Order ID to the client
    return {success: true, orderId: orderId};
  } catch (error) {
    console.error("Error placing order:", error);
    throw new functions.https.HttpsError(
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


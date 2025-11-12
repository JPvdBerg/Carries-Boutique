const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// 1. Configure the email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass,
  },
});

// 2. The Cloud Function: Listens for new orders
exports.sendOrderConfirmation = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();
    const customerEmail = orderData.customer.email;
    const items = orderData.cart;

    // Build email HTML
    const itemsHtml = items.map(item => 
      `<li>${item.quantity}x ${item.name} (${item.size}) - R${item.price}</li>`
    ).join("");

    const totalCost = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50;

    const mailOptions = {
      from: '"Carries Boutique" <' + functions.config().email.user + '>',
      to: customerEmail,
      subject: `Order Confirmation: #${snapshot.id}`,
      html: `
        <h2>Thank you for your order!</h2>
        <h3>Order #${snapshot.id}</h3>
        <ul>${itemsHtml}</ul>
        <p><strong>Total: R${totalCost.toFixed(2)}</strong></p>
        <p>We will notify you when it ships.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${customerEmail}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  });
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// This runs whenever a new Order is saved
exports.processOrder = onDocumentCreated("orders/{orderId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const order = snapshot.data();
    const orderId = event.params.orderId;

    // Prevent infinite loops (if we update the order later)
    if (order.emailSent) return;

    console.log(`Processing order: ${orderId} for ${order.customer.name}`);

    // 1. Generate the Email HTML
    const itemsHtml = order.cart.map(item => 
        `<li>${item.name} (Size: ${item.size}) x${item.quantity} - R${item.price}</li>`
    ).join('');

    const emailHtml = `
        <h1>Thank you for your order!</h1>
        <p>Hi ${order.customer.name},</p>
        <p>We have received your order <strong>#${orderId.slice(0, 8)}</strong>.</p>
        <h3>Order Details:</h3>
        <ul>${itemsHtml}</ul>
        <p><strong>Total:</strong> R${(order.total_amount || "Calc on shipping").toString()}</p>
        <p>We will notify you when your order ships!</p>
        <br>
        <p>Warm regards,<br>Carries Boutique</p>
    `;

    // 2. Write to the 'mail' collection to trigger the Extension
    try {
        await admin.firestore().collection("mail").add({
            to: [order.customer.email],
            message: {
                subject: `Order Confirmation #${orderId.slice(0, 8)}`,
                html: emailHtml,
            }
        });

        // 3. Mark order as handled so we don't send it again
        return snapshot.ref.update({ emailSent: true });

    } catch (error) {
        console.error("Error queuing email:", error);
    }
});
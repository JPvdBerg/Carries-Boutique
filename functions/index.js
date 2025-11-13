const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// Trigger: Runs automatically when a new document is added to "orders" collection
exports.processOrder = onDocumentCreated("orders/{orderId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const order = snapshot.data();
    const orderId = event.params.orderId;

    // Prevent infinite loops
    if (order.processed) return;

    console.log(`New order received! ID: ${orderId}, Customer: ${order.customer.name}`);

    // Here you could add other logic later (like inventory deduction)
    // For now, just mark it as processed so we know the server saw it.
    
    try {
        return snapshot.ref.update({ processed: true });
    } catch (error) {
        console.error("Error marking order as processed:", error);
    }
});
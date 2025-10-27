require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();

// Setup server
app.use(cors()); // Allow requests from your frontend
app.use(express.json()); // Allow server to read JSON data

// Setup SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// This is the endpoint your frontend will call
app.post('/api/send-order', async (req, res) => {
  const { customer, cart } = req.body;

  // 1. Create the plain text and HTML for the receipt
  let receiptHtml = `
    <h1>Thank you for your order, ${customer.name}!</h1>
    <p>Your order will be shipped to:</p>
    <p>${customer.address}<br>${customer.city}, ${customer.postalCode}</p>
    <hr>
    <h2>Order Summary</h2>
    <ul>
  `;

  let subtotal = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    receiptHtml += `<li>${item.name} (Qty: ${item.quantity}) - R${itemTotal.toFixed(2)}</li>`;
  });

  const shipping = 50.00;
  const total = subtotal + shipping;

  receiptHtml += `
    </ul>
    <hr>
    <p>Subtotal: R${subtotal.toFixed(2)}</p>
    <p>Shipping: R${shipping.toFixed(2)}</p>
    <h3>Total: R${total.toFixed(2)}</h3>
  `;

  // 2. Create the email message object
  const msg = {
    to: customer.email, // Customer's email
    from: 'janpaulvdberg@gmail.com',
    subject: 'Your Order Confirmation from Carries Boutique',
    text: `Thank you for your order, ${customer.name}! Your total was R${total.toFixed(2)}.`, // Fallback for email clients that don't render HTML
    html: receiptHtml, // The full HTML receipt
  };

  // 3. Send the email
  try {
    await sgMail.send(msg);
    console.log('Email sent successfully');
    res.status(200).json({ message: 'Order processed and email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error.response.body);
    res.status(500).json({ message: 'Error sending email' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 👍`);
});
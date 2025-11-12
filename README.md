# Carries Boutique - Serverless E-commerce Platform

**Live Demo:** [https://carries-boutique.web.app](https://www.google.com/search?q=https://carries-boutique.web.app)

This project is a production-ready, full-stack e-commerce storefront built on a **Serverless Firebase Architecture**. It features a dual-product catalog (Retail vs. Custom Tailoring), a comprehensive mobile-responsive Admin Dashboard, and automated backend logic for order processing and email notifications.

-----

##  Key Features

###  Advanced Shopping Experience

  * **Dual Product Logic:** Supports two distinct product types:
      * **Retail:** Standard sizing (S, M, L) with real-time stock checking.
      * **Custom Styles:** Dynamic forms that capture specific user measurements (Bust, Waist, Hips) during checkout.
  * **Guest Checkout:** Users can browse and purchase without creating an account (utilizing Firebase Anonymous Auth).
  * **Related Products:** Algorithmic suggestions on product pages based on category matching.
  * **Dynamic Cart:** Persistent cart management with complex item validation.

###  User Accounts & History

  * **Google Sign-In:** Secure authentication via Firebase.
  * **Order History:** Logged-in users can view past orders, status updates, and total spend.
  * **Profile Management:** Users can save their body measurements to auto-fill future Custom orders.

###  Mobile-First Admin Dashboard

A fully responsive command center for the store owner:

  * **Product Management:** Add, Edit, and Delete products.
  * **Image Handling:** Direct image uploads with previews via **Firebase Storage**.
  * **Order Management:** View incoming orders and update statuses (Pending -\> Busy -\> Complete) in real-time.
  * **Secure:** Protected by strict Firestore Security Rules (Admin-only write access).

###  Automated Backend (Serverless)

  * **Firestore Database:** Real-time NoSQL database storing Users, Products, and Orders.
  * **Cloud Functions:** A Node.js backend trigger that listens for new orders.
  * **Transactional Emails:** Automatically sends HTML-formatted order confirmation emails via **Nodemailer** (Gmail SMTP) immediately upon purchase.

-----

##  Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML, Tailwind CSS, Vanilla JS | UI/UX, DOM Manipulation, Cart Logic, Toast Notifications. |
| **Auth** | **Firebase Auth** | Google Sign-In, Anonymous (Guest) Sessions, Admin Verification. |
| **Database** | **Cloud Firestore** | NoSQL data structure for Products, Orders, and Users. |
| **Storage** | **Firebase Storage** | Hosting product images uploaded via the Admin Dashboard. |
| **Backend** | **Firebase Cloud Functions** | Server-side logic triggered by database events. |
| **Email** | **Nodemailer** | SMTP transport for sending confirmation emails. |

-----

##  Project Structure

```
/Carries-Boutique
├── functions/                <-- The Backend Code (Node.js)
│   ├── index.js              <-- Cloud Function triggers (Email logic)
│   └── package.json          <-- Backend dependencies (Nodemailer)
├── admin.html                <-- Admin: Order Dashboard
├── admin-add-product.html    <-- Admin: Create/Edit Product Form
├── app.js                    <-- Core Client Logic (Cart, Auth, Firestore interactions)
├── admin.js                  <-- Admin Logic (Uploads, CRUD operations)
├── firestore.rules           <-- Database Security Rules
├── firebase.json             <-- Hosting & Functions configuration
└── index.html                <-- Storefront Home
```

-----

##  Setup & Installation

To run this project locally or deploy it, you need the **Firebase CLI**.

### 1\. Prerequisites

  * Node.js installed.
  * A Firebase Project created in the [Firebase Console](https://console.firebase.google.com/).
  * **Blaze Plan** (Pay-as-you-go) enabled on Firebase (Required for Cloud Functions external network requests).

### 2\. Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/Carries-Boutique.git

# 2. Install Firebase Tools globally
npm install -g firebase-tools

# 3. Login to Firebase
firebase login

# 4. Initialize Project (Link local folder to your Firebase project)
firebase init
# Select: Firestore, Functions, Hosting, Storage
```

### 3\. Backend Setup (Email)

To make the email system work, you must configure your SMTP credentials securely in the Firebase environment (do not hardcode them).

```bash
# Generate a Gmail App Password first!
firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-16-char-app-password"
```

### 4\. Running & Deploying

**To Run Frontend Locally:**
Simply use "Live Server" in VS Code on `index.html`.

**To Deploy to Live Production:**

```bash
# Deploy everything (Frontend + Backend + Database Rules)
firebase deploy
```

-----

##  Security

This project implements strict security measures:

1.  **Firestore Rules:**
      * **Public:** Read access to Products.
      * **User:** Read/Write access only to their own User document and Orders.
      * **Admin:** Full Read/Write access to all collections.
2.  **Environment Variables:** Email credentials are stored in Firebase Config, not in the source code.
3.  **Input Validation:** Frontend logic prevents adding out-of-stock items to the cart.

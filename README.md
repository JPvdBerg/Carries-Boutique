# Carries Boutique - Full-Stack E-commerce Demo

**Live Demo:** [**https://jpvdberg.github.io/Carries-Boutique/**](https://jpvdberg.github.io/Carries-Boutique/)

This project is a dynamic, multi-page e-commerce storefront built with a **Full-Stack JavaScript architecture**. It serves as a comprehensive demonstration of client-side logic, external API integration, and user authentication management, moving beyond a simple static demo.

-----

## Key Features

###  Full-Stack Authentication & Onboarding

The application enforces a complete, persistent user journey:

1.  **Mandatory Login:** All protected pages redirect non-logged-in users to a dedicated `login.html`.
2.  **Google Sign-In:** Utilizes **Firebase Authentication** for secure user identity and session management.
3.  **First-Time Profile Setup:** Upon first successful Google login, the user is immediately redirected to a `profile-setup.html` form to collect measurements (Bust, Waist, etc.).
4.  **Persistent Profile:** User data and the "profile complete" flag are stored in `localStorage`, allowing the user to bypass the setup on subsequent logins.
5.  **Secure Logout:** Logging out clears the session and the local profile flags, returning the user to the login page.

###  Live Order Processing

  * **Custom Backend API:** A dedicated Node.js/Express server (hosted on Render) manages business logic outside of the static frontend.
  * **Auto-Email Confirmation:** After checkout, the frontend sends the order data to the live Render API, which then triggers a **real confirmation email** via **SendGrid**.

###  E-commerce Functionality

  * **Dynamic Cart:** Cart items and totals are managed and persisted across sessions using `localStorage`.
  * **Checkout Autofill:** Logged-in users have their name and verified Google email automatically filled in and locked on the checkout form.

-----

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML, Tailwind CSS, Vanilla JS | UI/UX, DOM Manipulation, and Cart Logic. |
| **Authentication** | **Google Firebase Auth** | Identity management and persistent user sessions. |
| **Backend (API)** | **Node.js, Express.js, Render** | Hosting the server, API routing (`/api/send-order`), and health checks. |
| **Email Service** | **SendGrid** | Processing and delivering transactional emails. |

-----

## Project Structure

```
/Carries-Boutique
├── backend/                  <-- The Node.js Express Server (Requires 'npm install')
│   ├── server.js             <-- Handles API routes, SendGrid, and Render health check
│   └── package.json          <-- Node.js dependencies
├── login.html                <-- Mandatory sign-in page
├── profile-setup.html        <-- First-time user profile setup page
├── app.js                    <-- Primary JavaScript (Cart, Fetch, Firebase Auth Logic)
├── index.html                (Home Page)
└── ... (other pages, README.md, .gitignore)
```

-----

## Important: How to Run Locally

You must run this project on a local server to avoid browser security restrictions (CORS and `localStorage`).

### Running the Frontend (UI)

1.  Clone or download this repository.
2.  Open the project folder in **Visual Studio Code**.
3.  Right-click on `index.html` and select **"Open with Live Server"** (using the VS Code extension).

### Running the Backend (Server/Email)

To test the email functionality, you must run the server locally:

1.  Open your terminal inside the **`backend`** subdirectory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Ensure you have a **`.env`** file containing your actual SendGrid API Key (this file must be created locally and is excluded by `.gitignore`):
    ```
    SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```
4.  Start the server:
    ```bash
    node server.js
    ```
5.  Your local frontend (on `localhost:5500`) can now talk to your local backend (on `localhost:3000`).

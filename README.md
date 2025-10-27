# Carries Boutique - E-commerce Website

**Live Demo:** [**https://jpvdberg.github.io/Carries-Boutique/**](https://jpvdberg.github.io/Carries-Boutique/)

This is a modern, responsive frontend for "Carries Boutique," a premium fashion e-commerce website. It is a 6-page static site built with HTML, Tailwind CSS, and vanilla JavaScript. It features a **fully functional demo shopping cart** that persists across pages and browser sessions using the browser's `localStorage`.

This project serves as a comprehensive frontend demo and is not connected to a live backend or payment processor.

-----

## Features

  * **Fully Responsive Design:** Looks great on desktop, tablet, and mobile.
  * **Multi-Page Navigation:** A 6-page experience:
      * Home Page
      * Shop (All Products) Page
      * Product Detail Page
      * Shopping Cart Page
      * Checkout Page
      * Order Confirmation Page
  * **Dynamic Shopping Cart:**
      * Add items to the cart from the Home, Shop, and Product pages.
      * Update item quantities and remove items directly from the Cart page.
      * The cart icon in the navigation updates in real-time.
  * **Persistent State:** The cart's contents are saved in `localStorage`, so items remain even after closing the browser.
  * **Demo Checkout:** A checkout form that "processes" the order and clears the cart on submission.
  * **Modern UI/UX:** Built with Tailwind CSS and includes smooth scrolling and subtle "Animate on Scroll" (AOS) animations.

-----

## Tech Stack

  * **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
  * **CSS Framework:** [Tailwind CSS](https://tailwindcss.com/)
  * **Animations:** [AOS (Animate on Scroll)](https://github.com/michalsnik/aos)
  * **Icons:** [Feather Icons](https://feathericons.com/)

-----

##  Important: How to Run This Project Locally

You cannot simply open the `index.html` file in your browser.

This project uses `localStorage` for its cart. Most browsers (like Chrome) block `localStorage` from working on `file:///` paths for security reasons. For the cart to function, you **must run this project on a local server.**

### Recommended Method (VS Code Live Server)

1.  Clone or download this repository.
2.  Open the project folder in **Visual Studio Code**.
3.  Install the [**Live Server**](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension from the Extensions tab.
4.  Once installed, right-click on `index.html` in the VS Code file explorer.
5.  Select **"Open with Live Server"**.

This will automatically open the site on a local server (like `http://127.0.0.1:5500`) and all features will work perfectly.

### Alternative Method (Python)

If you have Python installed, you can run a simple server from your terminal:

1.  Navigate to the project's root directory:

    ```bash
    cd /path/to/Carries-Boutique
    ```

2.  Run one of the following commands:

      * **Python 3:**
        ```bash
        python -m http.server
        ```
      * **Python 2:**
        ```bash
        python -m SimpleHTTPServer
        ```

3.  Open `http://localhost:8000` in your browser.

-----

## Project Structure

```
/Carries-Boutique
├── index.html          (Home Page)
├── shop.html           (All Products Page)
├── product.html        (Single Product Detail Page)
├── cart.html           (Shopping Cart Page)
├── checkout.html       (Checkout Form Page)
├── confirmation.html   (Order Confirmation Page)
├── app.js              (Main JavaScript file for cart logic and all interactivity)
└── README.md           (This file)
```

-----

## How the Cart Works

The shopping cart is powered entirely by client-side JavaScript and `localStorage`.

  * **`app.js`** contains helper functions like `getCart()` and `saveCart()`, which read/write a JSON array to `localStorage.getItem('carriesBoutiqueCart')`.
  * When a page loads, `updateCartIcon()` is called to find all `.cart-badge` elements and display the correct total item count.
  * On the **Cart Page**, `renderCartPage()` dynamically builds the list of items from `localStorage`.
  * On the **Checkout Page**, `renderCheckoutSummary()` builds the order summary.
  * This provides a fast, persistent demo experience without needing any backend or database.

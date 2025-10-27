// Check immediately if Firebase Auth object is available
// Use a self-invoking function to run the check early
(function() {
    // We need to wait for Firebase Auth to initialize before checking the user state.
    // However, the full DOM might not be ready yet.
    // We create a temporary listener just for the initial auth check.

    const checkAuthStatus = () => {
        // Ensure firebase and firebase.auth() are ready
        if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
            const auth = firebase.auth();

            // Use onAuthStateChanged for the initial check too
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe(); // Important: Stop listening after the first check

                const currentPage = window.location.pathname.split('/').pop(); // Get current HTML filename

                if (!user && currentPage !== 'login.html') {
                    // If NOT logged in AND NOT on login.html, redirect to login
                    console.log("User not logged in. Redirecting to login page.");
                    window.location.href = 'login.html';
                } else {
                    // User is logged in, or already on the login page.
                    // Let the rest of the app load normally.
                    console.log("User logged in or on login page. Proceeding.");
                }
            });
        } else {
            // If Firebase isn't ready yet, wait a moment and try again.
            // This is a basic fallback, might need adjustment if Firebase loads very slowly.
            console.warn("Firebase not ready yet for auth check, retrying...");
            setTimeout(checkAuthStatus, 100); // Try again in 100ms
        }
    };

    // Start the check
    checkAuthStatus();

})(); // Immediately invoke the function

// --- END REDIRECT LOGIC ---


document.addEventListener('DOMContentLoaded', () => {
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
  });

  feather.replace();

  // --- Mobile Menu Toggle ---
  const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      mobileMenu.classList.toggle('hidden');

      const icon = this.querySelector('i');
      if (expanded) {
        icon.setAttribute('data-feather', 'menu');
      } else {
        icon.setAttribute('data-feather', 'x');
      }
      feather.replace();
    });
  }

  // --- Smooth Scrolling (for on-page anchors) ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const targetElement = document.querySelector(this.getAttribute('href'));
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Scroll Down Button (Hero Section) ---
  const scrollDownButton = document.querySelector('.scroll-down');
  if (scrollDownButton) {
    scrollDownButton.addEventListener('click', function() {
      const target = document.querySelector('#collections');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // --- SHOPPING CART LOGIC ---

  const getCart = () => JSON.parse(localStorage.getItem('carriesBoutiqueCart')) || [];
  const saveCart = (cart) => {
    localStorage.setItem('carriesBoutiqueCart', JSON.stringify(cart));
    updateCartIcon();
  };

  window.addToCart = (productId, productName, price, image) => {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id: productId, name: productName, price: price, image: image, quantity: 1 });
    }
    saveCart(cart);
    alert(`${productName} has been added to your cart!`);
  };

  const updateCartIcon = () => {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadges = document.querySelectorAll('.cart-badge'); // Select all badges
    cartBadges.forEach(cartBadge => {
      if (totalItems > 0) {
        cartBadge.textContent = totalItems;
        cartBadge.classList.remove('hidden');
      } else {
        cartBadge.textContent = '0'; // Ensure it resets if empty
        cartBadge.classList.add('hidden');
      }
    });
  };

  const renderCartPage = () => {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummaryContainer = document.getElementById('cart-summary-container');
    if (!cartItemsContainer) return;

    const cart = getCart();
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="text-gray-500">Your cart is empty. <a href="shop.html" class="text-pink-600 hover:underline">Start shopping!</a></p>';
      if (cartSummaryContainer) cartSummaryContainer.classList.add('hidden');
      return;
    }

    if (cartSummaryContainer) cartSummaryContainer.classList.remove('hidden');
    let subtotal = 0;

    cart.forEach(item => {
      subtotal += item.price * item.quantity;
      const itemHtml = `
        <div class="flex items-center justify-between py-4 border-b">
          <div class="flex items-center space-x-4">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg">
            <div>
              <h3 class="text-base md:text-lg font-medium text-gray-900">${item.name}</h3>
              <p class="text-sm text-gray-500">R${item.price.toFixed(2)}</p>
            </div>
          </div>
          <div class="flex items-center space-x-1 md:space-x-3">
            <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})">
              <i data-feather="minus" class="w-4 h-4"></i>
            </button>
            <span class="w-8 text-center text-sm md:text-base">${item.quantity}</span>
            <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})">
              <i data-feather="plus" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-base md:text-lg font-semibold text-gray-900">R${(item.price * item.quantity).toFixed(2)}</p>
          <button class="text-red-500 hover:text-red-700" onclick="removeFromCart('${item.id}')">
            <i data-feather="trash-2" class="w-4 h-4 md:w-5 md:h-5"></i>
          </button>
        </div>
      `;
      cartItemsContainer.innerHTML += itemHtml;
    });

    const shipping = 50.00;
    const total = subtotal + shipping;
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl = document.getElementById('cart-total');
    if (subtotalEl) subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = `R${shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `R${total.toFixed(2)}`;

    feather.replace();
  };

  window.updateCartQuantity = (productId, quantity) => {
    let cart = getCart();
    if (quantity <= 0) {
      cart = cart.filter(item => item.id !== productId);
    } else {
      const item = cart.find(item => item.id === productId);
      if (item) item.quantity = quantity;
    }
    saveCart(cart);
    renderCartPage();
  };

  window.removeFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCartPage();
  };

  const renderCheckoutSummary = () => {
    const summaryContainer = document.getElementById('checkout-summary');
    if (!summaryContainer) return;

    const cart = getCart();
    summaryContainer.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
      summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
      // Optionally disable checkout button if cart is empty
      const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
      if (placeOrderBtn) placeOrderBtn.disabled = true;
      return;
    }

    cart.forEach(item => {
      subtotal += item.price * item.quantity;
      const itemHtml = `
        <div class="flex justify-between items-center py-3 border-b">
          <div class="flex items-center space-x-3">
            <img src="${item.image}" alt="${item.name}" class="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg">
            <div>
              <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
              <p class="text-xs md:text-sm text-gray-500">Qty: ${item.quantity}</p>
            </div>
          </div>
          <p class="font-medium text-sm md:text-base">R${(item.price * item.quantity).toFixed(2)}</p>
        </div>
      `;
      summaryContainer.innerHTML += itemHtml;
    });

    const shipping = 50.00;
    const total = subtotal + shipping;

    const summaryTotalHtml = `
      <div class="py-3 space-y-2 border-b">
        <div class="flex justify-between text-sm md:text-base">
          <p class="text-gray-600">Subtotal</p>
          <p class="font-medium">R${subtotal.toFixed(2)}</p>
        </div>
        <div class="flex justify-between text-sm md:text-base">
          <p class="text-gray-600">Shipping</p>
          <p class="font-medium">R${shipping.toFixed(2)}</p>
        </div>
      </div>
      <div class="py-4 flex justify-between text-base md:text-lg font-bold">
        <p>Total</p>
        <p>R${total.toFixed(2)}</p>
      </div>
    `;
    summaryContainer.innerHTML += summaryTotalHtml;
  };

  // 7. Handle Checkout Form Submission
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById('name')?.value,
        email: document.getElementById('email')?.value,
        address: document.getElementById('address')?.value,
        city: document.getElementById('city')?.value,
        postalCode: document.getElementById('postal-code')?.value,
      };
      const cart = getCart();

      if (!formData.email || !formData.name || !formData.address || !formData.city || !formData.postalCode || cart.length === 0) {
        alert('Please fill out all shipping fields and ensure your cart is not empty.');
        return;
      }

      const submitButton = checkoutForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Placing Order...';
      }

      try {
        const response = await fetch('https://carries-boutique-server.onrender.com/api/send-order', { // Your LIVE Render server URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer: formData,
            cart: cart,
          }),
        });

        if (!response.ok) {
          // Try to get error message from server response if possible
          let errorMsg = 'Server responded with an error';
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch(jsonError) {
             // Ignore if response wasn't JSON
          }
          throw new Error(errorMsg);
        }

        // Only clear cart and redirect on successful submission
        localStorage.removeItem('carriesBoutiqueCart');
        updateCartIcon(); // Update icon immediately after clearing
        window.location.href = 'confirmation.html';

      } catch (error) {
        console.error('Failed to send order:', error);
        alert(`There was an error placing your order: ${error.message}. Please try again.`);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Place Order';
        }
      }
    });
  }

  // --- FIREBASE AUTHENTICATION LOGIC ---

  // Check if Firebase is initialized (should be by the script in HTML)
  if (typeof firebase !== 'undefined') {
    const auth = firebase.auth(); // Get the auth instance

    const authContainer = document.getElementById('auth-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const userInfoDiv = document.getElementById('user-info');
    const userDisplayNameSpan = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');

    const handleGoogleLogin = () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then((result) => {
          console.log("Logged in user:", result.user?.displayName || result.user?.email);
        }).catch((error) => {
          console.error("Google Sign-In Error:", error);
          alert(`Login failed: ${error.message}`);
        });
    };

    const handleLogout = () => {
      auth.signOut()
        .then(() => {
          console.log("User signed out.");
        }).catch((error) => {
          console.error("Sign Out Error:", error);
          alert(`Logout failed: ${error.message}`);
        });
    };

    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Observer for Authentication State Changes
    auth.onAuthStateChanged((user) => {
      console.log("Auth state changed, user:", user); // Debug log
      if (user) {
        // User is signed in.
        if (googleLoginBtn) googleLoginBtn.style.display = 'none'; // Use style.display
        if (userInfoDiv) userInfoDiv.style.display = 'flex'; // Use style.display and ensure it's flex
        if (userDisplayNameSpan) {
           userDisplayNameSpan.textContent = user.displayName || user.email;
        }
      } else {
        // User is signed out.
        if (googleLoginBtn) googleLoginBtn.style.display = 'inline-flex'; // Use style.display
        if (userInfoDiv) userInfoDiv.style.display = 'none'; // Use style.display
        if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';
      }
       // Ensure feather icons are re-rendered after UI changes
       setTimeout(feather.replace, 0);
    });

  } else {
    console.error("Firebase is not loaded or initialized!");
  }

  // --- END FIREBASE AUTHENTICATION LOGIC ---

  // --- INITIAL PAGE LOAD ---
  updateCartIcon(); // Update cart icon on every page load
  renderCartPage(); // Try to render cart items if on cart page
  renderCheckoutSummary(); // Try to render summary if on checkout page

  // Initial call to Feather Icons (in case auth state doesn't change immediately)
  feather.replace();
});
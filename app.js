// --- IMMEDIATE AUTH REDIRECT LOGIC ---
// This runs before the DOM is fully loaded to redirect quickly.
(function() {
    let initialAuthCheckDone = false;
    const checkAuthStatus = () => {
        // Retry mechanism in case Firebase scripts haven't loaded yet
        if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
            console.warn("Firebase not ready for initial auth check, retrying...");
            setTimeout(checkAuthStatus, 150); // Wait a bit longer
            return;
        }

        const auth = firebase.auth();
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (!initialAuthCheckDone) {
                initialAuthCheckDone = true;
                unsubscribe(); // Stop listening after the first check

                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                const allowedLoggedOutPages = ['login.html']; // Pages accessible when logged out

                console.log(`Initial Auth Check: User ${user ? 'found' : 'not found'}. Current page: ${currentPage}`);

                if (!user && !allowedLoggedOutPages.includes(currentPage)) {
                    // If NOT logged in AND NOT on an allowed logged-out page, redirect to login
                    console.log("Redirecting to login.html as user is not logged in.");
                    window.location.replace('login.html'); // Use replace to avoid back button issues
                } else if (user && currentPage === 'login.html') {
                    // If logged in BUT somehow on the login page, redirect to index
                    // The profile check will happen after DOMContentLoaded
                    console.log("Already logged in, redirecting from login page to index.");
                    window.location.replace('index.html');
                }
                // Otherwise, proceed normally (user logged in and not on login page, or user not logged in but on login page)
            }
        });
    };
    checkAuthStatus();
})();
// --- END IMMEDIATE AUTH REDIRECT LOGIC ---


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded."); // Debug log

    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    } else {
        console.warn("AOS library not found.");
    }

    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    } else {
        console.warn("Feather Icons library not found.");
    }


    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            mobileMenu.classList.toggle('hidden');

            const icon = this.querySelector('i');
            if (icon && typeof feather !== 'undefined') {
                 if (expanded) {
                    icon.setAttribute('data-feather', 'menu');
                } else {
                    icon.setAttribute('data-feather', 'x');
                }
                feather.replace(); // Replace only the changed icon
            }
        });
    }

    // --- Smooth Scrolling ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            // Check if it's an on-page link for the current page
            if (window.location.pathname.split('/').pop() === (this.pathname.split('/').pop() || 'index.html')) {
                try {
                     const targetElement = document.querySelector(href);
                     if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                     }
                } catch (error) {
                     console.warn(`Smooth scroll target not found or invalid selector: ${href}`, error);
                }
            }
            // Allow normal navigation for links to other pages (e.g., index.html#about from shop.html)
        });
    });

    // --- Scroll Down Button ---
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
        const cartBadges = document.querySelectorAll('.cart-badge');
        cartBadges.forEach(cartBadge => {
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.classList.remove('hidden');
            } else {
                cartBadge.textContent = '0';
                cartBadge.classList.add('hidden');
            }
        });
    };

    const renderCartPage = () => {
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartSummaryContainer = document.getElementById('cart-summary-container');
        if (!cartItemsContainer) return; // Only run on cart page

        const cart = getCart();
        cartItemsContainer.innerHTML = ''; // Clear existing items

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

        const shipping = 50.00; // Fixed shipping
        const total = subtotal + shipping;
        const subtotalEl = document.getElementById('cart-subtotal');
        const shippingEl = document.getElementById('cart-shipping');
        const totalEl = document.getElementById('cart-total');
        if (subtotalEl) subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = `R${shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `R${total.toFixed(2)}`;

        if (typeof feather !== 'undefined') feather.replace(); // Re-run feather icons
    };

    window.updateCartQuantity = (productId, quantity) => {
        let cart = getCart();
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== productId); // Remove if 0
        } else {
            const item = cart.find(item => item.id === productId);
            if (item) item.quantity = quantity;
        }
        saveCart(cart);
        renderCartPage(); // Re-render the cart
    };

    window.removeFromCart = (productId) => {
        let cart = getCart();
        cart = cart.filter(item => item.id !== productId);
        saveCart(cart);
        renderCartPage(); // Re-render the cart
    };

    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; // Only run on checkout page

        const cart = getCart();
        summaryContainer.innerHTML = ''; // Clear
        let subtotal = 0;

        if (cart.length === 0) {
            summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
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
         const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
         if (placeOrderBtn) placeOrderBtn.disabled = false; // Re-enable button if cart has items
    };

    // --- CHECKOUT FORM SUBMISSION ---
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
                console.log("Sending order data to server:", { customer: formData, cart: cart }); // Debug log
                const response = await fetch('https://carries-boutique-server.onrender.com/api/send-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer: formData, cart: cart }),
                });

                 console.log("Server response status:", response.status); // Debug log

                if (!response.ok) {
                    let errorMsg = 'Server responded with an error';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || `Status: ${response.status}`;
                         console.error("Server error data:", errorData); // Debug log
                    } catch(jsonError) {
                         console.error("Could not parse error response as JSON:", await response.text()); // Log raw text
                    }
                    throw new Error(errorMsg);
                }

                 const result = await response.json(); // Get success message
                 console.log("Server success response:", result); // Debug log

                localStorage.removeItem('carriesBoutiqueCart');
                updateCartIcon();
                window.location.href = 'confirmation.html';

            } catch (error) {
                console.error('Failed to send order:', error);
                alert(`There was an error placing your order: ${error.message}. Please check console for details.`);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
            }
        });
    }

    // --- FIREBASE AUTHENTICATION LOGIC ---
    // Make sure Firebase is loaded
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        const auth = firebase.auth();

        // Get references to NAV elements (might not exist on login.html)
        const authContainer = document.getElementById('auth-container');
        const navGoogleLoginBtn = document.getElementById('google-login-btn'); // Renamed to avoid clash
        const userInfoDiv = document.getElementById('user-info');
        const userDisplayNameSpan = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');

        // Get reference to LOGIN PAGE button (only exists on login.html)
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');

        const handleGoogleLogin = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            console.log("Attempting Google Sign-In...");
            auth.signInWithPopup(provider)
              .then((result) => {
                  console.log("Google Sign-In Successful. User:", result.user?.displayName || result.user?.email);
                  // Redirect or profile check happens in onAuthStateChanged
              }).catch((error) => {
                  console.error("Google Sign-In Error:", error);
                  alert(`Login failed: ${error.code} - ${error.message}`);
              });
        };

        const handleLogout = () => {
            console.log("Attempting Sign-Out...");
            auth.signOut()
              .then(() => {
                  console.log("User signed out successfully.");
                  // Clear potentially sensitive local storage on logout
                  localStorage.removeItem('profileComplete');
                  localStorage.removeItem('userProfileData');
                  // Redirect to login page after logout
                  window.location.href = 'login.html';
              }).catch((error) => {
                  console.error("Sign Out Error:", error);
                  alert(`Logout failed: ${error.message}`);
              });
        };

        // Add listener to NAV login button (if it exists)
        if (navGoogleLoginBtn) {
            navGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        }
        // Add listener to LOGIN PAGE login button (if it exists)
        if (pageGoogleLoginBtn) {
             pageGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        }
        // Add listener to NAV logout button (if it exists)
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // --- Auth State Observer ---
        auth.onAuthStateChanged((user) => {
            console.log("Auth state changed, user:", user ? (user.displayName || user.email) : null);
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';

            if (user) {
                // --- User is SIGNED IN ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'none';
                if (userInfoDiv) userInfoDiv.style.display = 'flex';
                if (userDisplayNameSpan) {
                   userDisplayNameSpan.textContent = user.displayName || user.email;
                }

                // Check if profile is complete
                const profileComplete = localStorage.getItem('profileComplete') === 'true';
                console.log("Profile complete flag:", profileComplete);

                if (!profileComplete && currentPage !== 'profile-setup.html') {
                    // If profile NOT complete AND we are NOT on the setup page, redirect there.
                    console.log("Redirecting logged-in user to profile setup.");
                    window.location.replace('profile-setup.html'); // Use replace
                } else if (profileComplete && currentPage === 'profile-setup.html') {
                    // If profile IS complete but user landed on setup, redirect away.
                    console.log("Profile complete, redirecting from setup page to index.");
                    window.location.replace('index.html'); // Use replace
                }
                // If profile complete and not on setup page, or if not complete and on setup page, stay put.

            } else {
                // --- User is SIGNED OUT ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'inline-flex';
                if (userInfoDiv) userInfoDiv.style.display = 'none';
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';

                // The immediate redirect logic at the top handles redirecting non-logged-in users
                // We don't need additional redirects here unless specifically logging out from a protected page.
            }
            // Re-render icons if needed (might be redundant if done elsewhere on state change)
            if (typeof feather !== 'undefined') setTimeout(feather.replace, 0);
        });

    } else {
        console.error("Firebase library not loaded or initialized correctly!");
        // Hide auth elements if Firebase fails
        const authContainer = document.getElementById('auth-container');
        if(authContainer) authContainer.style.display = 'none';
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');
        if(pageGoogleLoginBtn) pageGoogleLoginBtn.disabled = true;
    }
    // --- END FIREBASE AUTH LOGIC ---


    // --- PROFILE SETUP FORM HANDLER ---
    const profileSetupForm = document.getElementById('profile-setup-form');
    if (profileSetupForm) {
        console.log("Profile setup form found. Adding listener."); // Debug log
        profileSetupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Double check user state just in case
             if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || !firebase.auth().currentUser) {
                alert("Error: You seem to be logged out. Please log in again.");
                window.location.href = 'login.html'; // Redirect to login if user isn't available
                return;
            }

            const profileData = {
                bust: document.getElementById('bust')?.value,
                waist: document.getElementById('waist')?.value,
                hips: document.getElementById('hips')?.value,
                height: document.getElementById('height')?.value,
                fit: document.getElementById('fit')?.value,
                userId: firebase.auth().currentUser.uid, // Store the Firebase User ID
                email: firebase.auth().currentUser.email // Store email for reference
            };

            // Basic validation
            if (!profileData.bust || !profileData.waist || !profileData.hips) {
                alert("Please fill in at least Bust, Waist, and Hips measurements.");
                return;
            }

            try {
                localStorage.setItem('userProfileData', JSON.stringify(profileData));
                localStorage.setItem('profileComplete', 'true'); // Set the flag

                console.log("Profile data saved to localStorage:", profileData);
                alert("Profile saved successfully!");

                window.location.href = 'index.html'; // Redirect home

            } catch (error) {
                console.error("Error saving profile data to localStorage:", error);
                alert("Could not save profile. Please try again.");
            }
        });
    } else {
         console.log("Profile setup form NOT found on this page."); // Debug log
    }
    // --- END PROFILE SETUP FORM HANDLER ---


    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();
    renderCartPage();
    renderCheckoutSummary();
    if (typeof feather !== 'undefined') feather.replace(); // Initial feather icons render

}); // --- END DOMContentLoaded ---
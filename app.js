
// --- IMMEDIATE AUTH REDIRECT LOGIC ---
// This runs before the DOM is fully loaded to redirect quickly.
(function() {
    let initialAuthCheckDone = false;
    const checkAuthStatus = () => {
        // Retry mechanism in case Firebase scripts haven't loaded yet
        if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
            // console.warn("Firebase not ready for initial auth check, retrying...");
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

                // console.log(`Initial Auth Check: User ${user ? 'found' : 'not found'}. Current page: ${currentPage}`);

                if (!user && !allowedLoggedOutPages.includes(currentPage)) {
                    // If NOT logged in AND NOT on an allowed logged-out page, redirect to login
                    console.log("Redirecting to login.html as user is not logged in.");
                    window.location.replace('login.html'); // Use replace to avoid back button issues
                } else if (user && currentPage === 'login.html') {
                    // If logged in BUT somehow on the login page, redirect to index
                    // Profile check will happen in DOMContentLoaded listener
                    console.log("Already logged in, redirecting from login page to index.");
                    window.location.replace('index.html');
                }
                // Otherwise, proceed normally
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
    }

    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
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
                 feather.replace();
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
            // Check if the link points to the current page
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const linkPath = this.pathname.split('/').pop() || 'index.html';

            if (currentPath === linkPath) {
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
            // If the link points to a different page but has a hash, let the browser handle it
            // Or add logic here if you want JS to handle inter-page anchor scrolling
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
        if (!cartItemsContainer) return; // Only run on cart.html

        const cart = getCart();
        cartItemsContainer.innerHTML = ''; // Clear previous items

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="text-gray-500">Your cart is empty. <a href="shop.html" class="text-pink-600 hover:underline">Start shopping!</a></p>';
            if (cartSummaryContainer) cartSummaryContainer.classList.add('hidden'); // Hide summary if cart is empty
            updateCartTotals(0); // Update totals to zero
            return;
        }

        if (cartSummaryContainer) cartSummaryContainer.classList.remove('hidden'); // Show summary if cart has items
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

        updateCartTotals(subtotal);

        if (typeof feather !== 'undefined') feather.replace(); // Re-apply icons after adding dynamic content
    };

    const updateCartTotals = (subtotal) => {
        const shipping = subtotal > 0 ? 50.00 : 0; // Only charge shipping if there's a subtotal
        const total = subtotal + shipping;
        const subtotalEl = document.getElementById('cart-subtotal');
        const shippingEl = document.getElementById('cart-shipping');
        const totalEl = document.getElementById('cart-total');
        if (subtotalEl) subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = `R${shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `R${total.toFixed(2)}`;
    };


    window.updateCartQuantity = (productId, quantity) => {
        let cart = getCart();
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== productId); // Remove item if quantity is 0 or less
        } else {
            const item = cart.find(item => item.id === productId);
            if (item) item.quantity = quantity;
        }
        saveCart(cart);
        renderCartPage(); // Re-render the cart page display
        renderCheckoutSummary(); // Also update checkout summary if on that page
    };

    window.removeFromCart = (productId) => {
        let cart = getCart();
        cart = cart.filter(item => item.id !== productId);
        saveCart(cart);
        renderCartPage(); // Re-render the cart page display
        renderCheckoutSummary(); // Also update checkout summary if on that page
    };

    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; // Only run on checkout.html

        const cart = getCart();
        summaryContainer.innerHTML = ''; // Clear previous summary
        let subtotal = 0;

        if (cart.length === 0) {
            summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
            const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
            if (placeOrderBtn) placeOrderBtn.disabled = true; // Disable checkout if cart is empty
            updateCheckoutTotals(0); // Ensure totals are zeroed out
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

       updateCheckoutTotals(subtotal);
       const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
       if (placeOrderBtn) placeOrderBtn.disabled = false; // Enable button if cart has items
    };

    const updateCheckoutTotals = (subtotal) => {
         const shipping = subtotal > 0 ? 50.00 : 0;
         const total = subtotal + shipping;
         const summaryContainer = document.getElementById('checkout-summary');
         if(!summaryContainer) return; // Ensure we are on the checkout page

         // Find existing totals section or create it if not present
         let totalsDiv = summaryContainer.querySelector('.checkout-totals-section');
         if (!totalsDiv) {
             totalsDiv = document.createElement('div');
             totalsDiv.className = 'checkout-totals-section';
             summaryContainer.appendChild(totalsDiv); // Append totals at the end
         }

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
         totalsDiv.innerHTML = summaryTotalHtml; // Update only the totals section
    };


    // --- CHECKOUT FORM SUBMISSION ---
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                name: document.getElementById('name')?.value.trim(),
                email: document.getElementById('email')?.value.trim(),
                address: document.getElementById('address')?.value.trim(),
                city: document.getElementById('city')?.value.trim(),
                postalCode: document.getElementById('postal-code')?.value.trim(),
            };
            const cart = getCart();

            // Basic validation
            if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.postalCode) {
                alert('Please fill out all required shipping fields.');
                return;
            }
            if (cart.length === 0) {
                 alert('Your cart is empty. Cannot place order.');
                 return;
            }


            const submitButton = checkoutForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Placing Order...';
            }

            try {
                console.log("Sending order data to server:", { customer: formData, cart: cart });
                // Make sure your server URL is correct and handles CORS if needed
                const response = await fetch('https://carries-boutique-server.onrender.com/api/send-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer: formData, cart: cart }),
                });

                 console.log("Server response status:", response.status);

                if (!response.ok) {
                    let errorMsg = 'Server responded with an error';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || `Status: ${response.status}`;
                         console.error("Server error data:", errorData);
                    } catch(jsonError) {
                         console.error("Could not parse error response as JSON:", await response.text());
                    }
                    throw new Error(errorMsg);
                }

                 const result = await response.json();
                 console.log("Server success response:", result);

                // --- Order Successful ---
                // Store order ID temporarily if needed for confirmation page
                localStorage.setItem('lastOrderId', result.orderId || 'N/A'); // Use orderId from server if available

                // Clear the cart only after successful order submission
                localStorage.removeItem('carriesBoutiqueCart');
                updateCartIcon(); // Update nav icon immediately

                // Redirect to confirmation page
                window.location.href = 'confirmation.html';

            } catch (error) {
                console.error('Failed to send order:', error);
                alert(`There was an error placing your order: ${error.message}. Please check console for details or try again later.`);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
            }
        });
    }

     // --- ORDER CONFIRMATION PAGE LOGIC ---
     const orderIdSpan = document.getElementById('order-id');
     if (orderIdSpan && window.location.pathname.includes('confirmation.html')) {
         const lastOrderId = localStorage.getItem('lastOrderId');
         if (lastOrderId) {
             orderIdSpan.textContent = `#${lastOrderId}`;
             // Optional: Remove the order ID from storage after displaying it
             // localStorage.removeItem('lastOrderId');
         } else {
             orderIdSpan.textContent = 'N/A (Please check email)';
         }
         // Ensure cart is cleared (in case redirect happened before cart clear finished)
          localStorage.removeItem('carriesBoutiqueCart');
          updateCartIcon(); // Ensure icon is zero
     }


    // --- FIREBASE AUTHENTICATION LOGIC ---
    // Make sure Firebase is loaded AND auth is available globally from HTML
    if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {

        // Get references to NAV elements (might not exist on login.html or profile-setup.html)
        const navGoogleLoginBtn = document.getElementById('google-login-btn');
        const userInfoDiv = document.getElementById('user-info');
        const userDisplayNameSpan = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');

        // Get reference to LOGIN PAGE button (only exists on login.html)
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');

        // Get reference to Checkout inputs
        const checkoutNameInput = document.getElementById('name');
        const checkoutEmailInput = document.getElementById('email');


        const handleGoogleLogin = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            console.log("Attempting Google Sign-In...");
            // Use signInWithRedirect for mobile compatibility, but Popup is easier for this demo setup
            auth.signInWithPopup(provider)
              .then((result) => {
                  console.log("Google Sign-In Successful. User:", result.user?.displayName || result.user?.email);
                  // The onAuthStateChanged observer handles the redirects and UI updates next
              }).catch((error) => {
                  console.error("Google Sign-In Error:", error);
                  // Provide more user-friendly messages for common errors
                  let message = `Login failed: ${error.message}`;
                  if (error.code === 'auth/popup-closed-by-user') {
                      message = 'Login cancelled. Please try again.';
                  } else if (error.code === 'auth/network-request-failed') {
                      message = 'Network error. Please check your connection and try again.';
                  } else if (error.code === 'auth/cancelled-popup-request') {
                      // Ignore this, happens if user clicks button twice quickly
                      return;
                  }
                  alert(message);
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
                  // Keep cart on logout? Optional. Let's keep it for now.
                  // localStorage.removeItem('carriesBoutiqueCart');
                  // updateCartIcon();

                  // Redirect to login page after logout
                  window.location.replace('login.html');
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

                // 1. Update NAV BAR UI (if elements exist on this page)
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'none';
                if (userInfoDiv) userInfoDiv.style.display = 'flex';
                if (userDisplayNameSpan) {
                   userDisplayNameSpan.textContent = user.displayName || user.email; // Fallback to email
                }

                // 2. AUTOFIL CHECKOUT (If on Checkout Page)
                if (currentPage === 'checkout.html' && checkoutEmailInput && checkoutNameInput) {
                    checkoutEmailInput.value = user.email || '';
                    // Only fill name if it's empty, user might have typed something
                    if (!checkoutNameInput.value) {
                       checkoutNameInput.value = user.displayName || '';
                    }
                    // Prevent users from manually changing the email tied to their Google account
                    checkoutEmailInput.readOnly = true;
                    checkoutEmailInput.classList.add('bg-gray-100'); // Visual cue
                }


                // 3. PROFILE REDIRECT LOGIC (Check after login/page load)
                // Use localStorage for simple persistence
                const profileComplete = localStorage.getItem('profileComplete') === 'true';
                console.log("Profile complete flag:", profileComplete);

                if (!profileComplete && currentPage !== 'profile-setup.html' && currentPage !== 'login.html') {
                    // Redirect logged-in user to profile setup IF NOT ALREADY THERE and not on login page
                    console.log("Redirecting logged-in user to profile setup.");
                    window.location.replace('profile-setup.html');
                } else if (profileComplete && currentPage === 'profile-setup.html') {
                    // If profile IS complete but user landed on setup, redirect away.
                    console.log("Profile complete, redirecting from setup page to index.");
                    window.location.replace('index.html');
                }
                // If profileComplete and on login.html, the initial redirect logic should handle this.


            } else {
                // --- User is SIGNED OUT ---

                // Update NAV BAR UI (if elements exist on this page)
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'inline-flex';
                if (userInfoDiv) userInfoDiv.style.display = 'none';
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';

                // On checkout, clear autofill/readOnly if user somehow logs out
                if (currentPage === 'checkout.html' && checkoutEmailInput && checkoutNameInput) {
                    checkoutEmailInput.value = '';
                    checkoutEmailInput.readOnly = false;
                    checkoutEmailInput.classList.remove('bg-gray-100');
                    checkoutNameInput.value = '';
                }

                // The immediate redirect logic at the top handles redirecting non-logged-in users away from protected pages.
            }
            // Re-render icons just in case state change affected something
            if (typeof feather !== 'undefined') setTimeout(feather.replace, 0); // Use setTimeout to ensure DOM updates are flushed
        });

    } else {
        console.error("Firebase library not loaded or initialized correctly! Auth features disabled.");
        // Optionally disable login buttons if Firebase fails entirely
        const navGoogleLoginBtn = document.getElementById('google-login-btn');
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');
        if(navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'none';
        if(pageGoogleLoginBtn) {
            pageGoogleLoginBtn.disabled = true;
            pageGoogleLoginBtn.textContent = 'Login Unavailable';
            pageGoogleLoginBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    // --- END FIREBASE AUTH LOGIC ---


    // --- PROFILE SETUP FORM HANDLER (only runs on profile-setup.html) ---
    const profileSetupForm = document.getElementById('profile-setup-form');
    if (profileSetupForm) {
        console.log("Profile setup form found. Adding listener.");
        profileSetupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Double check user is logged in before saving profile data
             if (typeof firebase === 'undefined' || typeof auth === 'undefined' || !auth.currentUser) {
                 alert("Error: You seem to be logged out. Please log in again.");
                 window.location.replace('login.html');
                 return;
             }

            const profileData = {
                bust: document.getElementById('bust')?.value.trim(),
                waist: document.getElementById('waist')?.value.trim(),
                hips: document.getElementById('hips')?.value.trim(),
                height: document.getElementById('height')?.value.trim(),
                fit: document.getElementById('fit')?.value,
                // Add user identifiers for potential future database use
                userId: auth.currentUser.uid,
                email: auth.currentUser.email
            };

            // Basic validation
            if (!profileData.bust || !profileData.waist || !profileData.hips) {
                alert("Please fill in at least Bust, Waist, and Hips measurements.");
                return;
            }

            try {
                // Save profile data to localStorage
                localStorage.setItem('userProfileData', JSON.stringify(profileData));
                // Set the flag indicating profile setup is done
                localStorage.setItem('profileComplete', 'true');

                console.log("Profile data saved to localStorage:", profileData);
                alert("Profile saved successfully! You can now browse the store.");

                // Redirect to the home page or shop page after setup
                window.location.replace('index.html'); // Or 'shop.html'

            } catch (error) {
                console.error("Error saving profile data to localStorage:", error);
                alert("Could not save profile. Please try again or check browser permissions for storage.");
            }
        });
    }

    // --- PRODUCT PAGE LOGIC ---
    const loadProductDetails = async () => {
        // Only run on product.html
        if (!window.location.pathname.includes('product.html')) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            console.error("No product ID found in URL.");
            // Redirect or show error message
            document.body.innerHTML = '<p class="text-center text-red-600 p-10">Error: Product not found. Please go back to the <a href="shop.html" class="underline">shop</a>.</p>';
            return;
        }

        console.log("Loading product details for ID:", productId);

        // --- Placeholder for fetching product data ---
        // In a real app, you would fetch this from Firestore or your backend
        // For now, we'll use a hardcoded example based on the ID
        const products = {
            'prod_001': { name: "Floral Maxi Dress", price: 599.00, category: "Summer Collection", image: "http://static.photos/fashion/1024x768/5", thumbnails: ["http://static.photos/fashion/200x200/5", "http://static.photos/fashion/200x200/15", "http://static.photos/fashion/200x200/16", "http://static.photos/fashion/200x200/17"], description: "Embrace the summer breeze...", features: ["Perfect for beach/brunch", "Adjustable straps", "Smocked back"], details: ["100% Cotton", "Handcrafted", "Machine wash cold", "Hang dry", "Sizes: S, M, L, XL"] },
            'prod_002': { name: "Classic Denim Jacket", price: 799.00, category: "Casual Collection", image: "http://static.photos/fashion/1024x768/6", thumbnails: ["http://static.photos/fashion/200x200/6", "http://static.photos/fashion/200x200/18", "http://static.photos/fashion/200x200/19"], description: "A timeless wardrobe staple.", features: ["Button closure", "Chest pockets"], details: ["98% Cotton, 2% Elastane", "Machine wash", "Sizes: XS, S, M, L, XL"] },
            'prod_003': { name: "Silk Evening Blouse", price: 899.00, category: "Elegance Collection", image: "http://static.photos/fashion/1024x768/7", thumbnails: ["http://static.photos/fashion/200x200/7", "http://static.photos/fashion/200x200/20"], description: "Luxurious silk for special occasions.", features: ["V-neck", "Flowy fit"], details: ["100% Silk", "Dry clean only", "Sizes: S, M, L"] },
            'prod_004': { name: "Linen Wide Leg Pants", price: 699.00, category: "Comfort Collection", image: "http://static.photos/fashion/1024x768/8", thumbnails: ["http://static.photos/fashion/200x200/8", "http://static.photos/fashion/200x200/21", "http://static.photos/fashion/200x200/22"], description: "Comfortable and stylish linen pants.", features: ["Elastic waistband", "Wide leg"], details: ["100% Linen", "Machine wash cold", "Sizes: S, M, L, XL"] },
            'prod_005': { name: "Wide Brim Summer Hat", price: 349.00, category: "Accessories", image: "http://static.photos/fashion/1024x768/9", thumbnails: ["http://static.photos/fashion/200x200/9", "http://static.photos/fashion/200x200/23"], description: "Stay stylish and protected from the sun.", features: ["Wide brim", "UPF 50+"], details: ["Straw", "One size fits most"] },
            'prod_006': { name: "Leather Crossbody Bag", price: 1299.00, category: "Accessories", image: "http://static.photos/fashion/1024x768/10", thumbnails: ["http://static.photos/fashion/200x200/10", "http://static.photos/fashion/200x200/24", "http://static.photos/fashion/200x200/25"], description: "Elegant and practical leather bag.", features: ["Adjustable strap", "Multiple compartments"], details: ["Genuine Leather", "Imported"] },
            'prod_007': { name: "Red Satin Evening Dress", price: 1499.00, category: "Evening Elegance", image: "http://static.photos/fashion/1024x768/11", thumbnails: ["http://static.photos/fashion/200x200/11", "http://static.photos/fashion/200x200/26"], description: "Make a statement in this stunning red dress.", features: ["Satin finish", "Side slit"], details: ["Polyester/Spandex", "Dry clean", "Sizes: XS, S, M, L"] },
            'prod_008': { name: "Cozy Knit Sweater", price: 799.00, category: "Casual Comfort", image: "http://static.photos/fashion/1024x768/12", thumbnails: ["http://static.photos/fashion/200x200/12", "http://static.photos/fashion/200x200/27", "http://static.photos/fashion/200x200/28"], description: "Perfect for chilly days.", features: ["Chunky knit", "Relaxed fit"], details: ["Acrylic/Wool blend", "Hand wash", "Sizes: S, M, L, XL"] },

        };
        // --- End Placeholder Data ---

        const product = products[productId];

        if (!product) {
            console.error(`Product data not found for ID: ${productId}`);
            document.body.innerHTML = '<p class="text-center text-red-600 p-10">Error: Product details could not be loaded. Please go back to the <a href="shop.html" class="underline">shop</a>.</p>';
            return;
        }

        // Update the page elements with product data
        document.title = `${product.name} | Carries Boutique`;
        document.getElementById('main-product-image').src = product.image;
        document.getElementById('main-product-image').alt = product.name;
        document.getElementById('breadcrumb-product-name').textContent = product.name;
        document.getElementById('product-category').textContent = product.category;
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `R${product.price.toFixed(2)}`;
        document.getElementById('product-description').textContent = product.description;

        // Update features list
        const featuresList = document.getElementById('product-features');
        featuresList.innerHTML = ''; // Clear existing
        product.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });

        // Update details list
        const detailsList = document.getElementById('product-details');
        detailsList.innerHTML = ''; // Clear existing
        product.details.forEach(detail => {
            const li = document.createElement('li');
            li.textContent = detail;
            detailsList.appendChild(li);
        });

        // Update thumbnails
        const thumbnailsContainer = document.getElementById('product-thumbnails');
        thumbnailsContainer.innerHTML = ''; // Clear existing placeholders
        product.thumbnails.forEach((thumbUrl, index) => {
            const img = document.createElement('img');
            img.src = thumbUrl;
            img.alt = `Thumbnail ${index + 1}`;
            img.className = 'cursor-pointer border border-gray-200 hover:border-pink-500 rounded-lg';
            if (index === 0) {
                img.classList.add('border-2', 'border-pink-500'); // Highlight first thumb initially
            }
            img.addEventListener('click', () => {
                document.getElementById('main-product-image').src = product.image; // Or use a larger version if available
                // Update thumbnail highlighting
                thumbnailsContainer.querySelectorAll('img').forEach(thumb => thumb.classList.remove('border-2', 'border-pink-500'));
                img.classList.add('border-2', 'border-pink-500');
            });
            thumbnailsContainer.appendChild(img);
        });

        // Update Add to Cart button's onclick function call
        const addToCartButton = document.getElementById('add-to-cart-button');
        if (addToCartButton) {
            addToCartButton.onclick = () => addToCart(productId, product.name, product.price, product.thumbnails[0] || product.image);
        }

        // Add size selection logic if needed (e.g., store selected size)
        const sizeButtons = document.querySelectorAll('#product-sizes button');
        sizeButtons.forEach(button => {
            button.addEventListener('click', () => {
                sizeButtons.forEach(btn => btn.classList.remove('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500'));
                button.classList.add('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                // You might want to store the selected size, e.g., in a variable or attribute
                // selectedSize = button.textContent;
            });
        });

    };
    // --- END PRODUCT PAGE LOGIC ---


    // --- SHOP PAGE LOGIC ---
    const loadShopProducts = async () => {
        // Only run on shop.html
        if (!window.location.pathname.includes('shop.html')) {
            return;
        }

        const productGrid = document.getElementById('product-grid');
        if (!productGrid) {
            console.error("Product grid element not found on shop page.");
            return;
        }

        console.log("Loading products for shop page...");

         // --- Placeholder for fetching ALL product data ---
         // In a real app, fetch from Firestore/backend
         const allProducts = {
            'prod_001': { name: "Floral Maxi Dress", price: 599.00, category: "Summer Collection", image: "http://static.photos/fashion/640x360/5" },
            'prod_002': { name: "Classic Denim Jacket", price: 799.00, category: "Casual Collection", image: "http://static.photos/fashion/640x360/6" },
            'prod_003': { name: "Silk Evening Blouse", price: 899.00, category: "Elegance Collection", image: "http://static.photos/fashion/640x360/7" },
            'prod_004': { name: "Linen Wide Leg Pants", price: 699.00, category: "Comfort Collection", image: "http://static.photos/fashion/640x360/8" },
            'prod_005': { name: "Wide Brim Summer Hat", price: 349.00, category: "Accessories", image: "http://static.photos/fashion/640x360/9" },
            'prod_006': { name: "Leather Crossbody Bag", price: 1299.00, category: "Accessories", image: "http://static.photos/fashion/640x360/10" },
            'prod_007': { name: "Red Satin Evening Dress", price: 1499.00, category: "Evening Elegance", image: "http://static.photos/fashion/640x360/11" },
            'prod_008': { name: "Cozy Knit Sweater", price: 799.00, category: "Casual Comfort", image: "http://static.photos/fashion/640x360/12" },
             // Add more products if needed for a fuller shop page
             'prod_009': { name: "Striped Beach Towel", price: 299.00, category: "Accessories", image: "http://static.photos/fashion/640x360/13" },
             'prod_010': { name: "High-Waisted Jeans", price: 849.00, category: "Casual Collection", image: "http://static.photos/fashion/640x360/14" },
             'prod_011': { name: "Sunglasses", price: 499.00, category: "Accessories", image: "http://static.photos/fashion/640x360/15" },
             'prod_012': { name: "Little Black Dress", price: 999.00, category: "Evening Elegance", image: "http://static.photos/fashion/640x360/16" },
         };
         // --- End Placeholder Data ---

        productGrid.innerHTML = ''; // Clear placeholders

        Object.entries(allProducts).forEach(([id, product], index) => {
            const cardHtml = `
                <div class="product-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300" data-aos="fade-up" data-aos-delay="${100 + index * 50}">
                  <a href="product.html?id=${id}" class="relative block">
                    <img class="w-full h-80 object-cover" src="${product.image}" alt="${product.name}">
                  </a>
                  <div class="p-4">
                    <h3 class="text-lg font-medium text-gray-900"><a href="product.html?id=${id}" class="hover:underline">${product.name}</a></h3>
                    <p class="mt-1 text-sm text-gray-500">${product.category}</p>
                    <div class="mt-4 flex justify-between items-center">
                      <span class="text-lg font-bold text-gray-900">R${product.price.toFixed(2)}</span>
                      <button onclick="addToCart('${id}', '${product.name}', ${product.price}, '${product.image}')" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
            `;
            productGrid.innerHTML += cardHtml;
        });

         // Re-initialize AOS after adding products to ensure animations work
        if (typeof AOS !== 'undefined') {
             AOS.refresh();
        }
        // Re-apply Feather icons if any were added dynamically (unlikely here but good practice)
        if (typeof feather !== 'undefined') feather.replace();

    };
    // --- END SHOP PAGE LOGIC ---


    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();       // Update cart count in nav on every page load
    loadProductDetails();   // Run product detail loading logic (only affects product.html)
    loadShopProducts();     // Run shop product loading logic (only affects shop.html)
    renderCartPage();       // Run cart rendering logic (only affects cart.html)
    renderCheckoutSummary();// Run checkout summary logic (only affects checkout.html)


    // Ensure Feather Icons run one last time after dynamic content might be added
    if (typeof feather !== 'undefined') setTimeout(feather.replace, 100); // Small delay


}); // --- END DOMContentLoaded ---

```
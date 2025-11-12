// --- TOAST NOTIFICATION HELPER ---
const showToast = (message) => {
    const container = document.getElementById('toast-container');
    const msgEl = document.getElementById('toast-message');
    
    if (!container || !msgEl) return;

    // Set message
    msgEl.textContent = message;
    
    // Show (remove hidden, animate in)
    container.classList.remove('hidden');
    setTimeout(() => {
        container.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Re-initialize icons
    if (typeof feather !== 'undefined') feather.replace();

    // Hide after 3 seconds
    setTimeout(() => {
        container.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            container.classList.add('hidden');
        }, 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    let isMeasurementsLoaded = false;
    console.log("DOM Content Loaded.");

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
            // Check if on the same page for smooth scroll
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const anchorPath = this.pathname.split('/').pop() || 'index.html';

            if (currentPath === anchorPath) {
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
        });
    });

    // --- Scroll Down Button ---
    const scrollDownButton = document.querySelector('.scroll-down');
    if (scrollDownButton) {
        scrollDownButton.addEventListener('click', function() {
            // Updated to scroll to the "about" section on the new index page
            const target = document.querySelector('#about');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- ================================== ---
    // --- SHOPPING CART LOGIC (With Sizes) ---
    // --- ================================== ---
    const getCart = () => JSON.parse(localStorage.getItem('carriesBoutiqueCart')) || [];
    const saveCart = (cart) => {
        localStorage.setItem('carriesBoutiqueCart', JSON.stringify(cart));
        updateCartIcon();
    };

    /**
     * Creates a unique ID for a cart item based on its product ID and size.
     * e.g., 'prod_001_M'
     */
    const createCartItemId = (productId, size) => {
        if (!size) {
            console.error("Size is undefined, defaulting to 'default'");
            size = 'default'; // Failsafe, but should be provided
        }
        return `${productId}_${size}`;
    };

    window.addToCart = (productId, productName, price, image, size) => {
        if (!size) {
            // This case handles the "Custom" styles which don't have S,M,L
            if (productName.toLowerCase().includes('custom')) {
                size = 'Custom';
            } else {
                alert('Error: No size specified for this item.');
                return;
            }
        }

        const cart = getCart();
        const cartItemId = createCartItemId(productId, size);
        
        const existingItem = cart.find(item => item.cartItemId === cartItemId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                cartItemId: cartItemId, // e.g., 'prod_001_M'
                id: productId,          // e.g., 'prod_001'
                name: productName,
                price: price,
                image: image,
                size: size,           // e.g., 'M' or 'Custom'
                quantity: 1
            });
        }
        saveCart(cart);
        // --- FIXED: Replaced ugly alert() with sleek toast ---
        showToast(`${productName} (Size: ${size}) added to cart!`);
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
        if (!cartItemsContainer) return; // Not on the cart page

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
            
            // --- STALE ITEM FIX ---
            // We need a unique ID for the buttons. Use cartItemId if it exists, fall back to old id
            const uniqueItemId = item.cartItemId || item.id; 
            const itemSize = item.size || 'undefined'; // Handle old items with no size

            const itemHtml = `
              <div class="flex items-center justify-between py-4 border-b">
                <div class="flex items-center space-x-4">
                  <img src="${item.image}" alt="${item.name}" class="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg">
                  <div>
                    <h3 class="text-base md:text-lg font-medium text-gray-900">${item.name}</h3>
                    <p class="text-sm text-gray-600 font-medium">Size: ${itemSize}</p>
                    <p class="text-sm text-gray-500">R${item.price.toFixed(2)}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-1 md:space-x-3">
                  <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${uniqueItemId}', ${item.quantity - 1})">
                    <i data-feather="minus" class="w-4 h-4"></i>
                  </button>
                  <span class="w-8 text-center text-sm md:text-base">${item.quantity}</span>
                  <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${uniqueItemId}', ${item.quantity + 1})">
                    <i data-feather="plus" class="w-4 h-4"></i>
                  </button>
                </div>
                <p class="text-base md:text-lg font-semibold text-gray-900">R${(item.price * item.quantity).toFixed(2)}</p>
                <button class="text-red-500 hover:text-red-700" onclick="removeFromCart('${uniqueItemId}')">
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

        if (typeof feather !== 'undefined') feather.replace();
    };

    // --- STALE ITEM FIX ---
    // Updated to handle both old (id) and new (cartItemId) items
    window.updateCartQuantity = (itemId, quantity) => {
        let cart = getCart();
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            cart = cart.filter(item => (item.cartItemId !== itemId && item.id !== itemId));
        } else {
            const itemToUpdate = cart.find(item => item.cartItemId === itemId || item.id === itemId);
            if (itemToUpdate) {
                itemToUpdate.quantity = quantity;
            }
        }
        saveCart(cart);
        renderCartPage();
    };

    // --- STALE ITEM FIX ---
    // Updated to handle both old (id) and new (cartItemId) items
    window.removeFromCart = (itemId) => {
        let cart = getCart();
        cart = cart.filter(item => (item.cartItemId !== itemId && item.id !== itemId));
        saveCart(cart);
        renderCartPage(); // Rerender cart page
        renderCheckoutSummary(); // Also rerender checkout summary if on that page
    };

    // --- =================================== ---
    // --- UPDATED CHECKOUT SUMMARY RENDERER ---
    // --- =================================== ---
    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; // Not on checkout page

        const cart = getCart();
        summaryContainer.innerHTML = ''; // Clear previous content
        let subtotal = 0;

        // --- NEW LOGIC: Check if any custom items are in the cart ---
        const hasCustomItem = cart.some(item => item.size === 'Custom');
        const defaultMeasurementsSection = document.getElementById('default-measurements-section');
        
        if (defaultMeasurementsSection) {
            if (hasCustomItem) {
                defaultMeasurementsSection.style.display = 'block'; // Show
            } else {
                defaultMeasurementsSection.style.display = 'none'; // Hide
            }
        }
        // --- END NEW LOGIC ---

        if (cart.length === 0) {
            summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
            const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
            if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Place Order';
            }
            return;
        }

        // --- 1. Render Each Cart Item ---
        cart.forEach((item, index) => {
            const cartItemUniqueId = item.cartItemId || item.id; 
            const itemSize = item.size || 'undefined';
            subtotal += item.price * item.quantity;

            // --- NEW LOGIC: Conditionally show measurement HTML ---
            let measurementHtml = '';
            if (item.size === 'Custom') {
                // This is a custom item, so show the measurement options
                measurementHtml = `
                <div class="mt-4">
                  <h5 class="text-sm font-medium text-gray-800 mb-2">Measurements</h5>
                  <div class="flex space-x-4">
                    <label class="flex items-center text-sm">
                      <input type="radio" name="measurements-option-${cartItemUniqueId}" value="default" class="mr-2 focus:ring-pink-500 text-pink-600 measurement-radio" checked>
                      Use Default
                    </label>
                    <label class="flex items-center text-sm">
                      <input type="radio" name="measurements-option-${cartItemUniqueId}" value="specific" class="mr-2 focus:ring-pink-500 text-pink-600 measurement-radio">
                      Specify for item
                    </label>
                  </div>
                  
                  <div id="specific-measurements-${cartItemUniqueId}" class="hidden mt-3 p-3 bg-gray-50 rounded-md">
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label for="bust-${cartItemUniqueId}" class="block text-xs font-medium text-gray-600">Bust</label>
                        <input type="number" id="bust-${cartItemUniqueId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-bust">
                      </div>
                      <div>
                        <label for="waist-${cartItemUniqueId}" class="block text-xs font-medium text-gray-600">Waist</label>
                        <input type="number" id="waist-${cartItemUniqueId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-waist">
                      </div>
                      <div>
                        <label for="hips-${cartItemUniqueId}" class="block text-xs font-medium text-gray-600">Hips</label>
                        <input type="number" id="hips-${cartItemUniqueId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-hips">
                      </div>
                      <div>
                        <label for="height-${cartItemUniqueId}" class="block text-xs font-medium text-gray-600">Height</label>
                        <input type="number" id="height-${cartItemUniqueId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-height">
                      </div>
                    </div>
                  </div>
                </div>
                `;
            }
            // --- END NEW LOGIC ---
            
            const itemHtml = `
              <div class="py-4 border-b" data-cart-item-id="${cartItemUniqueId}">
                <div class="flex justify-between items-center">
                  <div class="flex items-center space-x-3">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg">
                    <div>
                      <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
                      <p class="text-sm text-gray-600 font-medium">Size: ${itemSize}</p>
                      <p class="text-xs md:text-sm text-gray-500">Qty: ${item.quantity}</p>
                    </div>
                  </div>
                  <p class="font-medium text-sm md:text-base">R${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                
                ${measurementHtml}

              </div>
            `;
            summaryContainer.innerHTML += itemHtml;
        });

        // --- 2. Render Totals ---
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
        
        // --- 3. Enable/Disable Place Order Button ---
        const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
        if (placeOrderBtn) {
            const user = firebase.auth().currentUser;
            
            if (cart.length === 0) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Place Order';
            } else if (user && !user.isAnonymous && !isMeasurementsLoaded) {
                // Only wait for measurements if it's a logged in user
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Loading Measurements...';
            } else {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place Order';
            }
        }
    };
    // --- =================================== ---
    // --- END UPDATED CHECKOUT SUMMARY RENDERER ---
    // --- =================================== ---


    // --- EVENT HANDLER FOR CHECKOUT MEASUREMENT TOGGLES ---
    const summaryContainer = document.getElementById('checkout-summary');
    if (summaryContainer) {
        summaryContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('measurement-radio')) {
                const selectedValue = e.target.value;
                const itemContainer = e.target.closest('[data-cart-item-id]');
                if (!itemContainer) return;
                
                const cartItemUniqueId = itemContainer.dataset.cartItemId;
                const specificForm = document.getElementById(`specific-measurements-${cartItemUniqueId}`);
                
                if (specificForm) {
                    if (selectedValue === 'specific') {
                        specificForm.classList.remove('hidden');
                    } else {
                        specificForm.classList.add('hidden');
                    }
                }
            }
        });
    }


    // --- =================================== ---
    // --- UPDATED CHECKOUT FORM SUBMISSION ---
    // --- =================================== ---
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = checkoutForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Processing...';
            }

            // --- GUEST CHECKOUT LOGIC ---
            let user = firebase.auth().currentUser;
            
            try {
                if (!user) {
                    console.log("User not logged in. Creating Guest Session...");
                    // Sign in anonymously to satisfy Security Rules
                    const authResult = await firebase.auth().signInAnonymously();
                    user = authResult.user;
                    console.log("Guest signed in:", user.uid);
                }
            } catch (authError) {
                console.error("Guest login failed:", authError);
                alert("Could not initialize guest checkout. Please refresh and try again.");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }
            // --- END GUEST LOGIC ---

            // 1. Get Customer Shipping Info
            const customerInfo = {
                name: document.getElementById('name')?.value,
                email: document.getElementById('email')?.value,
                address: document.getElementById('address')?.value,
                city: document.getElementById('city')?.value,
                postalCode: document.getElementById('postal-code')?.value,
            };
            
            // 2. Get Default Measurements
            const defaultMeasurements = {
                bust: document.getElementById('bust')?.value,
                waist: document.getElementById('waist')?.value,
                hips: document.getElementById('hips')?.value,
                height: document.getElementById('height')?.value,
                fit: document.getElementById('fit')?.value,
            };

            // 3. Get Cart & Process Measurements for each item
            const cart = getCart();
            const processedCart = [];
            const summaryItems = document.querySelectorAll('#checkout-summary [data-cart-item-id]');
            
            let allMeasurementsValid = true;

            for (let i = 0; i < cart.length; i++) {
                const item = cart[i];
                const processedItem = { ...item }; // Copy original item data
                
                // --- NEW LOGIC: Only process measurements for CUSTOM items ---
                if (item.size === 'Custom') {
                    const itemElement = summaryItems[i];
                    const cartItemUniqueId = itemElement.dataset.cartItemId;
                    const measurementOption = itemElement.querySelector(`input[name="measurements-option-${cartItemUniqueId}"]:checked`).value;
                    
                    if (measurementOption === 'default') {
                        // Check if default measurements are filled
                        if (!defaultMeasurements.bust || !defaultMeasurements.waist || !defaultMeasurements.hips) {
                            allMeasurementsValid = false;
                            alert(`Please fill in at least Bust, Waist, and Hips in the 'Your Measurements' section, or specify measurements for ${item.name}.`);
                            break; // Stop processing
                        }
                        processedItem.measurements = {
                            type: 'default',
                            ...defaultMeasurements
                        };
                    } else {
                        // Get specific measurements
                        const specificMeasurements = {
                            bust: itemElement.querySelector(`.specific-bust`)?.value,
                            waist: itemElement.querySelector(`.specific-waist`)?.value,
                            hips: itemElement.querySelector(`.specific-hips`)?.value,
                            height: itemElement.querySelector(`.specific-height`)?.value,
                            fit: 'custom' // Implied
                        };
                        
                        // Check if specific measurements are filled
                        if (!specificMeasurements.bust || !specificMeasurements.waist || !specificMeasurements.hips) {
                            allMeasurementsValid = false;
                            alert(`You selected 'Specify for item' for ${item.name}, but did not fill in all measurements.`);
                            break; // Stop processing
                        }
                        
                        processedItem.measurements = {
                            type: 'specific',
                            ...specificMeasurements
                        };
                    }
                } else {
                    // This is a RETAIL item (S, M, L), no measurements needed
                    processedItem.measurements = null; 
                }
                // --- END NEW LOGIC ---

                processedCart.push(processedItem);
            }

            if (!allMeasurementsValid) {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }

            // 4. Basic Form Validation
            if (!customerInfo.email || !customerInfo.name || !customerInfo.address || !customerInfo.city || !customerInfo.postalCode || cart.length === 0) {
                alert('Please fill out all shipping fields and ensure your cart is not empty.');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }
            
            // 5. Save Final Data to Firestore
            try {
                // Get db instance inside function for safety
                const db = firebase.firestore();
                const orderData = { 
                    userId: user.uid,
                    customer: customerInfo, 
                    cart: processedCart,
                    order_date: new Date(),
                    status: 'Pending' 
                };

                console.log("Saving order directly to Firestore...");
                
                const docRef = await db.collection('orders').add(orderData);

                console.log("Order saved! ID:", docRef.id);

                // Clear cart and Redirect
                localStorage.removeItem('carriesBoutiqueCart');
                updateCartIcon();
                
                // Redirect to confirmation page with the REAL ID
                window.location.href = `confirmation.html?orderId=${docRef.id}`;

            } catch (error) {
                console.error('Failed to save order:', error);
                alert(`Error placing order: ${error.message}`);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
            }
        });
    }
    // --- =================================== ---
    // --- END UPDATED CHECKOUT FORM SUBMISSION ---
    // --- =================================== ---


    // --- FIREBASE AUTHENTICATION LOGIC ---
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        const auth = firebase.auth();
        const db = firebase.firestore();

        // --- Get references to ALL auth buttons ---
        const navGoogleLoginBtn = document.getElementById('google-login-btn');
        const userInfoDiv = document.getElementById('user-info');
        const userDisplayNameSpan = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');
        const mobileGoogleLoginBtn = document.getElementById('google-login-btn-mobile');
        const mobileUserInfoDiv = document.getElementById('user-info-mobile');
        const mobileLogoutBtn = document.getElementById('logout-btn-mobile');
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');
        const checkoutNameInput = document.getElementById('name');
        const checkoutEmailInput = document.getElementById('email');
        
        // --- NEW: Get Admin Links ---
        const adminLink = document.getElementById('admin-link');
        const adminLinkMobile = document.getElementById('admin-link-mobile');


        const handleGoogleLogin = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            console.log("Attempting Google Sign-In...");
            auth.signInWithPopup(provider)
              .then((result) => {
                  console.log("Google Sign-In Successful. User:", result.user?.displayName || result.user?.email);
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
                  localStorage.removeItem('userProfileData');
                  window.location.replace('index.html'); // <-- Redirect to Home
              }).catch((error) => {
                  console.error("Sign Out Error:", error);
                  alert(`Logout failed: ${error.message}`);
              });
        };

        // --- Add listeners to ALL buttons ---
        if (navGoogleLoginBtn) navGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        if (pageGoogleLoginBtn) pageGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

        
        // --- Function to LOAD measurements ---
        const loadMeasurements = async (userId, currentPage) => {
            const userRef = db.collection('users').doc(userId);
            try {
                const doc = await userRef.get();
                if (doc.exists && doc.data().measurements) {
                    const measurements = doc.data().measurements;
                    
                    let bustEl, waistEl, hipsEl, heightEl, fitEl;
                    
                    if (currentPage === 'account.html') {
                        bustEl = document.getElementById('account-bust');
                        waistEl = document.getElementById('account-waist');
                        hipsEl = document.getElementById('account-hips');
                        heightEl = document.getElementById('account-height');
                        fitEl = document.getElementById('account-fit');
                    } else if (currentPage === 'checkout.html') {
                        bustEl = document.getElementById('bust');
                        waistEl = document.getElementById('waist');
                        hipsEl = document.getElementById('hips');
                        heightEl = document.getElementById('height');
                        fitEl = document.getElementById('fit');
                    }

                    // Populate the form if the elements exist
                    if (bustEl) bustEl.value = measurements.bust || '';
                    if (waistEl) waistEl.value = measurements.waist || '';
                    if (hipsEl) hipsEl.value = measurements.hips || '';
                    if (heightEl) heightEl.value = measurements.height || '';
                    if (fitEl) fitEl.value = measurements.fit || 'Comfortable';
                }
            } catch (error) {
                console.error("Error loading measurements: ", error);
            }
        };


        // --- Auth State Observer ---
        auth.onAuthStateChanged(async (user) => { // <-- ADDED ASYNC
            console.log("Auth state changed, user:", user ? (user.displayName || user.email) : null);
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';

            const getFirstName = (user) => {
                if (!user || user.isAnonymous) return 'Guest';
                const fullName = user.displayName;
                const email = user.email;
                if (fullName) return fullName.split(' ')[0]; // Get first name
                if (email) return email.split('@')[0]; // Get email prefix
                return 'User'; // Failsafe
            };

            if (user) {
                // --- User is SIGNED IN (Real or Guest) ---
                
                if (currentPage === 'login.html') {
                    console.log("User just logged in, redirecting from login page to index.");
                    window.location.replace('index.html');
                    return; 
                }

                // Only show "Logged In" UI if NOT anonymous
                if (!user.isAnonymous) {
                    if (navGoogleLoginBtn) navGoogleLoginBtn.classList.add('hidden');
                    if (userInfoDiv) userInfoDiv.classList.remove('hidden');
                    if (userDisplayNameSpan) userDisplayNameSpan.textContent = getFirstName(user);
                    
                    if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.classList.add('hidden');
                    if (mobileUserInfoDiv) mobileUserInfoDiv.classList.remove('hidden');

                    // Admin check
                    try {
                        const adminRef = db.collection('admins').doc(user.uid);
                        const adminDoc = await adminRef.get();
                        if (adminDoc.exists) {
                            if(adminLink) adminLink.classList.remove('hidden'); // Show desktop admin button
                            if(adminLinkMobile) adminLinkMobile.classList.remove('hidden'); // Show mobile admin button
                        }
                    } catch (err) {
                        console.error("Error checking admin status", err);
                    }
                }

                // --- AUTOFIL CHECKOUT (Shipping & Measurements) ---
                if (currentPage === 'checkout.html') {
                    // Only autofill/lock if the user is NOT anonymous (Real Google User)
                    if (!user.isAnonymous) {
                        if (checkoutEmailInput) {
                            checkoutEmailInput.value = user.email || '';
                            checkoutEmailInput.readOnly = true; 
                            checkoutEmailInput.classList.add('bg-gray-100');
                        }
                        if (checkoutNameInput) checkoutNameInput.value = user.displayName || '';
                        
                        // Load saved measurements for real users
                        loadMeasurements(user.uid, currentPage).then(() => {
                            isMeasurementsLoaded = true; 
                            renderCheckoutSummary();
                        });
                    } else {
                        // It's a guest or anonymous user, ensure fields are editable
                        if (checkoutEmailInput) {
                            checkoutEmailInput.readOnly = false;
                            checkoutEmailInput.classList.remove('bg-gray-100');
                        }
                        // Guests don't have saved measurements to load
                        isMeasurementsLoaded = true;
                        renderCheckoutSummary();
                    }
                }
                
                if (currentPage === 'account.html' && !user.isAnonymous) {
                    loadMeasurements(user.uid, currentPage);
                    loadOrderHistory(user.uid); 
                }

            } else {
                // --- User is SIGNED OUT ---
                isMeasurementsLoaded = true; 

                // --- Update NAV UI (Desktop & Mobile) ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.classList.remove('hidden');
                if (userInfoDiv) userInfoDiv.classList.add('hidden');
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';
                
                if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.classList.remove('hidden');
                if (mobileUserInfoDiv) mobileUserInfoDiv.classList.add('hidden');
                
                // --- NEW: Hide admin links on logout ---
                if (adminLink) adminLink.classList.add('hidden');
                if (adminLinkMobile) adminLinkMobile.classList.add('hidden');
                
                if (currentPage === 'checkout.html') {
                    if (checkoutEmailInput) {
                        checkoutEmailInput.value = '';
                        checkoutEmailInput.readOnly = false;
                        checkoutEmailInput.classList.remove('bg-gray-100');
                    }
                    if (checkoutNameInput) checkoutNameInput.value = '';
                    renderCheckoutSummary();
                }
            }
            if (typeof feather !== 'undefined') setTimeout(feather.replace, 0);
        });
        
        // --- ACCOUNT PAGE LOGIC (SAVE FUNCTION) ---
        const accountForm = document.getElementById('account-form');
        
        const saveMeasurements = async (e) => {
            e.preventDefault();
            const user = auth.currentUser;

            const button = e.target.querySelector('button[type="submit"]');
            if (button) {
                button.disabled = true;
                button.textContent = 'Saving...';
            }

            if (!user || user.isAnonymous) {
                alert("You must be logged in with Google to save measurements.");
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Save Changes';
                }
                return;
            }

            const measurements = {
                bust: document.getElementById('account-bust')?.value || null,
                waist: document.getElementById('account-waist')?.value || null,
                hips: document.getElementById('account-hips')?.value || null,
                height: document.getElementById('account-height')?.value || null,
                fit: document.getElementById('account-fit')?.value || null,
            };

            const userRef = db.collection('users').doc(user.uid);
            
            try {
                // 'merge: true' ensures we don't overwrite other user data
                await userRef.set({ measurements: measurements }, { merge: true }); 
                
                const successMsg = document.getElementById('success-message');
                if (successMsg) {
                    successMsg.classList.remove('hidden');
                    setTimeout(() => successMsg.classList.add('hidden'), 3000); // Hide after 3s
                }
                
            } catch (error) {
                console.error("Error saving measurements: ", error);
                alert(`Error saving: ${error.message}`);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Save Changes';
                }
            }
        };


        // Add listener to the account form if it exists
        if (accountForm) {
            accountForm.addEventListener('submit', saveMeasurements);
        }
        // --- END ACCOUNT PAGE LOGIC ---

    } else {
        console.error("Firebase library not loaded or initialized correctly!");
    }
    // --- END FIREBASE AUTH LOGIC ---


    // --- =================================== ---
    // --- DYNAMIC PRODUCT GRID LOADER (NEW) ---
    // --- =================================== ---

    async function loadProductGrid(collectionName, gridElementId) {
        const gridEl = document.getElementById(gridElementId);
        if (!gridEl) return; // Not on the right page

        const db = firebase.firestore();
        let html = '';

        try {
            const snapshot = await db.collection(collectionName).get();
            if (snapshot.empty) {
                gridEl.innerHTML = '<p class="text-gray-500 col-span-full text-center">No products found in this collection.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const product = doc.data();
                const productUrl = `product.html?collection=${collectionName}&id=${doc.id}`;
                
                // --- Conditional Button ---
                let buttonHtml = '';
                if (collectionName === 'products') {
                    // Predefined: Add to Cart (default 'M')
                    // We must escape quotes inside the onclick string
                    buttonHtml = `<button onclick="addToCart('${doc.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}', 'M')" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">Add to Cart</button>`;
                } else {
                    // Custom: Learn More
                    buttonHtml = `<a href="${productUrl}" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">Learn More</a>`;
                }
                // --- End Conditional Button ---

                html += `
                <div class="product-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300">
                  <a href="${productUrl}" class="relative block">
                    <img class="w-full h-80 object-cover" src="${product.image_url}" alt="${product.name}">
                  </a>
                  <div class="p-4">
                    <h3 class="text-lg font-medium text-gray-900"><a href="${productUrl}" class="hover:underline">${product.name}</a></h3>
                    <p class="mt-1 text-sm text-gray-500">${product.category || product.collection_name || 'New Collection'}</p>
                    <div class="mt-4 flex justify-between items-center">
                      <span class="text-lg font-bold text-gray-900">R${product.price.toFixed(2)}</span>
                      ${buttonHtml}
                    </div>
                  </div>
                </div>
                `;
            });

            gridEl.innerHTML = html;
            if (typeof feather !== 'undefined') feather.replace(); // Redraw icons if any
        } catch (err) {
            console.error("Error loading products:", err);
            gridEl.innerHTML = '<p class="text-red-500 col-span-full text-center">Error loading products. Please try again later.</p>';
        }
    }

    // --- Triggers for new pages ---
    if (document.body.id === 'shop-page') {
        loadProductGrid('products', 'product-grid');
    }
    if (document.body.id === 'collections-page') {
        loadProductGrid('custom_styles', 'product-grid');
    }


    // --- ================================ ---
    // --- DYNAMIC PRODUCT PAGE LOADER ---
    // --- ================================ ---

    // This function will run ONLY if we are on the product.html page
    async function loadProductPage() {
        // 1. Get the collection and ID from the URL
        const params = new URLSearchParams(window.location.search);
        const collectionName = params.get('collection');
        const docId = params.get('id');

        // 2. Get all the template elements from product.html
        const productNameEl = document.getElementById('product-name');
        const productPriceEl = document.getElementById('product-price');
        const productImageEl = document.getElementById('product-image');
        const productDescriptionEl = document.getElementById('product-description-details');
        const productBreadcrumbEl = document.getElementById('product-breadcrumb');
        const sizeSelectorContainer = document.getElementById('size-selector-container');
        const addToCartBtn = document.getElementById('product-add-to-cart-btn');

        // 3. Check for errors
        if (!collectionName || !docId || !productNameEl) {
            // If any required element isn't here, we're not on the product page.
            return;
        }

        // 4. Fetch the correct document from Firestore
        try {
            const db = firebase.firestore();
            const doc = await db.collection(collectionName).doc(docId).get();

            if (!doc.exists) {
                productNameEl.textContent = 'Product not found.';
                return;
            }
            
            const product = doc.data();
            
            // 5. Populate the template with the product data
            productNameEl.textContent = product.name;
            productPriceEl.textContent = `R${product.price.toFixed(2)}`;
            productImageEl.src = product.image_url;
            productImageEl.alt = product.name;
            productBreadcrumbEl.textContent = product.name;
            document.title = `${product.name} | Carries Boutique`; // Update page title
            
            // Add description (if it exists)
            if (product.description) {
                productDescriptionEl.innerHTML = `<h3 class="text-lg font-medium text-gray-900">Description</h3><p>${product.description}</p>`;
            }

            let selectedSize = null;

            // 6. --- THIS IS THE KEY LOGIC ---
            if (collectionName === 'products') {
                // This is a RETAIL product
                sizeSelectorContainer.style.display = 'block'; // Show the size selector
                
                // Dynamically create size buttons from product.variants
                const sizeButtonsContainer = sizeSelectorContainer.querySelector('#size-buttons');
                sizeButtonsContainer.innerHTML = ''; // Clear hard-coded buttons
                
                if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                        const button = document.createElement('button');
                        
                        // Check stock level
                        const isOutOfStock = !variant.stock || variant.stock <= 0;

                        if (isOutOfStock) {
                            // --- STYLE FOR OUT OF STOCK ---
                            button.className = 'size-btn w-10 h-10 border border-gray-200 rounded-md flex items-center justify-center text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed decoration-line-through';
                            button.textContent = variant.size;
                            button.disabled = true; // Disable clicks
                            button.title = "Out of Stock"; // Tooltip
                        } else {
                            // --- STYLE FOR IN STOCK ---
                            button.className = 'size-btn w-10 h-10 border rounded-md flex items-center justify-center text-sm font-medium hover:bg-gray-100 cursor-pointer transition-colors';
                            button.textContent = variant.size;
                            
                            // Only add click listener if in stock
                            button.onclick = () => {
                                selectedSize = variant.size;
                                // Reset all buttons
                                sizeButtonsContainer.querySelectorAll('.size-btn').forEach(btn => {
                                    // Don't remove the 'disabled' look from out-of-stock items
                                    if (!btn.disabled) {
                                         btn.classList.remove('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                                    }
                                });
                                // Highlight this button
                                button.classList.add('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                            };
                        }
                        
                        sizeButtonsContainer.appendChild(button);
                    });
                } 
                else 
                {
                    sizeButtonsContainer.innerHTML = '<p class="text-sm text-gray-500">Sizes not available.</p>';
                }

                // Wire up Add to Cart button for RETAIL
                addToCartBtn.onclick = () => {
                    if (!selectedSize) {
                        alert('Please select a size first!');
                        return;
                    }
                    window.addToCart(docId, product.name, product.price, product.image_url, selectedSize);
                };
                
            } else if (collectionName === 'custom_styles') {
                // This is a CUSTOM product
                sizeSelectorContainer.style.display = 'none'; // Hide the size selector
                selectedSize = 'Custom'; // Set a default "size" for our cart system

                // Wire up Add to Cart button for CUSTOM
                addToCartBtn.onclick = () => {
                    // For custom items, we add to cart, but the checkout process
                    // will handle the measurements.
                    window.addToCart(docId, product.name, product.price, product.image_url, selectedSize);
                };
            }
            
            // NEW: Load Related Products
            loadRelatedProducts(collectionName, docId, product.category);

        } catch (error) {
            console.error("Error loading product:", error);
            productNameEl.textContent = 'Error loading product.';
        }
    }

    // --- LOAD HOMEPAGE CAROUSEL (Retail + Custom) ---
    async function loadHomepageCarousel() {
        const container = document.getElementById('featured-carousel');
        if (!container) return;

        const db = firebase.firestore();
        
        try {
            // 1. Fetch from BOTH collections in parallel
            const [productsSnap, stylesSnap] = await Promise.all([
                db.collection('products').limit(5).get(),
                db.collection('custom_styles').limit(5).get()
            ]);

            // 2. Combine the data
            let allItems = [];
            
            productsSnap.forEach(doc => {
                allItems.push({ id: doc.id, collection: 'products', ...doc.data() });
            });
            
            stylesSnap.forEach(doc => {
                allItems.push({ id: doc.id, collection: 'custom_styles', ...doc.data() });
            });

            // 3. Handle "No Items" case
            if (allItems.length === 0) {
                container.innerHTML = '<div class="w-full text-center p-10 text-gray-400">Check back soon for new arrivals!</div>';
                return;
            }

            container.innerHTML = ''; // Clear skeleton loader

            // 5. Render
            allItems.forEach(product => {
                const productUrl = `product.html?collection=${product.collection}&id=${product.id}`;
                const safeName = product.name.replace(/'/g, "\\'");
                
                // Determine button action based on type
                let actionButton = '';
                if (product.collection === 'products') {
                    // Retail: Add to Cart
                    actionButton = `
                    <button onclick="addToCart('${product.id}', '${safeName}', ${product.price}, '${product.image_url}', 'M')" 
                            class="p-2 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200 transition shadow-sm" title="Add to Cart">
                        <i data-feather="shopping-bag" class="w-4 h-4"></i>
                    </button>`;
                } else {
                    // Custom: View Details
                    actionButton = `
                    <a href="${productUrl}" class="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition shadow-sm" title="View Details">
                        <i data-feather="eye" class="w-4 h-4"></i>
                    </a>`;
                }

                const html = `
                <div class.="min-w-72 w-72 snap-center bg-white rounded-xl shadow-md overflow-hidden flex-shrink-0 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
                    <a href="${productUrl}" class="block h-64 overflow-hidden relative group">
                        <img src="${product.image_url}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                    </a>
                    <div class="p-4">
                        <h3 class="font-bold text-gray-900 truncate text-lg"><a href="${productUrl}">${product.name}</a></h3>
                        <p class="text-sm text-gray-500 mb-3">${product.category || (product.collection === 'products' ? 'Retail' : 'Custom Style')}</p>
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-gray-900 text-lg">R${product.price.toFixed(2)}</span>
                            ${actionButton}
                        </div>
                    </div>
                </div>
                `;
                container.innerHTML += html;
            });

            // Re-init icons
            if (typeof feather !== 'undefined') feather.replace();

        } catch (e) {
            console.error("Carousel error:", e);
            container.innerHTML = '<p class="text-red-400 w-full text-center">Could not load products.</p>';
        }
    }

    // --- TRIGGERS ---
    if (document.body.id === 'product-detail-page') {
        loadProductPage();
    }
    if (document.body.id === 'home-page') {
        loadHomepageCarousel();
    }

    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();
    renderCartPage();
    renderCheckoutSummary();

    if (typeof feather !== 'undefined') feather.replace();

}); // --- END DOMContentLoaded ---
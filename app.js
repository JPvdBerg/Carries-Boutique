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

        if (typeof feather !== 'undefined') feather.replace();
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
        renderCartPage(); // Rerender cart page
        renderCheckoutSummary(); // Also rerender checkout summary if on that page
    };

    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; // Not on checkout page

        const cart = getCart();
        summaryContainer.innerHTML = ''; // Clear previous content
        let subtotal = 0;

        if (cart.length === 0) {
            summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
            const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }

        // --- 1. Render Each Cart Item ---
        cart.forEach((item, index) => {
            // We use the index as a unique ID for this item in the cart
            const cartItemUniqueId = `${item.id}-${index}`; 
            subtotal += item.price * item.quantity;
            
            const itemHtml = `
              <div class="py-4 border-b" data-cart-item-id="${cartItemUniqueId}">
                <div class="flex justify-between items-center">
                  <div class="flex items-center space-x-3">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg">
                    <div>
                      <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
                      <p class="text-xs md:text-sm text-gray-500">Qty: ${item.quantity}</p>
                    </div>
                  </div>
                  <p class="font-medium text-sm md:text-base">R${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                
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
        
        // --- 3. Enable Place Order Button ---
        const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
        if (placeOrderBtn) placeOrderBtn.disabled = false;
    };

    // --- NEW EVENT HANDLER FOR CHECKOUT MEASUREMENT TOGGLES ---
    const summaryContainer = document.getElementById('checkout-summary');
    if (summaryContainer) {
        summaryContainer.addEventListener('change', (e) => {
            // Check if the changed element is one of our radio buttons
            if (e.target.classList.contains('measurement-radio')) {
                const selectedValue = e.target.value;
                // Find the parent item container
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


    // --- CHECKOUT FORM SUBMISSION ---
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

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

            // Loop through both the cart data and the DOM elements in the summary
            for (let i = 0; i < cart.length; i++) {
                const item = cart[i];
                const itemElement = summaryItems[i];
                const cartItemUniqueId = itemElement.dataset.cartItemId;

                const measurementOption = itemElement.querySelector(`input[name="measurements-option-${cartItemUniqueId}"]:checked`).value;
                
                const processedItem = { ...item }; // Copy original item data (name, price, etc.)
                
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
                processedCart.push(processedItem);
            }

            // Stop submission if validation failed
            if (!allMeasurementsValid) {
                return;
            }

            // 4. Basic Form Validation
            if (!customerInfo.email || !customerInfo.name || !customerInfo.address || !customerInfo.city || !customerInfo.postalCode || cart.length === 0) {
                alert('Please fill out all shipping fields and ensure your cart is not empty.');
                return;
            }

            const submitButton = checkoutForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Placing Order...';
            }

            // 5. Send Final Data to Backend
            try {
                // This is the final data object
                const orderData = { 
                    customer: customerInfo, 
                    cart: processedCart // Send the cart with measurements
                };

                console.log("Sending FINAL order data to server:", JSON.stringify(orderData, null, 2));
                
                const response = await fetch('https://carries-boutique-server.onrender.com/api/send-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData),
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
        const db = firebase.firestore(); // <-- Get reference to Firestore

        // --- Get references to ALL auth buttons ---
        // Desktop Nav
        const navGoogleLoginBtn = document.getElementById('google-login-btn');
        const userInfoDiv = document.getElementById('user-info');
        const userDisplayNameSpan = document.getElementById('user-display-name');
        const logoutBtn = document.getElementById('logout-btn');

        // Mobile Nav
        const mobileGoogleLoginBtn = document.getElementById('google-login-btn-mobile');
        const mobileUserInfoDiv = document.getElementById('user-info-mobile');
        const mobileLogoutBtn = document.getElementById('logout-btn-mobile');

        // Login Page
        const pageGoogleLoginBtn = document.getElementById('google-login-btn-page');

        // Checkout Inputs
        const checkoutNameInput = document.getElementById('name');
        const checkoutEmailInput = document.getElementById('email');


        const handleGoogleLogin = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            console.log("Attempting Google Sign-In...");
            auth.signInWithPopup(provider)
              .then((result) => {
                  console.log("Google Sign-In Successful. User:", result.user?.displayName || result.user?.email);
                  // onAuthStateChanged handles the rest
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
                  window.location.replace('login.html');
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

        // --- Auth State Observer ---
        auth.onAuthStateChanged((user) => {
            console.log("Auth state changed, user:", user ? (user.displayName || user.email) : null);
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';

            if (user) {
                // --- User is SIGNED IN ---
                
                if (currentPage === 'login.html') {
                    console.log("User just logged in, redirecting from login page to index.");
                    window.location.replace('index.html');
                    return; 
                }

                // --- Update NAV UI (Desktop & Mobile) ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'none';
                if (userInfoDiv) userInfoDiv.style.display = 'flex';
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = user.displayName || user.email;
                
                if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.style.display = 'none';
                if (mobileUserInfoDiv) mobileUserInfoDiv.style.display = 'block';

                // --- AUTOFIL CHECKOUT ---
                if (currentPage === 'checkout.html' && checkoutEmailInput && checkoutNameInput) {
                    checkoutEmailInput.value = user.email || '';
                    checkoutNameInput.value = user.displayName || '';
                    checkoutEmailInput.readOnly = true; 
                    checkoutEmailInput.classList.add('bg-gray-100');
                }
                
                // --- NEW: If on Account Page, load data ---
                if (currentPage === 'account.html') {
                    loadMeasurements(user.uid);
                }

            } else {
                // --- User is SIGNED OUT ---

                // --- Update NAV UI (Desktop & Mobile) ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'inline-flex';
                if (userInfoDiv) userInfoDiv.style.display = 'none';
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';
                
                if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.style.display = 'flex';
                if (mobileUserInfoDiv) mobileUserInfoDiv.style.display = 'none';
                
                if (currentPage === 'checkout.html' && checkoutEmailInput && checkoutNameInput) {
                    checkoutEmailInput.value = '';
                    checkoutEmailInput.readOnly = false;
                    checkoutEmailInput.classList.remove('bg-gray-100');
                    checkoutNameInput.value = '';
                }
            }
            if (typeof feather !== 'undefined') setTimeout(feather.replace, 0);
        });
        
        // --- NEW: ACCOUNT PAGE LOGIC ---
        const accountForm = document.getElementById('account-form');
        
        // Function to SAVE measurements
        const saveMeasurements = async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return alert("You must be logged in to save.");

            const measurements = {
                bust: document.getElementById('account-bust')?.value || null,
                waist: document.getElementById('account-waist')?.value || null,
                hips: document.getElementById('account-hips')?.value || null,
                height: document.getElementById('account-height')?.value || null,
                fit: document.getElementById('account-fit')?.value || null,
            };

            const userRef = db.collection('users').doc(user.uid);
            
            try {
                // We use .set() with { merge: true }
                // This creates the document if it doesn't exist
                // or updates it if it does (without overwriting other fields)
                await userRef.set({ measurements: measurements }, { merge: true });
                
                // Show success message
                const successMsg = document.getElementById('success-message');
                if (successMsg) {
                    successMsg.classList.remove('hidden');
                    setTimeout(() => successMsg.classList.add('hidden'), 3000); // Hide after 3s
                }
                
            } catch (error) {
                console.error("Error saving measurements: ", error);
                alert(`Error saving: ${error.message}`);
            }
        };

        // Function to LOAD measurements
        const loadMeasurements = async (userId) => {
            const userRef = db.collection('users').doc(userId);
            try {
                const doc = await userRef.get();
                if (doc.exists && doc.data().measurements) {
                    const measurements = doc.data().measurements;
                    
                    // Populate the form
                    document.getElementById('account-bust').value = measurements.bust || '';
                    document.getElementById('account-waist').value = measurements.waist || '';
                    document.getElementById('account-hips').value = measurements.hips || '';
                    document.getElementById('account-height').value = measurements.height || '';
                    document.getElementById('account-fit').value = measurements.fit || 'Comfortable';
                }
            } catch (error) {
                console.error("Error loading measurements: ", error);
            }
        };

        // Add listener to the account form if it exists
        if (accountForm) {
            accountForm.addEventListener('submit', saveMeasurements);
        }
        // --- END ACCOUNT PAGE LOGIC ---

    } else {
        console.error("Firebase library not loaded or initialized correctly!");
        // ... (error handling for missing firebase) ...
    }
    // --- END FIREBASE AUTH LOGIC ---


    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();
    renderCartPage();
    renderCheckoutSummary();

    if (typeof feather !== 'undefined') feather.replace();

}); // --- END DOMContentLoaded ---
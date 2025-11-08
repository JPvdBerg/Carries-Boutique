// --- IMMEDIATE AUTH REDIRECT LOGIC ---
// This runs before the DOM is fully loaded to redirect quickly.
(function() {
    let initialAuthCheckDone = false;
    const checkAuthStatus = () => {
        // Retry mechanism in case Firebase scripts haven't loaded yet
        if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || typeof firebase.firestore !== 'function') {
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

                if (!user && !allowedLoggedOutPages.includes(currentPage)) {
                    console.log("Redirecting to login.html as user is not logged in.");
                    window.location.replace('login.html'); // Use replace to avoid back button issues
                } else if (user && currentPage === 'login.html') {
                    console.log("Already logged in, redirecting from login page to index.");
                    window.location.replace('index.html');
                }
            }
        });
    };
    checkAuthStatus();
})();
// --- END IMMEDIATE AUTH REDIRECT LOGIC ---


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
            const target = document.querySelector('#view-toggle-btn-section'); // Updated to point to new section
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- NEW VIEW TOGGLE LOGIC (for index.html) ---
    const toggleBtn = document.getElementById('view-toggle-btn');
    const customView = document.getElementById('custom-view');
    const predefinedView = document.getElementById('predefined-view');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    if (toggleBtn && customView && predefinedView && viewTitle && viewSubtitle) {
        
        let isCustomView = true; // Default view is custom

        toggleBtn.addEventListener('click', () => {
            isCustomView = !isCustomView; // Flip the state

            if (isCustomView) {
                // Show Custom View
                customView.style.display = 'block';
                predefinedView.style.display = 'none';
                
                // Update text
                viewTitle.textContent = 'Our Custom Styles';
                viewSubtitle.textContent = 'Handcrafted pieces tailored to your exact measurements.';
                toggleBtn.textContent = 'Shop Predefined Retail';
            } else {
                // Show Predefined View
                customView.style.display = 'none';
                predefinedView.style.display = 'block';

                // Update text
                viewTitle.textContent = 'Our Retail Collections';
                viewSubtitle.textContent = 'Curated, predefined items in standard sizes (S, M, L).';
                toggleBtn.textContent = 'Shop Custom Tailoring';
            }
        });
    }
    // --- END NEW VIEW TOGGLE LOGIC ---


    // --- ================================== ---
    // --- NEW SHOPPING CART LOGIC (With Sizes) ---
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
            alert('Error: No size specified for this item.');
            return;
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
                size: size,             // e.g., 'M'
                quantity: 1
            });
        }
        saveCart(cart);
        alert(`${productName} (Size: ${size}) has been added to your cart!`);
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
                    <p class="text-sm text-gray-600 font-medium">Size: ${item.size}</p>
                    <p class="text-sm text-gray-500">R${item.price.toFixed(2)}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-1 md:space-x-3">
                  <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.cartItemId}', ${item.quantity - 1})">
                    <i data-feather="minus" class="w-4 h-4"></i>
                  </button>
                  <span class="w-8 text-center text-sm md:text-base">${item.quantity}</span>
                  <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.cartItemId}', ${item.quantity + 1})">
                    <i data-feather="plus" class="w-4 h-4"></i>
                  </button>
                </div>
                <p class="text-base md:text-lg font-semibold text-gray-900">R${(item.price * item.quantity).toFixed(2)}</p>
                <button class="text-red-500 hover:text-red-700" onclick="removeFromCart('${item.cartItemId}')">
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

    // Updated to use the new cartItemId
    window.updateCartQuantity = (cartItemId, quantity) => {
        let cart = getCart();
        if (quantity <= 0) {
            cart = cart.filter(item => item.cartItemId !== cartItemId);
        } else {
            const item = cart.find(item => item.cartItemId === cartItemId);
            if (item) item.quantity = quantity;
        }
        saveCart(cart);
        renderCartPage();
    };

    // Updated to use the new cartItemId
    window.removeFromCart = (cartItemId) => {
        let cart = getCart();
        cart = cart.filter(item => item.cartItemId !== cartItemId);
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
            if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Place Order';
            }
            return;
        }

        // --- 1. Render Each Cart Item ---
        cart.forEach((item, index) => {
            const cartItemUniqueId = item.cartItemId; // Use our new unique ID
            subtotal += item.price * item.quantity;
            
            const itemHtml = `
              <div class="py-4 border-b" data-cart-item-id="${cartItemUniqueId}">
                <div class="flex justify-between items-center">
                  <div class="flex items-center space-x-3">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg">
                    <div>
                      <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
                      <p class="text-sm text-gray-600 font-medium">Size: ${item.size}</p>
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
        
        // --- 3. Enable/Disable Place Order Button ---
        const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
        if (placeOrderBtn) {
            const user = firebase.auth().currentUser;
            
            if (cart.length === 0) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Place Order';
            } else if (user && !isMeasurementsLoaded) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Loading Measurements...';
            } else {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place Order';
            }
        }
    };
    // --- END NEW CART LOGIC ---
    // --- ================== ---


    // --- ================================ ---
    // --- NEW PRODUCT PAGE SIZE SELECTOR ---
    // --- ================================ ---
    
    // Check if we are on the product.html page
    const productSizeSelector = document.getElementById('product-size-selector');
    if (productSizeSelector) {
        let selectedSize = null; // Variable to store the selected size
        const sizeButtons = productSizeSelector.querySelectorAll('.size-btn');
        const addToCartBtn = document.getElementById('product-add-to-cart-btn');

        // 1. Add click listener to all size buttons
        sizeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Get the size from the button's text
                selectedSize = button.textContent.trim();
                
                // Update button styles
                sizeButtons.forEach(btn => {
                    btn.classList.remove('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                    btn.classList.add('hover:bg-gray-100');
                });
                
                button.classList.add('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                button.classList.remove('hover:bg-gray-100');
            });
        });

        // 2. Add click listener to the "Add to Cart" button
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                if (!selectedSize) {
                    alert('Please select a size first!');
                    return; // Stop the function
                }
                
                // If a size is selected, call the global addToCart function
                // These values are hard-coded for the demo product.html page
                addToCart(
                    'prod_001', 
                    'Floral Maxi Dress', 
                    599.00, 
                    'http://static.photos/fashion/640x360/5',
                    selectedSize
                );
            });
        }
    }
    // --- ================================ ---
    // --- END PRODUCT PAGE SIZE SELECTOR ---
    // --- ================================ ---



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


    // --- CHECKOUT FORM SUBMISSION ---
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Error: You are not logged in. Redirecting to login page.');
                window.location.replace('login.html');
                return;
            }

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
                const orderData = { 
                    userId: user.uid,
                    customer: customerInfo, 
                    cart: processedCart 
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

                // --- AUTOFIL CHECKOUT (Shipping & Measurements) ---
                if (currentPage === 'checkout.html') {
                    if (checkoutEmailInput) checkoutEmailInput.value = user.email || '';
                    if (checkoutNameInput) checkoutNameInput.value = user.displayName || '';
                    if (checkoutEmailInput) {
                        checkoutEmailInput.readOnly = true; 
                        checkoutEmailInput.classList.add('bg-gray-100');
                    }
                    
                    isMeasurementsLoaded = false;
                    renderCheckoutSummary(); 
                    
                    loadMeasurements(user.uid, currentPage).then(() => {
                        isMeasurementsLoaded = true; 
                        renderCheckoutSummary();
                    });
                }
                
                if (currentPage === 'account.html') {
                    loadMeasurements(user.uid, currentPage);
                }

            } else {
                // --- User is SIGNED OUT ---
                isMeasurementsLoaded = true; 

                // --- Update NAV UI (Desktop & Mobile) ---
                if (navGoogleLoginBtn) navGoogleLoginBtn.style.display = 'inline-flex';
                if (userInfoDiv) userInfoDiv.style.display = 'none';
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';
                
                if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.style.display = 'flex';
                if (mobileUserInfoDiv) mobileUserInfoDiv.style.display = 'none';
                
                if (currentPage === 'checkout.html') {
                    if (checkoutEmailInput && checkoutNameInput) {
                        checkoutEmailInput.value = '';
                        checkoutEmailInput.readOnly = false;
                        checkoutEmailInput.classList.remove('bg-gray-100');
                        checkoutNameInput.value = '';
                    }
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

            if (!user) {
                alert("You must be logged in to save.");
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


    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();
    renderCartPage();
    renderCheckoutSummary();

    if (typeof feather !== 'undefined') feather.replace();

}); // --- END DOMContentLoaded ---
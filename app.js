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

    const createCartItemId = (productId, size) => {
        if (!size) {
            console.error("Size is undefined, defaulting to 'default'");
            size = 'default'; 
        }
        return `${productId}_${size}`;
    };

    window.addToCart = (productId, productName, price, image, size) => {
        if (!size) {
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
                cartItemId: cartItemId,
                id: productId,          
                name: productName,
                price: price,
                image: image,
                size: size,             
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
            
            const uniqueItemId = item.cartItemId || item.id; 
            const itemSize = item.size || 'undefined'; 

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

    window.updateCartQuantity = (itemId, quantity) => {
        let cart = getCart();
        if (quantity <= 0) {
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

    window.removeFromCart = (itemId) => {
        let cart = getCart();
        cart = cart.filter(item => (item.cartItemId !== itemId && item.id !== itemId));
        saveCart(cart);
        renderCartPage(); 
        renderCheckoutSummary(); 
    };

    // --- =================================== ---
    // --- CHECKOUT SUMMARY RENDERER ---
    // --- =================================== ---
    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; 

        const cart = getCart();
        summaryContainer.innerHTML = ''; 
        let subtotal = 0;

        const hasCustomItem = cart.some(item => item.size === 'Custom');
        const defaultMeasurementsSection = document.getElementById('default-measurements-section');
        
        if (defaultMeasurementsSection) {
            if (hasCustomItem) {
                defaultMeasurementsSection.style.display = 'block'; 
            } else {
                defaultMeasurementsSection.style.display = 'none'; 
            }
        }

        if (cart.length === 0) {
            summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
            const placeOrderBtn = document.querySelector('#checkout-form button[type="submit"]');
            if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = 'Place Order';
            }
            return;
        }

        cart.forEach((item, index) => {
            const cartItemUniqueId = item.cartItemId || item.id; 
            const itemSize = item.size || 'undefined';
            subtotal += item.price * item.quantity;

            let measurementHtml = '';
            if (item.size === 'Custom') {
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
        
        // Enable/Disable Place Order Button
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
                const processedItem = { ...item }; 
                
                if (item.size === 'Custom') {
                    const itemElement = summaryItems[i];
                    const cartItemUniqueId = itemElement.dataset.cartItemId;
                    const measurementOption = itemElement.querySelector(`input[name="measurements-option-${cartItemUniqueId}"]:checked`).value;
                    
                    if (measurementOption === 'default') {
                        if (!defaultMeasurements.bust || !defaultMeasurements.waist || !defaultMeasurements.hips) {
                            allMeasurementsValid = false;
                            alert(`Please fill in at least Bust, Waist, and Hips in the 'Your Measurements' section, or specify measurements for ${item.name}.`);
                            break; 
                        }
                        processedItem.measurements = {
                            type: 'default',
                            ...defaultMeasurements
                        };
                    } else {
                        const specificMeasurements = {
                            bust: itemElement.querySelector(`.specific-bust`)?.value,
                            waist: itemElement.querySelector(`.specific-waist`)?.value,
                            hips: itemElement.querySelector(`.specific-hips`)?.value,
                            height: itemElement.querySelector(`.specific-height`)?.value,
                            fit: 'custom' 
                        };
                        
                        if (!specificMeasurements.bust || !specificMeasurements.waist || !specificMeasurements.hips) {
                            allMeasurementsValid = false;
                            alert(`You selected 'Specify for item' for ${item.name}, but did not fill in all measurements.`);
                            break; 
                        }
                        
                        processedItem.measurements = {
                            type: 'specific',
                            ...specificMeasurements
                        };
                    }
                } else {
                    processedItem.measurements = null; 
                }
                processedCart.push(processedItem);
            }

            if (!allMeasurementsValid) {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }

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

                localStorage.removeItem('carriesBoutiqueCart');
                updateCartIcon();
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

    // --- FIREBASE AUTHENTICATION LOGIC ---
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        const auth = firebase.auth();
        const db = firebase.firestore();

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
        const adminLink = document.getElementById('admin-link');
        const adminLinkMobile = document.getElementById('admin-link-mobile');

        const handleGoogleLogin = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).then((result) => {
                  console.log("Google Sign-In Successful.");
            }).catch((error) => {
                  console.error("Google Sign-In Error:", error);
                  alert(`Login failed: ${error.code} - ${error.message}`);
            });
        };

        const handleLogout = () => {
            auth.signOut().then(() => {
                  localStorage.removeItem('userProfileData');
                  window.location.replace('index.html'); // <--- Redirect to Home
            }).catch((error) => {
                  alert(`Logout failed: ${error.message}`);
            });
        };

        if (navGoogleLoginBtn) navGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        if (pageGoogleLoginBtn) pageGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.addEventListener('click', handleGoogleLogin);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

        const loadMeasurements = async (userId, currentPage) => {
            const userRef = db.collection('users').doc(userId);
            try {
                const doc = await userRef.get();
                if (doc.exists && doc.data().measurements) {
                    const measurements = doc.data().measurements;
                    let bustEl, waistEl, hipsEl, heightEl, fitEl;
                    
                    // --- AUTOFILL CHECKOUT (Shipping & Measurements) ---
                if (currentPage === 'checkout.html') {
                    // Only autofill/lock if the user is NOT anonymous (Real Google User)
                    if (!user.isAnonymous) {
                        if (checkoutEmailInput) {
                            checkoutEmailInput.value = user.email || '';
                            checkoutEmailInput.readOnly = true; 
                            checkoutEmailInput.classList.add('bg-gray-100');
                        }
                        if (checkoutNameInput) checkoutNameInput.value = user.displayName || '';
                    } else {
                        // It's a guest or anonymous user, ensure fields are editable
                        if (checkoutEmailInput) {
                            checkoutEmailInput.readOnly = false;
                            checkoutEmailInput.classList.remove('bg-gray-100');
                        }
                    }
                    
                    // Continue with measurement loading...
                    isMeasurementsLoaded = false;
                    renderCheckoutSummary(); 
                    
                    loadMeasurements(user.uid, currentPage).then(() => {
                        isMeasurementsLoaded = true; 
                        renderCheckoutSummary();
                    });
                }

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
        auth.onAuthStateChanged(async (user) => { 
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';

            const getFirstName = (user) => {
                if (!user || user.isAnonymous) return 'Guest';
                const fullName = user.displayName;
                const email = user.email;
                if (fullName) return fullName.split(' ')[0]; 
                if (email) return email.split('@')[0]; 
                return 'User'; 
            };

            if (user) {
                // --- User is SIGNED IN (Real or Guest) ---
                
                if (currentPage === 'login.html') {
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
                            if(adminLink) adminLink.classList.remove('hidden'); 
                            if(adminLinkMobile) adminLinkMobile.classList.remove('hidden'); 
                        }
                    } catch (err) {
                        console.error("Error checking admin status", err);
                    }
                }

                // --- AUTOFILL CHECKOUT (Shipping & Measurements) ---
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

                if (navGoogleLoginBtn) navGoogleLoginBtn.classList.remove('hidden');
                if (userInfoDiv) userInfoDiv.classList.add('hidden');
                if (userDisplayNameSpan) userDisplayNameSpan.textContent = '';
                
                if (mobileGoogleLoginBtn) mobileGoogleLoginBtn.classList.remove('hidden');
                if (mobileUserInfoDiv) mobileUserInfoDiv.classList.add('hidden');
                
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
                await userRef.set({ measurements: measurements }, { merge: true }); 
                const successMsg = document.getElementById('success-message');
                if (successMsg) {
                    successMsg.classList.remove('hidden');
                    setTimeout(() => successMsg.classList.add('hidden'), 3000); 
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

        if (accountForm) {
            accountForm.addEventListener('submit', saveMeasurements);
        }
    } else {
        console.error("Firebase library not loaded or initialized correctly!");
    }

    // --- DYNAMIC PRODUCT GRID LOADER ---
    async function loadProductGrid(collectionName, gridElementId) {
        const gridEl = document.getElementById(gridElementId);
        if (!gridEl) return; 

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
                let buttonHtml = '';
                if (collectionName === 'products') {
                    const safeName = product.name.replace(/'/g, "\\'");
                    buttonHtml = `<button onclick="addToCart('${doc.id}', '${safeName}', ${product.price}, '${product.image_url}', 'M')" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">Add to Cart</button>`;
                } else {
                    buttonHtml = `<a href="${productUrl}" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">Learn More</a>`;
                }

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
            if (typeof feather !== 'undefined') feather.replace(); 
        } catch (err) {
            console.error("Error loading products:", err);
            gridEl.innerHTML = '<p class="text-red-500 col-span-full text-center">Error loading products. Please try again later.</p>';
        }
    }

    if (document.body.id === 'shop-page') {
        loadProductGrid('products', 'product-grid');
    }
    if (document.body.id === 'collections-page') {
        loadProductGrid('custom_styles', 'product-grid');
    }

    // --- LOAD RELATED PRODUCTS ---
    async function loadRelatedProducts(currentCollection, currentProductId, category) {
        const container = document.querySelector('#related-products .grid');
        if (!container) return;

        const db = firebase.firestore();
        
        try {
            let query = db.collection(currentCollection);
            if (category) {
                query = query.where('category', '==', category);
            }
            const snapshot = await query.limit(5).get();
            
            if (snapshot.empty) {
                document.getElementById('related-products').style.display = 'none';
                return;
            }

            let count = 0;
            container.innerHTML = '';

            snapshot.forEach(doc => {
                if (doc.id === currentProductId) return;
                if (count >= 4) return;

                const product = doc.data();
                const productUrl = `product.html?collection=${currentCollection}&id=${doc.id}`;
                
                let buttonHtml = '';
                if (currentCollection === 'products') {
                    const safeName = product.name.replace(/'/g, "\\'");
                    buttonHtml = `<button onclick="addToCart('${doc.id}', '${safeName}', ${product.price}, '${product.image_url}', 'M')" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">Add to Cart</button>`;
                } else {
                    buttonHtml = `<a href="${productUrl}" class="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium hover:bg-pink-200">View</a>`;
                }

                const html = `
                <div class="product-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300">
                  <a href="${productUrl}" class="relative block">
                    <img class="w-full h-64 object-cover" src="${product.image_url}" alt="${product.name}">
                  </a>
                  <div class="p-4">
                    <h3 class="text-lg font-medium text-gray-900 truncate"><a href="${productUrl}">${product.name}</a></h3>
                    <p class="mt-1 text-sm text-gray-500">${product.category || 'Collection'}</p>
                    <div class="mt-4 flex justify-between items-center">
                      <span class="text-lg font-bold text-gray-900">R${product.price.toFixed(2)}</span>
                      ${buttonHtml}
                    </div>
                  </div>
                </div>
                `;
                container.innerHTML += html;
                count++;
            });

            if (count === 0) {
                 document.getElementById('related-products').style.display = 'none';
            }

        } catch (error) {
            console.error("Error loading related products:", error);
        }
    }

    // --- DYNAMIC PRODUCT PAGE LOADER ---
    async function loadProductPage() {
        const params = new URLSearchParams(window.location.search);
        const collectionName = params.get('collection');
        const docId = params.get('id');

        const productNameEl = document.getElementById('product-name');
        const productPriceEl = document.getElementById('product-price');
        const productImageEl = document.getElementById('product-image');
        const productDescriptionEl = document.getElementById('product-description-details');
        const productBreadcrumbEl = document.getElementById('product-breadcrumb');
        const sizeSelectorContainer = document.getElementById('size-selector-container');
        const addToCartBtn = document.getElementById('product-add-to-cart-btn');

        if (!collectionName || !docId || !productNameEl) return;

        try {
            const db = firebase.firestore();
            const doc = await db.collection(collectionName).doc(docId).get();

            if (!doc.exists) {
                productNameEl.textContent = 'Product not found.';
                return;
            }
            
            const product = doc.data();
            productNameEl.textContent = product.name;
            productPriceEl.textContent = `R${product.price.toFixed(2)}`;
            productImageEl.src = product.image_url;
            productImageEl.alt = product.name;
            productBreadcrumbEl.textContent = product.name;
            document.title = `${product.name} | Carries Boutique`; 
            
            if (product.description) {
                productDescriptionEl.innerHTML = `<h3 class="text-lg font-medium text-gray-900">Description</h3><p>${product.description}</p>`;
            }

            let selectedSize = null;

            if (collectionName === 'products') {
                sizeSelectorContainer.style.display = 'block'; 
                const sizeButtonsContainer = sizeSelectorContainer.querySelector('#size-buttons');
                sizeButtonsContainer.innerHTML = ''; 
                
                if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                        const button = document.createElement('button');
                        const isOutOfStock = !variant.stock || variant.stock <= 0;

                        if (isOutOfStock) {
                            button.className = 'size-btn w-10 h-10 border border-gray-200 rounded-md flex items-center justify-center text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed decoration-line-through';
                            button.textContent = variant.size;
                            button.disabled = true; 
                            button.title = "Out of Stock"; 
                        } else {
                            button.className = 'size-btn w-10 h-10 border rounded-md flex items-center justify-center text-sm font-medium hover:bg-gray-100 cursor-pointer transition-colors';
                            button.textContent = variant.size;
                            button.onclick = () => {
                                selectedSize = variant.size;
                                sizeButtonsContainer.querySelectorAll('.size-btn').forEach(btn => {
                                    if (!btn.disabled) {
                                         btn.classList.remove('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                                    }
                                });
                                button.classList.add('bg-pink-100', 'text-pink-700', 'border-pink-300', 'ring-1', 'ring-pink-500');
                            };
                        }
                        sizeButtonsContainer.appendChild(button);
                    });
                } else {
                    sizeButtonsContainer.innerHTML = '<p class="text-sm text-gray-500">Sizes not available.</p>';
                }

                addToCartBtn.onclick = () => {
                    if (!selectedSize) {
                        alert('Please select a size first!');
                        return;
                    }
                    window.addToCart(docId, product.name, product.price, product.image_url, selectedSize);
                };
                
            } else if (collectionName === 'custom_styles') {
                sizeSelectorContainer.style.display = 'none'; 
                selectedSize = 'Custom'; 

                addToCartBtn.onclick = () => {
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

    if (document.body.id === 'product-detail-page') {
        loadProductPage();
    }

    // --- INITIAL PAGE LOAD CALLS ---
    updateCartIcon();
    renderCartPage();
    renderCheckoutSummary();

    if (typeof feather !== 'undefined') feather.replace();

}); // --- END DOMContentLoaded ---
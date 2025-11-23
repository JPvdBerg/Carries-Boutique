// --- TOAST NOTIFICATION HELPER ---
window.showToast = (message) => { 
    const container = document.getElementById('toast-container');
    const msgEl = document.getElementById('toast-message');
    
    if (!container || !msgEl) {
        console.error("Toast container missing!"); 
        return;
    }

    console.log("Showing toast:", message); 

    // 1. Set Content
    msgEl.textContent = message;
    
    // 2. Reset Animation State (Hide it first)
    container.classList.add('hidden');
    container.classList.add('translate-y-10', 'opacity-0');
    
    // 3. Make it display:block (but still invisible due to opacity)
    container.classList.remove('hidden');
    
    // 4. FORCE REFLOW (Critical for animation to trigger)
    void container.offsetWidth; 

    // 5. Animate In
    container.classList.remove('translate-y-10', 'opacity-0');

    // 6. Refresh Icons
    if (typeof feather !== 'undefined') feather.replace();

    // 7. Hide logic
    setTimeout(() => {
        container.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            container.classList.add('hidden');
        }, 300);
    }, 3000);
};

// --- NEW FUNCTION: INITIALIZE MEASUREMENT TOGGLES ---
const initializeMeasurementToggles = () => {
    document.querySelectorAll('.measurement-radio').forEach(radio => {
        // Find the specific form tied to this radio button
        const itemContainer = radio.closest('[data-cart-item-id]');
        if (!itemContainer) return;
        
        const cartItemUniqueId = itemContainer.dataset.cartItemId;
        const specificForm = document.getElementById(`specific-measurements-${cartItemUniqueId}`);

        if (specificForm) {
            // Apply the correct hidden/visible state immediately based on initial check
            if (radio.checked && radio.value === 'specific') {
                specificForm.classList.remove('hidden');
            } else if (radio.value === 'default') {
                // When 'default' is checked, ensure the form is hidden
                 specificForm.classList.add('hidden');
            }
        }
    });
};


document.addEventListener('DOMContentLoaded', () => {
	
	// --- STEPPER LOGIC ---
    // --- STEPPER LOGIC (FIXED) ---
    const initStepper = () => {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const form = document.getElementById('checkout-form');
        
        // 1. Count steps dynamically based on HTML
        const slides = document.querySelectorAll('.step-slide');
        const totalSteps = slides.length; 
        let currentStep = 1;

        if (!nextBtn || !form) return;

        const updateUI = () => {
            // Update Slides
            slides.forEach((slide, index) => {
                const stepNum = index + 1;
                slide.classList.remove('active', 'slide-out-left');
                if (stepNum === currentStep) slide.classList.add('active');
                else if (stepNum < currentStep) slide.classList.add('slide-out-left');
            });

            // Update Circles
            document.querySelectorAll('.step-indicator').forEach(ind => {
                const step = parseInt(ind.dataset.step);
                ind.classList.remove('active', 'completed');
                if (step === currentStep) ind.classList.add('active');
                if (step < currentStep) ind.classList.add('completed');
                
                const circle = ind.querySelector('.circle');
                if (step < currentStep) circle.innerHTML = '✓';
                else circle.textContent = step;
            });

            // Update Lines
            document.querySelectorAll('.step-line').forEach(line => {
                const lineNum = parseInt(line.dataset.line);
                if (lineNum < currentStep) line.classList.add('active');
                else line.classList.remove('active');
            });

            // Update Buttons
            if (currentStep === 1) prevBtn.classList.add('hidden');
            else prevBtn.classList.remove('hidden');

            // 2. FORCE Button Text & Color
            if (currentStep === totalSteps) {
                nextBtn.textContent = 'Place Order';
                nextBtn.classList.remove('bg-pink-600', 'hover:bg-pink-700');
                nextBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            } else {
                nextBtn.textContent = 'Continue';
                nextBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                nextBtn.classList.add('bg-pink-600', 'hover:bg-pink-700');
            }
        };

        nextBtn.addEventListener('click', () => {
            // 1. Standard Input Validation (Existing logic)
            const currentSlide = document.getElementById(`slide-${currentStep}`);
            const inputs = currentSlide.querySelectorAll('input[required]');
            let valid = true;
            
            inputs.forEach(input => {
                if (!input.value) {
                    valid = false;
                    input.classList.add('border-red-500');
                    setTimeout(() => input.classList.remove('border-red-500'), 2000);
                }
            });

            // 2. NEW: Check Terms & Conditions (Only applies on the last step)
            if (currentStep === totalSteps) { 
                const termsBox = document.getElementById('terms-checkbox');
                if (termsBox && !termsBox.checked) {
                    showToast("Please agree to the Terms & Conditions.");
                    // Flash the text red
                    termsBox.parentElement.classList.add('text-red-600');
                    setTimeout(() => termsBox.parentElement.classList.remove('text-red-600'), 2000);
                    return; // STOP here, do not submit
                }
            }

            if (!valid) {
                showToast("Please fill in all required fields.");
                return;
            }

            // 3. Proceed or Submit
            if (currentStep < totalSteps) {
                currentStep++;
                updateUI();
            } else {
                // Submit Form
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateUI();
            }
        });
        
        // Run once on load
        updateUI();
    };

    // Run it
    if (document.getElementById('checkout-form')) {
        initStepper();
    }
	
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
            cartItemsContainer.innerHTML = '<div class="text-center py-10"><div class="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4"><i data-feather="shopping-cart" class="text-gray-400 w-10 h-10"></i></div><p class="text-gray-500 mb-4">Your cart is empty.</p><a href="shop.html" class="inline-block bg-pink-600 text-white px-6 py-2 rounded-full hover:bg-pink-700 transition">Start Shopping</a></div>';
            if (cartSummaryContainer) cartSummaryContainer.classList.add('hidden');
            return;
        }

        if (cartSummaryContainer) cartSummaryContainer.classList.remove('hidden');
        let subtotal = 0;

        cart.forEach(item => {
            subtotal += item.price * item.quantity;
            
            const uniqueItemId = item.cartItemId || item.id; 
            const itemSize = item.size || 'undefined'; 

            // --- NEW MOBILE-FRIENDLY LAYOUT ---
            const itemHtml = `
              <div class="py-6 border-b border-gray-100 flex gap-4 animate-fade-in">
                <img src="${item.image}" alt="${item.name}" class="w-24 h-32 object-cover rounded-md shadow-sm flex-shrink-0">
                
                <div class="flex-1 flex flex-col justify-between">
                    
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-serif font-bold text-gray-900 text-lg leading-tight">${item.name}</h3>
                            <p class="text-sm text-gray-500 mt-1">Size: <span class="font-medium text-gray-700">${itemSize}</span></p>
                        </div>
                        <button class="text-gray-400 hover:text-red-500 p-2 -mr-2 transition-colors" onclick="removeFromCart('${uniqueItemId}')" title="Remove Item">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="flex justify-between items-end mt-2">
                        <div class="flex items-center bg-gray-50 border border-gray-200 rounded-full">
                            <button class="px-3 py-1 text-gray-600 hover:bg-gray-200 hover:text-pink-600 rounded-l-full transition" onclick="updateCartQuantity('${uniqueItemId}', ${item.quantity - 1})">
                                <i data-feather="minus" class="w-3 h-3"></i>
                            </button>
                            <span class="w-8 text-center text-sm font-semibold text-gray-900">${item.quantity}</span>
                            <button class="px-3 py-1 text-gray-600 hover:bg-gray-200 hover:text-pink-600 rounded-r-full transition" onclick="updateCartQuantity('${uniqueItemId}', ${item.quantity + 1})">
                                <i data-feather="plus" class="w-3 h-3"></i>
                            </button>
                        </div>
                        
                        <div class="text-right">
                             <p class="text-xs text-gray-400 mb-0.5">R${item.price.toFixed(0)} each</p>
                             <p class="font-bold text-gray-900 text-lg">R${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
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

    /**
     * NEW FUNCTION: Handles changing the size of ONE unit of an item.
     * Moves 1 unit from 'Old Size' stack to 'New Size' stack.
     */
    window.updateCartUnitVariant = (oldCartItemId, newSize, productId, productName, price, image) => {
        let cart = getCart();
        
        // 1. Find the source item stack
        const oldItemIndex = cart.findIndex(item => item.cartItemId === oldCartItemId);
        if (oldItemIndex === -1) return;

        // 2. Decrement the source item count (or remove if it was the last one)
        if (cart[oldItemIndex].quantity > 1) {
            cart[oldItemIndex].quantity -= 1;
        } else {
            cart.splice(oldItemIndex, 1);
        }

        // 3. Create the ID for the destination item
        const newCartItemId = createCartItemId(productId, newSize);
        
        // 4. Find if the destination item already exists
        const existingNewItem = cart.find(item => item.cartItemId === newCartItemId);
        
        if (existingNewItem) {
            // If it exists, just add this unit to that stack
            existingNewItem.quantity += 1;
        } else {
            // If not, create a new stack for this size with Qty 1
            cart.push({
                cartItemId: newCartItemId,
                id: productId,
                name: productName,
                price: price,
                image: image,
                size: newSize,
                quantity: 1
            });
        }

        saveCart(cart);
        renderCheckoutSummary();
    };

    // --- =================================== ---
    // --- CHECKOUT SUMMARY RENDERER (UPDATED) ---
    // --- =================================== ---
    const renderCheckoutSummary = () => {
        const summaryContainer = document.getElementById('checkout-summary');
        if (!summaryContainer) return; 

        const cart = getCart();
        summaryContainer.innerHTML = ''; 
        let subtotal = 0;

        const hasCustomItem = cart.some(item => item.size === 'Custom');
        const defaultMeasurementsSection = document.getElementById('default-measurements-section');
        
        // Show/hide the global "Your Measurements" section based on cart contents
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

        // --- RENDER ITEMS (Split Retail & Custom) ---

        cart.forEach((item) => {
            const isRetail = item.size !== 'Custom';
            const itemSize = item.size || 'undefined'; 
            
            // 1. RETAIL ITEM RENDERING (Split by Unit)
            if (isRetail) {
                // Loop through EACH unit of this retail item to display separately
                for (let unitIndex = 0; unitIndex < item.quantity; unitIndex++) {
                    // Create a unique ID for the DOM element, but use item.cartItemId for data logic
                    const cartItemUniqueId = `${item.cartItemId}_retail_${unitIndex}`; 
                    subtotal += item.price; // Add price per unit (since we loop quantity times)
                    
                    const allRetailSizes = ['S', 'M', 'L', 'XL'];
                    const productData = `'${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.image}'`;

                    const sizeOptionsHtml = allRetailSizes.map(size => {
                        const isSelected = size === itemSize;
                        return `
                            <button 
                                onclick="updateCartUnitVariant('${item.cartItemId}', '${size}', ${productData})" 
                                class="size-btn px-3 py-1 text-sm rounded-lg border transition-colors 
                                ${isSelected ? 'bg-pink-600 text-white border-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                                ${size}
                            </button>
                        `;
                    }).join('');
                    
                    const itemTypeBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Retail</span>`;

                    const retailHtml = `
                        <div class="py-4 border-b" data-cart-item-id="${cartItemUniqueId}" data-base-cart-id="${item.cartItemId}">
                            <div class="flex justify-between items-start">
                                <div class="flex items-start space-x-3 w-4/5">
                                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg flex-shrink-0">
                                    <div>
                                        <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
                                        ${itemTypeBadge}
                                        <p class="text-xs text-gray-600 mt-1">Unit ${unitIndex + 1} &bull; Current Size: <span class="font-semibold">${itemSize}</span></p>
                                    </div>
                                </div>
                                <p class="font-bold text-sm md:text-base whitespace-nowrap">R${item.price.toFixed(2)}</p>
                            </div>
                            <div class="mt-3 pt-3 border-t border-gray-100">
                                <p class="font-medium text-sm text-gray-700 mb-2">Change Size:</p>
                                <div class="flex space-x-2">${sizeOptionsHtml}</div>
                            </div>
                        </div>
                    `;
                    summaryContainer.innerHTML += retailHtml;
                }
            } 
            
            // 2. CUSTOM ITEM RENDERING (Individual Units + Measurement Toggles)
            else {
                // Custom items must be broken down by quantity
                for (let unitIndex = 0; unitIndex < item.quantity; unitIndex++) {
                    const unitId = `${item.cartItemId}_unit_${unitIndex}`; // Unique ID for EACH unit
                    subtotal += item.price; // Add unit price
                    
                    const itemTypeBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Custom Style</span>`;
                    
                    const customUnitHtml = `
                        <div class="py-4 border-b" data-cart-item-id="${unitId}" data-base-cart-id="${item.cartItemId}">
                            <div class="flex justify-between items-start">
                                <div class="flex items-start space-x-3 w-4/5">
                                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg flex-shrink-0">
                                    <div>
                                        <h4 class="font-medium text-sm md:text-base">${item.name}</h4>
                                        ${itemTypeBadge}
                                        <p class="text-xs text-gray-600 mt-1">Unit ${unitIndex + 1} &bull; Current Size: <span class="font-semibold">${itemSize}</span></p>
                                    </div>
                                </div>
                                <p class="font-bold text-sm md:text-base whitespace-nowrap">R${item.price.toFixed(2)}</p>
                            </div>
                            <div class="mt-3 pt-2 border-t border-gray-100" data-measurement-toggle>
                                <h5 class="text-xs font-semibold text-gray-800 mb-2">Unit ${unitIndex + 1} Measurements</h5>
                                <div class="flex flex-col space-y-2">
                                    <label class="flex items-center text-sm">
                                        <input type="radio" name="measurements-option-${unitId}" value="default" class="mr-2 focus:ring-pink-500 text-pink-600 measurement-radio" checked>
                                        Use Default Account Sizes
                                    </label>
                                    <label class="flex items-center text-sm">
                                        <input type="radio" name="measurements-option-${unitId}" value="specific" class="mr-2 focus:ring-pink-500 text-pink-600 measurement-radio">
                                        Specify for This Unit
                                    </label>
                                </div>
                                
                                <div id="specific-measurements-${unitId}" class="hidden mt-3 p-3 bg-gray-50 rounded-md">
                                    <div class="grid grid-cols-2 gap-2">
                                        <div><label for="bust-${unitId}" class="block text-xs font-medium text-gray-600">Bust (cm)</label><input type="number" id="bust-${unitId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-bust"></div>
                                        <div><label for="waist-${unitId}" class="block text-xs font-medium text-gray-600">Waist (cm)</label><input type="number" id="waist-${unitId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-waist"></div>
                                        <div><label for="hips-${unitId}" class="block text-xs font-medium text-gray-600">Hips (cm)</label><input type="number" id="hips-${unitId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-hips"></div>
                                        <div><label for="height-${unitId}" class="block text-xs font-medium text-gray-600">Height (cm)</label><input type="number" id="height-${unitId}" placeholder="cm" class="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md specific-height"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    summaryContainer.innerHTML += customUnitHtml;
                } // End Custom Unit Loop
            }
        }); // END Main Cart Aggregation Loop

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
        
        // --- NEW: Initialize measurement toggles after rendering HTML ---
        initializeMeasurementToggles();
        
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
    const summaryContainerEl = document.getElementById('checkout-summary');
    if (summaryContainerEl) {
        summaryContainerEl.addEventListener('change', (e) => {
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
    // -----------------
// --- NEW SECURE CODE (USE THIS) ---
// -----------------
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Get the submit button
            const submitButton = checkoutForm.querySelector('button[type="submit"]') || document.getElementById('nextBtn');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Processing...';
            }

            // 2. Ensure user is authenticated (even as guest)
            let user = firebase.auth().currentUser;
            try {
                if (!user) {
                    console.log("User not logged in. Creating Guest Session...");
                    const authResult = await firebase.auth().signInAnonymously();
                    user = authResult.user;
                }
            } catch (authError) {
                console.error("Guest login failed:", authError);
                alert("Could not initialize checkout. Please refresh and try again.");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }

            // 3. Gather Shipping Info
            const shippingAddress = {
                name: document.getElementById('name')?.value,
                email: document.getElementById('email')?.value,
                address: document.getElementById('address')?.value,
                city: document.getElementById('city')?.value,
                postalCode: document.getElementById('postal-code')?.value,
            };

            // 4. Gather Default Measurements
            const defaultMeasurements = {
                bust: document.getElementById('bust')?.value,
                waist: document.getElementById('waist')?.value,
                hips: document.getElementById('hips')?.value,
                height: document.getElementById('height')?.value,
                fit: document.getElementById('fit')?.value,
            };

            // 5. Gather all cart units from the DOM
            // This builds the list of items the user wants to buy
            const cartUnits = [];
            const summaryItems = document.querySelectorAll('#checkout-summary [data-cart-item-id]');
            const cart = getCart(); // Get original cart to find collection/ID
            let allMeasurementsValid = true;

            for (let i = 0; i < summaryItems.length; i++) {
                const itemElement = summaryItems[i];
                const cartItemUniqueId = itemElement.dataset.cartItemId;
                const baseCartItemId = itemElement.dataset.baseCartId;
                
                const originalItem = cart.find(cartItem => cartItem.cartItemId === baseCartItemId);
                
                if (!originalItem) {
                    console.error("Original item not found for submission:", baseCartItemId);
                    allMeasurementsValid = false;
                    alert("An error occurred processing item data.");
                    break;
                }

                const processedUnit = { 
                    id: originalItem.id, // e.g., 'prod_001'
                    collection: originalItem.size === 'Custom' ? 'custom_styles' : 'products', // Which collection to look in
                    size: originalItem.size,
                    quantity: 1, // We submit one by one
                    measurements: null // We fill this in next
                };

                // --- LOGIC: Only process measurements for CUSTOM items ---
                if (processedUnit.size === 'Custom') {
                    const checkedRadio = itemElement.querySelector(`input[name="measurements-option-${cartItemUniqueId}"]:checked`);
                    const measurementOption = checkedRadio ? checkedRadio.value : 'default'; // Default to 'default'
                    
                    if (measurementOption === 'default') {
                        if (!defaultMeasurements.bust || !defaultMeasurements.waist || !defaultMeasurements.hips) {
                            allMeasurementsValid = false;
                            alert(`Please fill in at least Bust, Waist, and Hips in the 'Your Measurements' section, or specify measurements for each custom item.`);
                            break; 
                        }
                        processedUnit.measurements = { type: 'default', ...defaultMeasurements };
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
                            alert(`You selected 'Specify for item' but did not fill in all required measurements.`);
                            break; 
                        }
                        processedUnit.measurements = { type: 'specific', ...specificMeasurements };
                    }
                }
                cartUnits.push(processedUnit);
            } // End of cart loop

            if (!allMeasurementsValid) {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Order';
                }
                return;
            }

            // 6. CALL THE CLOUD FUNCTION
            // We are no longer writing to Firestore from the client.
            try {
                console.log("Calling 'placeOrder' Cloud Function...");
                // Force the connection to South Africa
const placeOrderFunction = firebase.app().functions('africa-south1').httpsCallable('placeOrder');
                
                const result = await placeOrderFunction({
                    shippingAddress: shippingAddress,
                    cartUnits: cartUnits // Send the list of units
                });

                // 7. Success! Redirect to confirmation page.
                const orderId = result.data.orderId;
                console.log("Order placed! Server responded with ID:", orderId);
                
                localStorage.removeItem('carriesBoutiqueCart'); // Clear the cart
                updateCartIcon();
                
                window.location.href = `confirmation.html?orderId=${orderId}`;

            } catch (error) {
                console.error('Failed to place order:', error);
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
                  window.location.replace('index.html'); // <-- Redirect to Home
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
                        isMeasurementsLoaded = false;
                        renderCheckoutSummary(); 
                        loadMeasurements(user.uid, currentPage).then(() => {
                            isMeasurementsLoaded = true; 
                            renderCheckoutSummary();
                        }).catch((err) => {
                             console.log("Measurements not found or error, unlocking button anyway.", err);
                             isMeasurementsLoaded = true; // Force unlock on error
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
                     loadOrderHistory(user.uid); // Ensure this function exists if you call it, else comment out
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
                <div class="min-w-72 w-72 snap-center bg-white rounded-xl shadow-md overflow-hidden flex-shrink-0 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
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


	// --- LOAD ORDER HISTORY FUNCTION ---
    async function loadOrderHistory(userId) {
        const container = document.getElementById('order-history-list');
        if (!container) return;

        const db = firebase.firestore();
        // Show a loading spinner initially
        container.innerHTML = '<div class="text-center py-8"><p class="mt-2 text-gray-500">Loading your orders...</p></div>';

        try {
            // NOTE: This specific query (where + orderBy) requires a Firestore Index.
            // If this fails, open your browser console (F12) and click the link in the error message!
            const snapshot = await db.collection('orders')
                .where('userId', '==', userId)
                .orderBy('order_date', 'desc')
                .get();

            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <i data-feather="shopping-bag" class="mx-auto h-12 w-12 text-gray-400"></i>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                        <p class="mt-1 text-sm text-gray-500">Start shopping to see your orders here.</p>
                        <div class="mt-6">
                            <a href="shop.html" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
                                Start Shopping
                            </a>
                        </div>
                    </div>`;
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const order = doc.data();
                // Handle date conversion safely
                const date = order.order_date && order.order_date.toDate ? 
                             order.order_date.toDate().toLocaleDateString() : 'Processing Date';
                
                // Calculate total safely
                const cartTotal = order.cart ? order.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
                const total = cartTotal + 50; // Adding standard shipping
                
                // Determine status badge color
                let statusColor = 'bg-gray-100 text-gray-800'; // Default/Pending
                if (order.status === 'Completed') statusColor = 'bg-green-100 text-green-800';
                if (order.status === 'Shipped') statusColor = 'bg-blue-100 text-blue-800';
                if (order.status === 'Cancelled') statusColor = 'bg-red-100 text-red-800';

                html += `
                <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6 transition hover:shadow-md">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between sm:px-6">
                        <div class="flex space-x-4">
                            <div>
                                <p class="text-xs font-medium text-gray-500 uppercase">Placed</p>
                                <p class="text-sm font-bold text-gray-900">${date}</p>
                            </div>
                            <div>
                                <p class="text-xs font-medium text-gray-500 uppercase">Order ID</p>
                                <p class="text-sm font-bold text-gray-900">#${doc.id.slice(0, 8)}...</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 mt-2 sm:mt-0">
                             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                                ${order.status || 'Pending'}
                            </span>
                             <a href="confirmation.html?orderId=${doc.id}" class="text-pink-600 hover:text-pink-800 text-sm font-medium hover:underline">View Details</a>
                        </div>
                    </div>
                    <div class="px-4 py-4 sm:px-6">
                        <ul class="-my-4 divide-y divide-gray-200">
                            ${order.cart.map(item => `
                                <li class="flex py-4">
                                    <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                        <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover object-center">
                                    </div>
                                    <div class="ml-4 flex-1">
                                        <div class="flex justify-between text-sm font-medium text-gray-900">
                                            <h3>${item.name}</h3>
                                            <p>R${(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <p class="text-xs text-gray-500">Size: ${item.size} | Qty: ${item.quantity}</p>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center border-t border-gray-200">
                         <p class="text-sm font-medium text-gray-500">Shipping: R50.00</p>
                         <p class="text-base font-bold text-gray-900">Total: R${total.toFixed(2)}</p>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error("Error loading order history:", error);
            // Special handling for the common "Missing Index" error
            if (error.code === 'failed-precondition') {
                 container.innerHTML = '<p class="text-red-500 p-4 border border-red-200 rounded bg-red-50">Admin Action Required: Database Index Missing. Check browser console for the creation link.</p>';
            } else {
                 container.innerHTML = '<p class="text-red-500">Could not load order history. Please try again later.</p>';
            }
        }
    }

    // ... (This is inside the main DOMContentLoaded block)

    // --- CARD NAV ANIMATION LOGIC ---
    // REMOVED: document.addEventListener('DOMContentLoaded', () => {  <-- DELETE THIS LINE
    
    const navContainer = document.querySelector('.card-nav');
    const hamburger = document.querySelector('.hamburger-menu');
    const cards = document.querySelectorAll('.nav-card');
    let isExpanded = false;
    let tl = null; // GSAP Timeline

    if (navContainer && hamburger && typeof gsap !== 'undefined') {
        
        // Helper: Calculate expansion height
        const calculateHeight = () => {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const baseHeight = 60; // Top bar height
            const padding = 16;
            
            if (isMobile) {
                // On mobile: height = top bar + all cards + gaps
                let contentHeight = 0;
                cards.forEach(card => contentHeight += card.scrollHeight + 8); 
                return baseHeight + contentHeight + padding + 20; // Extra buffer
            } else {
                // On desktop: Fixed height
                return 280; 
            }
        };

        // Create Animation Timeline
        const createTimeline = () => {
            if (tl) tl.kill();
            
            tl = gsap.timeline({ paused: true });

            // 1. Expand Container
            tl.to(navContainer, {
                height: calculateHeight(),
                duration: 0.5,
                ease: "power3.out"
            });

            // 2. Show Content
            tl.set('.card-nav-content', { autoAlpha: 1, visibility: 'visible' }, 0);

            // 3. Stagger Cards In
            tl.to(cards, {
                y: 0,
                opacity: 1,
                duration: 0.4,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=0.3");
        };

        // Initialize
        createTimeline();

        // Toggle Click Event
        hamburger.addEventListener('click', () => {
            if (!isExpanded) {
                hamburger.classList.add('open');
                tl.play();
                isExpanded = true;
            } else {
                hamburger.classList.remove('open');
                tl.reverse();
                isExpanded = false;
            }
        });

        // Handle Resize
        window.addEventListener('resize', () => {
            if (isExpanded) {
                gsap.set(navContainer, { height: calculateHeight() });
            }
            createTimeline();
            if (isExpanded) tl.progress(1);
        });
    } else {
        console.warn("Card Nav: Elements missing or GSAP not loaded.");
    }
    
    // REMOVED: }); <-- DELETE THIS CLOSING BRACKET
}); // This is the closing bracket for the MAIN (outer) DOMContentLoaded listener
    

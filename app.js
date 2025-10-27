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
      // Check if the link is just a placeholder
      if (this.getAttribute('href') === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      // Check if the element is on the current page
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
      document.querySelector('#collections').scrollIntoView({
        behavior: 'smooth'
      });
    });
  }

  // --- SHOPPING CART LOGIC ---

  // Utility function to get cart from localStorage
  const getCart = () => {
    return JSON.parse(localStorage.getItem('carriesBoutiqueCart')) || [];
  };

  // Utility function to save cart to localStorage
  const saveCart = (cart) => {
    localStorage.setItem('carriesBoutiqueCart', JSON.stringify(cart));
    updateCartIcon();
  };

  // 1. Add to Cart
  window.addToCart = (productId, productName, price, image) => {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id: productId, name: productName, price: price, image: image, quantity: 1 });
    }
    
    saveCart(cart);
    
    // Show confirmation
    alert(`${productName} has been added to your cart!`);
  };

  // 2. Update Cart Icon Badge
  const updateCartIcon = () => {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cart-badge');
    
    if (cartBadge) {
      if (totalItems > 0) {
        cartBadge.textContent = totalItems;
        cartBadge.classList.remove('hidden');
      } else {
        cartBadge.classList.add('hidden');
      }
    }
  };

  // 3. Render Cart Page
  const renderCartPage = () => {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSummaryContainer = document.getElementById('cart-summary-container');
    if (!cartItemsContainer) return; // Only run on cart page

    const cart = getCart();
    cartItemsContainer.innerHTML = ''; // Clear existing items
    
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="text-gray-500">Your cart is empty. <a href="shop.html" class="text-pink-600 hover:underline">Start shopping!</a></p>';
      cartSummaryContainer.classList.add('hidden');
      return;
    }

    cartSummaryContainer.classList.remove('hidden');
    let subtotal = 0;

    cart.forEach(item => {
      subtotal += item.price * item.quantity;
      const itemHtml = `
        <div class="flex items-center justify-between py-4 border-b">
          <div class="flex items-center space-x-4">
            <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-lg">
            <div>
              <h3 class="text-lg font-medium text-gray-900">${item.name}</h3>
              <p class="text-gray-500">R${item.price.toFixed(2)}</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})">
              <i data-feather="minus" class="w-4 h-4"></i>
            </button>
            <span class="w-8 text-center">${item.quantity}</span>
            <button class="p-1 rounded-full text-gray-500 hover:bg-gray-200" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})">
              <i data-feather="plus" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-lg font-semibold text-gray-900">R${(item.price * item.quantity).toFixed(2)}</p>
          <button class="text-red-500 hover:text-red-700" onclick="removeFromCart('${item.id}')">
            <i data-feather="trash-2" class="w-5 h-5"></i>
          </button>
        </div>
      `;
      cartItemsContainer.innerHTML += itemHtml;
    });

    // Update Summary
    const shipping = 50.00; // Fixed shipping
    const total = subtotal + shipping;
    document.getElementById('cart-subtotal').textContent = `R${subtotal.toFixed(2)}`;
    document.getElementById('cart-shipping').textContent = `R${shipping.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `R${total.toFixed(2)}`;
    
    feather.replace(); // Re-run feather icons
  };

  // 4. Update Quantity (from cart page)
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

  // 5. Remove from Cart (from cart page)
  window.removeFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCartPage(); // Re-render the cart
  };

  // 6. Render Checkout Summary
  const renderCheckoutSummary = () => {
    const summaryContainer = document.getElementById('checkout-summary');
    if (!summaryContainer) return; // Only run on checkout page

    const cart = getCart();
    summaryContainer.innerHTML = ''; // Clear
    let subtotal = 0;

    if (cart.length === 0) {
      summaryContainer.innerHTML = '<p class="text-gray-500">Your cart is empty.</p>';
      return;
    }

    cart.forEach(item => {
      subtotal += item.price * item.quantity;
      const itemHtml = `
        <div class="flex justify-between items-center py-3 border-b">
          <div class="flex items-center space-x-3">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
            <div>
              <h4 class="font-medium">${item.name}</h4>
              <p class="text-sm text-gray-500">Qty: ${item.quantity}</p>
            </div>
          </div>
          <p class="font-medium">R${(item.price * item.quantity).toFixed(2)}</p>
        </div>
      `;
      summaryContainer.innerHTML += itemHtml;
    });

    const shipping = 50.00;
    const total = subtotal + shipping;
    
    const summaryTotalHtml = `
      <div class="py-3 space-y-2 border-b">
        <div class="flex justify-between">
          <p class="text-gray-600">Subtotal</p>
          <p class="font-medium">R${subtotal.toFixed(2)}</p>
        </div>
        <div class="flex justify-between">
          <p class="text-gray-600">Shipping</p>
          <p class="font-medium">R${shipping.toFixed(2)}</p>
        </div>
      </div>
      <div class="py-4 flex justify-between text-lg font-bold">
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
      
      // Gather all form data
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        postalCode: document.getElementById('postal-code').value,
      };

      // Get cart data
      const cart = getCart();

      if (!formData.email || !formData.name || cart.length === 0) {
        alert('Please fill out all required fields and have items in your cart.');
        return;
      }

      // Show a loading state (optional)
      const submitButton = checkoutForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Placing Order...';

      try {
        // Send ALL data to your backend
        const response = await fetch('https://carries-boutique-server.onrender.com/api/send-order', {
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
          throw new Error('Server responded with an error');
        }

        // On successful "payment"
        localStorage.removeItem('carriesBoutiqueCart'); // Clear the cart
        
        // Redirect to confirmation page
        window.location.href = 'confirmation.html';

      } catch (error) {
        console.error('Failed to send order:', error);
        alert('There was an error placing your order. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
    });
  }

  // --- INITIAL PAGE LOAD ---
  updateCartIcon();
  renderCartPage();
  renderCheckoutSummary();
});
// --- AUTHENTICATION & SECURITY GUARD ---
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const currentPage = document.body.id;

    // Add click listener for all logout buttons
    const logoutButtons = document.querySelectorAll('#logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out.');
                window.location.href = 'index.html'; // Go to main site, not admin login
            }).catch(error => {
                console.error('Sign out error:', error);
            });
        });
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in. Now check if they are an admin.
            try {
                const adminRef = db.collection('admins').doc(user.uid);
                const adminDoc = await adminRef.get();

                if (adminDoc.exists) {
                    // --- ADMIN IS VERIFIED ---
                    console.log('Admin access granted.');
                    if (currentPage === 'login-page') {
                        // If they are on the login page, redirect to dashboard
                        window.location.href = 'admin.html';
                    } else {
                        // If on any other admin page, initialize the page logic
                        initializeApp(db, user);
                    }
                } else {
                    // --- NOT AN ADMIN ---
                    console.warn('Access Denied. User is not an admin.');
                    alert('You do not have permission to access this page.');
                    auth.signOut();
                    window.location.href = 'index.html'; // Go to main site
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                auth.signOut();
                window.location.href = 'index.html'; // Go to main site
            }
        } else {
            // User is signed out.
            // If they are not on the login page, redirect them.
            if (currentPage !== 'login-page') {
                console.log('User not logged in. Redirecting to admin login.');
                window.location.href = 'admin-login.html';
            } else {
                // We are on the login page, set up the login button
                setupLoginPage(auth);
            }
        }
    });
});

function setupLoginPage(auth) {
    const loginButton = document.getElementById('google-login-btn-page');
    const errorMessage = document.getElementById('error-message');
    
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => {
                console.error('Login failed:', error);
                if (errorMessage) {
                    errorMessage.textContent = `Login failed: ${error.message}`;
                    errorMessage.classList.remove('hidden');
                }
            });
            // onAuthStateChanged will handle the redirect on success
        });
    }
}

// --- INITIALIZE PAGE-SPECIFIC LOGIC ---
function initializeApp(db, user) {
    const currentPage = document.body.id;

    if (currentPage === 'dashboard-page') {
        loadOrders(db);
    } else if (currentPage === 'add-product-page') {
        setupAddProductForm(db);
    } else if (currentPage === 'manage-products-page') { // NEW
        loadProductList(db);
    }
    
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}


// --- ORDER DASHBOARD LOGIC (admin.html) ---
function loadOrders(db) {
    const orderListEl = document.getElementById('order-list');
    if (!orderListEl) return;

    // Use onSnapshot for REAL-TIME updates
    db.collection('orders').orderBy('order_date', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            orderListEl.innerHTML = '<p class="p-6 text-gray-500">No orders found.</p>';
            return;
        }

        orderListEl.innerHTML = ''; // Clear list
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            
            const orderHtml = createOrderCard(orderId, order);
            orderListEl.innerHTML += orderHtml;
        });

        // After adding all HTML, attach event listeners
        attachOrderListeners(db);
        if (typeof feather !== 'undefined') feather.replace();

    }, error => {
        console.error("Error loading orders: ", error);
        orderListEl.innerHTML = '<p class="p-6 text-red-500">Error loading orders.</p>';
    });
}

function createOrderCard(orderId, order) {
    // Format the date
    const date = order.order_date.toDate ? order.order_date.toDate().toLocaleDateString('en-ZA') : 'Invalid Date';
    
    // Build the list of items
    const itemsHtml = order.cart.map(item => `
        <li class="flex items-center justify-between py-2">
            <div class="flex items-center">
                <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded mr-3">
                <div>
                    <p class="font-medium">${item.name} (x${item.quantity})</p>
                    <p class="text-sm text-gray-600">Size: ${item.size}</p>
                </div>
            </div>
            <span class="font-medium">R${(item.price * item.quantity).toFixed(2)}</span>
        </li>
    `).join('');

    // Build the measurements details
    const measurementsHtml = order.cart.map(item => {
        // Only show measurements if they exist (for custom items)
        if (!item.measurements) {
            return '';
        }
        return `
        <div class="mt-2">
            <p class="font-semibold text-sm">${item.name}:</p>
            <ul class="text-xs text-gray-600 list-disc list-inside">
                <li>Bust: ${item.measurements.bust || 'N/A'} cm</li>
                <li>Waist: ${item.measurements.waist || 'N/A'} cm</li>
                <li>Hips: ${item.measurements.hips || 'N/A'} cm</li>
                <li>Height: ${item.measurements.height || 'N/A'} cm</li>
                <li>Fit: ${item.measurements.fit || 'N/A'}</li>
            </ul>
        </div>
        `;
    }).join('');

    // Status options
    const statuses = ['Pending', 'Busy', 'Complete'];
    const statusOptions = statuses.map(s => 
        `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    return `
    <div class="p-6 border-b border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div>
                <h3 class="font-semibold text-lg text-gray-900">${order.customer.name}</h3>
                <p class="text-sm text-gray-600">${order.customer.email}</p>
                <p class="text-sm text-gray-600 mt-2">${order.customer.address}, ${order.customer.city}</p>
                <p class="text-sm text-gray-500 mt-2">Date: ${date}</p>
                <p class="text-xs text-gray-400 mt-1">Order ID: ${orderId}</p>
            </div>

            <div class="md:col-span-2">
                <h4 class="font-medium text-gray-800 mb-2">Items</h4>
                <ul class="divide-y divide-gray-100">
                    ${itemsHtml}
                </ul>
            </div>

            <div>
                <h4 class="font-medium text-gray-800 mb-2">Measurements</h4>
                <div class="text-sm space-y-2">
                    ${measurementsHtml}
                </div>
                
                <div class="mt-6">
                    <label for="status-${orderId}" class="block text-sm font-medium text-gray-700">Order Status</label>
                    <select id="status-${orderId}" data-id="${orderId}" class="status-select status-updater mt-1">
                        ${statusOptions}
                    </select>
                </div>
            </div>

        </div>
    </div>
    `;
}

function attachOrderListeners(db) {
    const statusSelects = document.querySelectorAll('.status-updater');
    statusSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const orderId = e.target.dataset.id;
            const newStatus = e.target.value;
            
            const orderRef = db.collection('orders').doc(orderId);
            orderRef.update({
                status: newStatus
            }).then(() => {
                console.log(`Order ${orderId} updated to ${newStatus}`);
                // You can add a small temporary "Saved!" message here
            }).catch(error => {
                console.error("Error updating status: ", error);
            });
        });
    });
}


// --- MANAGE PRODUCTS PAGE LOGIC (admin-products.html) ---

async function loadProductList(db) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    
    container.innerHTML = '<p class="p-6 text-gray-500">Loading products...</p>';

    try {
        const productsSnap = await db.collection('products').get();
        const stylesSnap = await db.collection('custom_styles').get();

        let allProducts = [];
        
        productsSnap.forEach(doc => {
            allProducts.push({ 
                id: doc.id, 
                collection: 'products', 
                ...doc.data() 
            });
        });
        
        stylesSnap.forEach(doc => {
            allProducts.push({ 
                id: doc.id, 
                collection: 'custom_styles', 
                ...doc.data() 
            });
        });

        if (allProducts.length === 0) {
            container.innerHTML = '<p class="p-6 text-gray-500">No products found. Add one!</p>';
            return;
        }
        
        // Sort by name
        allProducts.sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = ''; // Clear loading
        allProducts.forEach(product => {
            const productType = product.collection === 'products' ? 'Retail' : 'Custom';
            const productTypeColor = product.collection === 'products' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';

            container.innerHTML += `
                <div class="p-4 flex items-center justify-between border-b border-gray-200">
                    <div class="flex items-center">
                        <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg mr-4">
                        <div>
                            <p class="font-bold text-lg text-gray-900">${product.name}</p>
                            <p class="text-sm text-gray-600">R${product.price.toFixed(2)}</p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productTypeColor}">
                                ${productType}
                            </span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <a href="admin-add-product.html?collection=${product.collection}&id=${product.id}" class="button-secondary">Edit</a>
                        <button data-collection="${product.collection}" data-id="${product.id}" class="button-danger delete-product-btn">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

        // Attach listeners to all the new delete buttons
        attachDeleteListeners(db);

    } catch (error) {
        console.error("Error loading product list:", error);
        container.innerHTML = '<p class="p-6 text-red-500">Error loading products.</p>';
    }
}

function attachDeleteListeners(db) {
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const { collection, id } = e.currentTarget.dataset;
            
            if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
                try {
                    await db.collection(collection).doc(id).delete();
                    console.log('Product deleted');
                    loadProductList(db); // Refresh the list
                } catch (error) {
                    console.error("Error deleting product:", error);
                    alert('Could not delete product. See console for details.');
                }
            }
        });
    });
}


// --- ADD/EDIT PRODUCT PAGE LOGIC (admin-add-product.html) ---
function setupAddProductForm(db) {
    const form = document.getElementById('add-product-form');
    if (!form) return;

    // --- Get URL params to check for EDIT mode ---
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');
    const collectionName = params.get('collection');
    const isEditMode = docId && collectionName;

    // Get form elements
    const pageTitle = document.getElementById('page-title');
    const submitBtn = document.getElementById('submit-product-btn');
    const productIdInput = document.getElementById('product-id'); // NEW
    const productTypeRadios = document.querySelectorAll('input[name="product-type"]');
    const variantsSection = document.getElementById('variants-section');
    const variantsContainer = document.getElementById('variants-container');
    const addVariantBtn = document.getElementById('add-variant-btn');

    // --- Mode-specific setup ---
    if (isEditMode) {
        pageTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Save Changes';
        // Load the product data into the form
        loadProductForEdit(db, collectionName, docId);
        // Disable ID field in edit mode
        productIdInput.disabled = true;
        productIdInput.classList.add('bg-gray-100');
    } else {
        pageTitle.textContent = 'Add New Product';
        submitBtn.textContent = 'Add Product';
        // Enable ID field in add mode
        productIdInput.disabled = false;
        productIdInput.classList.remove('bg-gray-100');
    }

    // Toggle for Retail vs. Custom
    productTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'retail') {
                variantsSection.classList.remove('hidden');
                if (variantsContainer.childElementCount === 0) {
                    addVariantRow();
                }
            } else {
                variantsSection.classList.add('hidden');
            }
        });
    });

    // Add new size/stock row
    addVariantBtn.addEventListener('click', () => addVariantRow()); // Pass no params

    // --- FUNCTIONS (hoisted) ---

    async function loadProductForEdit(db, collection, id) {
        try {
            const doc = await db.collection(collection).doc(id).get();
            if (!doc.exists) {
                alert('Error: Product not found.');
                return;
            }
            const product = doc.data();

            // Populate common fields
            productIdInput.value = id; // Load the doc ID
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-image').value = product.image_url;
            document.getElementById('product-category').value = product.category || product.collection_name;
            document.getElementById('product-description').value = product.description;

            // Set the correct radio button
            const productType = collection === 'products' ? 'retail' : 'custom';
            document.querySelector(`input[name="product-type"][value="${productType}"]`).checked = true;
            
            // Disable radio buttons in edit mode to prevent changing collection
            productTypeRadios.forEach(radio => radio.disabled = true);

            // Populate variants if it's a retail product
            if (productType === 'retail') {
                variantsSection.classList.remove('hidden');
                variantsContainer.innerHTML = ''; // Clear any empty rows
                if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                        addVariantRow(variant.size, variant.stock);
                    });
                }
            }
        } catch (error) {
            console.error("Error loading product for edit:", error);
            alert('Could not load product data.');
        }
    }

    function addVariantRow(size = '', stock = '') {
        const rowId = `variant-${variantsContainer.childElementCount}`;
        const row = document.createElement('div');
        row.id = rowId;
        row.className = "flex items-center space-x-2";
        row.innerHTML = `
            <input type="text" placeholder="Size (e.g., M)" class="form-input w-1/3 variant-size" value="${size}">
            <input type="number" placeholder="Stock" class="form-input w-1/3 variant-stock" value="${stock}">
            <button type="button" data-remove="${rowId}" class="button-danger remove-variant-btn">
                <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        variantsContainer.appendChild(row);
        feather.replace(); // Redraw icons

        // Add listener to the new remove button
        row.querySelector('.remove-variant-btn').addEventListener('click', (e) => {
            const rowToRemove = document.getElementById(e.currentTarget.dataset.remove);
            if (rowToRemove) {
                rowToRemove.remove();
            }
        });
    }

    // Handle Form Submit (Handles BOTH Add and Edit)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        // --- NEW: Get the ID from the form ---
        const newDocId = document.getElementById('product-id').value;
        if (!newDocId) {
            alert('Product ID is required.');
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? 'Save Changes' : 'Add Product';
            return;
        }

        const productType = form.querySelector('input[name="product-type"]:checked').value;
        const productName = document.getElementById('product-name').value;
        const productPrice = parseFloat(document.getElementById('product-price').value);
        const imageUrl = document.getElementById('product-image').value;
        const category = document.getElementById('product-category').value;
        const description = document.getElementById('product-description').value;

        let data = {
            name: productName,
            price: productPrice,
            image_url: imageUrl,
            description: description,
            category: category, 
            collection_name: category,
        };

        let collectionToSaveTo = '';

        if (productType === 'retail') {
            collectionToSaveTo = 'products';
            data.variants = [];
            const variantRows = variantsContainer.querySelectorAll('.flex');
            variantRows.forEach(row => {
                const size = row.querySelector('.variant-size').value;
                const stock = parseInt(row.querySelector('.variant-stock').value);
                if (size && !isNaN(stock)) {
                    data.variants.push({ size: size, stock: stock });
                }
            });

            if (data.variants.length === 0) {
                alert('Please add at least one size variant for retail products.');
                submitBtn.disabled = false;
                submitBtn.textContent = isEditMode ? 'Save Changes' : 'Add Product';
                return;
            }

        } else {
            collectionToSaveTo = 'custom_styles';
        }

        try {
            // --- UPDATED LOGIC ---
            // We now *always* use .doc(ID).set()
            // For editing, it overwrites the doc.
            // For adding, it creates a new doc with the specified ID.
            const docRef = db.collection(collectionToSaveTo).doc(newDocId);
            await docRef.set(data, { merge: true }); // merge:true is safer, especially for edits
            
            // Show success message
            const successMsg = document.getElementById('success-message');
            successMsg.textContent = isEditMode ? 'Product updated successfully!' : 'Product added successfully!';
            successMsg.classList.remove('hidden');
            
            if (!isEditMode) {
                form.reset(); // Clear the form only if ADDING new
                variantsContainer.innerHTML = '';
                variantsSection.classList.add('hidden');
            } else {
                // If editing, redirect to the product list to see changes
                setTimeout(() => {
                    window.location.href = 'admin-products.html';
                }, 2000);
            }

            setTimeout(() => {
                successMsg.classList.add('hidden');
            }, 3000);

        } catch (error) {
            console.error("Error saving product: ", error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? 'Save Changes' : 'Add Product';
        }
    });
}
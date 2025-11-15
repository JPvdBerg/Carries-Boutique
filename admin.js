// --- AUTHENTICATION & SECURITY GUARD ---
document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const currentPage = document.body.id;
    
    // --- IMAGE UPLOAD & PREVIEW LOGIC ---
    const fileInput = document.getElementById('file-upload');
    const progressBarContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const urlInput = document.getElementById('product-image');
    const previewContainer = document.getElementById('preview-container'); 
    const previewImg = document.getElementById('image-preview');       

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Show Local Preview Immediately
            const objectUrl = URL.createObjectURL(file);
            if (previewImg && previewContainer) {
                previewImg.src = objectUrl;
                previewContainer.classList.remove('hidden');
            }

            // --- NEW: Generate a unique name without the file extension ---
            const baseName = file.name.split('.').slice(0, -1).join('.');
            const uniqueID = Date.now() + '_' + baseName;
            const storageRef = firebase.storage().ref('products/' + uniqueID);
            
            const uploadTask = storageRef.put(file);

            // 3. UI Updates
            const submitBtn = document.getElementById('submit-product-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading...';
            }
            if (progressBarContainer) progressBarContainer.classList.remove('hidden');

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressBar) progressBar.style.width = progress + '%';
                }, 
                (error) => {
                    console.error("Upload failed:", error);
                    alert("Upload failed: " + error.message);
                    if (submitBtn) submitBtn.disabled = false;
                }, 
                // --- SUCCESS: Save the new .webp URL ---
                () => {
                    // 1. Construct the FINAL path, assuming Cloud Function succeeded
                    const finalWebpPath = 'products/' + uniqueID + '.webp';
                    
                    // 2. Construct the full Download URL
                    const bucketName = uploadTask.snapshot.ref.bucket;
                    const encodedPath = encodeURIComponent(finalWebpPath);
                    const finalURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;

                    if (urlInput) urlInput.value = finalURL;
                    if (submitBtn) {
                        const params = new URLSearchParams(window.location.search);
                        const isEdit = params.get('id') && params.get('collection');
                        submitBtn.textContent = isEdit ? 'Save Changes' : 'Add Product';
                        submitBtn.disabled = false;
                    }
                    if (progressBar) progressBar.classList.add('bg-green-500');
                }
            );
        });
    }
    
    // Logout Logic
    const logoutButtons = document.querySelectorAll('#logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out.');
                window.location.href = 'index.html'; 
            }).catch(error => {
                console.error('Sign out error:', error);
            });
        });
    });

    // Auth Check
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const adminRef = db.collection('admins').doc(user.uid);
                const adminDoc = await adminRef.get();

                if (adminDoc.exists) {
                    console.log('Admin access granted.');
                    if (currentPage === 'login-page') {
                        window.location.href = 'admin.html';
                    } else {
                        initializeApp(db, user);
                    }
                } else {
                    console.warn('Access Denied.');
                    alert('You do not have permission to access this page.');
                    auth.signOut();
                    window.location.href = 'index.html'; 
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                auth.signOut();
                window.location.href = 'index.html'; 
            }
        } else {
            if (currentPage !== 'login-page') {
                window.location.href = 'admin-login.html';
            } else {
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
        });
    }
}

function initializeApp(db, user) {
    const currentPage = document.body.id;

    if (currentPage === 'dashboard-page') {
        loadOrders(db);
    } else if (currentPage === 'add-product-page') {
        setupAddProductForm(db);
    } else if (currentPage === 'manage-products-page') { 
        loadProductList(db);
    }
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// --- ORDER DASHBOARD LOGIC ---
function loadOrders(db) {
    const orderListEl = document.getElementById('order-list');
    if (!orderListEl) return;

    db.collection('orders').orderBy('order_date', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            orderListEl.innerHTML = '<p class="p-6 text-gray-500">No orders found.</p>';
            return;
        }

        orderListEl.innerHTML = ''; 
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            orderListEl.innerHTML += createOrderCard(orderId, order);
        });

        attachOrderListeners(db);
        if (typeof feather !== 'undefined') feather.replace();

    }, error => {
        console.error("Error loading orders: ", error);
        orderListEl.innerHTML = '<p class="p-6 text-red-500">Error loading orders.</p>';
    });
}

function createOrderCard(orderId, order) {
    const date = order.order_date && order.order_date.toDate ? order.order_date.toDate().toLocaleDateString('en-ZA') : 'Invalid Date';
    
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

    const measurementsHtml = order.cart.map(item => {
        if (!item.measurements) return '';
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

    const statusOptions = ['Pending', 'Busy', 'Complete'].map(s => 
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
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <select data-id="${orderId}" class="status-select status-updater mt-1">
                        ${statusOptions}
                    </select>
                </div>
            </div>
        </div>
    </div>
    `;
}

function attachOrderListeners(db) {
    document.querySelectorAll('.status-updater').forEach(select => {
        select.addEventListener('change', (e) => {
            db.collection('orders').doc(e.target.dataset.id).update({ status: e.target.value });
        });
    });
}

// --- MANAGE PRODUCTS PAGE LOGIC ---
async function loadProductList(db) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    
    container.innerHTML = '<p class="p-6 text-gray-500">Loading products...</p>';

    try {
        const [productsSnap, stylesSnap] = await Promise.all([
            db.collection('products').get(),
            db.collection('custom_styles').get()
        ]);

        let allProducts = [];
        productsSnap.forEach(doc => allProducts.push({ id: doc.id, collection: 'products', ...doc.data() }));
        stylesSnap.forEach(doc => allProducts.push({ id: doc.id, collection: 'custom_styles', ...doc.data() }));

        if (allProducts.length === 0) {
            container.innerHTML = '<p class="p-6 text-gray-500">No products found.</p>';
            return;
        }
        
        allProducts.sort((a, b) => a.name.localeCompare(b.name));
        container.innerHTML = ''; 

        allProducts.forEach(product => {
            const productType = product.collection === 'products' ? 'Retail' : 'Custom';
            const productTypeColor = product.collection === 'products' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';

            container.innerHTML += `
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 gap-4">
                    <div class="flex items-center w-full sm:w-auto">
                        <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg mr-4 flex-shrink-0">
                        <div>
                            <p class="font-bold text-lg text-gray-900">${product.name}</p>
                            <p class="text-sm text-gray-600">R${product.price.toFixed(2)}</p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productTypeColor} mt-1">
                                ${productType}
                            </span>
                        </div>
                    </div>
                    <div class="flex space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <a href="admin-add-product.html?collection=${product.collection}&id=${product.id}" 
                           class="flex-1 sm:flex-none text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition">
                           Edit
                        </a>
                        <button data-collection="${product.collection}" data-id="${product.id}" 
                                class="flex-1 sm:flex-none delete-product-btn bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 border border-red-200 transition">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

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
            if (confirm('Are you sure you want to delete this product?')) {
                try {
                    await db.collection(collection).doc(id).delete();
                    loadProductList(db); 
                } catch (error) {
                    console.error("Error deleting product:", error);
                    alert('Could not delete product.');
                }
            }
        });
    });
}

// --- ADD/EDIT PRODUCT PAGE LOGIC ---
function setupAddProductForm(db) {
    const form = document.getElementById('add-product-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');
    const collectionName = params.get('collection');
    const isEditMode = docId && collectionName;

    const pageTitle = document.getElementById('page-title');
    const submitBtn = document.getElementById('submit-product-btn');
    const productIdInput = document.getElementById('product-id'); 
    const productTypeRadios = document.querySelectorAll('input[name="product-type"]');
    const variantsSection = document.getElementById('variants-section');
    const variantsContainer = document.getElementById('variants-container');
    const addVariantBtn = document.getElementById('add-variant-btn');

    // --- NEW: AUTO ID GENERATOR ---
    async function generateNextId() {
        try {
            const [productsSnap, stylesSnap] = await Promise.all([
                db.collection('products').get(),
                db.collection('custom_styles').get()
            ]);

            let maxId = 0;
            const checkMax = (id) => {
                if (id && id.startsWith('prod_')) {
                    const parts = id.split('_');
                    const num = parseInt(parts[1]);
                    if (!isNaN(num) && num > maxId) {
                        maxId = num;
                    }
                };
            }

            productsSnap.forEach(doc => checkMax(doc.id));
            stylesSnap.forEach(doc => checkMax(doc.id));

            // Increment and format: prod_001, prod_002...
            const nextNum = maxId + 1;
            const nextId = `prod_${String(nextNum).padStart(3, '0')}`;
            console.log("Generated ID:", nextId);
            return nextId;

        } catch (error) {
            console.error("Error generating ID:", error);
            return `prod_${Date.now()}`;
        }
    }

    if (isEditMode) {
        pageTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Save Changes';
        loadProductForEdit(db, collectionName, docId);
        productIdInput.disabled = true; // Lock ID on edit
    } else {
        pageTitle.textContent = 'Add New Product';
        submitBtn.textContent = 'Add Product';
        // Generate ID immediately for new products
        generateNextId().then(id => {
            productIdInput.value = id;
        });
    }

    // --- AUTO SIZES LOGIC ---
    productTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'retail') {
                variantsSection.classList.remove('hidden');
                // If list is empty, Auto-Fill S, M, L, XL
                if (variantsContainer.childElementCount === 0) {
                    ['S', 'M', 'L', 'XL'].forEach(size => addVariantRow(size, 1));
                }
            } else {
                variantsSection.classList.add('hidden');
            }
        });
    });

    addVariantBtn.addEventListener('click', () => addVariantRow());

    async function loadProductForEdit(db, collection, id) {
        try {
            const doc = await db.collection(collection).doc(id).get();
            if (!doc.exists) {
                alert('Error: Product not found.');
                return;
            }
            const product = doc.data();

            productIdInput.value = id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-image').value = product.image_url;
            document.getElementById('product-category').value = product.category || product.collection_name;
            document.getElementById('product-description').value = product.description;

            const productType = collection === 'products' ? 'retail' : 'custom';
            document.querySelector(`input[name="product-type"][value="${productType}"]`).checked = true;
            
            // Disable radio buttons in edit mode
            productTypeRadios.forEach(radio => radio.disabled = true);

            if (productType === 'retail') {
                variantsSection.classList.remove('hidden');
                variantsContainer.innerHTML = '';
                if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                        addVariantRow(variant.size, variant.stock);
                    });
                }
            }

            // Show preview if editing
            if (product.image_url) {
                const previewContainer = document.getElementById('preview-container');
                const previewImg = document.getElementById('image-preview');
                if (previewContainer && previewImg) {
                    previewImg.src = product.image_url;
                    previewContainer.classList.remove('hidden');
                }
            }

        } catch (error) {
            console.error("Error loading product for edit:", error);
            alert('Could not load product data.');
        }
    }

    function addVariantRow(size = '', stock = '') {
        const rowId = `variant-${Math.random().toString(36).substr(2, 9)}`;
        const row = document.createElement('div');
        row.id = rowId;
        row.className = "flex items-center space-x-2";
        row.innerHTML = `
            <input type="text" placeholder="Size" class="form-input w-1/3 variant-size" value="${size}">
            <input type="number" placeholder="Stock" class="form-input w-1/3 variant-stock" value="${stock}">
            <button type="button" class="button-danger remove-variant-btn">
                <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        variantsContainer.appendChild(row);
        feather.replace();

        row.querySelector('.remove-variant-btn').addEventListener('click', (e) => {
            const rowToRemove = document.getElementById(e.currentTarget.dataset.remove);
            if (rowToRemove) rowToRemove.remove();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const newDocId = document.getElementById('product-id').value;
        if (!newDocId) {
            alert('Product ID missing. Please refresh page.');
            submitBtn.disabled = false;
            return;
        }

        const productType = form.querySelector('input[name="product-type"]:checked').value;
        
        let data = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            image_url: document.getElementById('product-image').value,
            description: document.getElementById('product-description').value,
            category: document.getElementById('product-category').value,
            collection_name: document.getElementById('product-category').value,
        };

        let collectionToSaveTo = productType === 'retail' ? 'products' : 'custom_styles';

        if (productType === 'retail') {
            data.variants = [];
            variantsContainer.querySelectorAll('.flex').forEach(row => {
                const size = row.querySelector('.variant-size').value;
                const stock = parseInt(row.querySelector('.variant-stock').value);
                if (size) {
                    data.variants.push({ size, stock: isNaN(stock) ? 0 : stock });
                }
            });

            if (data.variants.length === 0) {
                alert('Retail products need at least one size.');
                submitBtn.disabled = false;
                submitBtn.textContent = isEditMode ? 'Save Changes' : 'Add Product';
                return;
            }
        }

        try {
            await db.collection(collectionToSaveTo).doc(newDocId).set(data, { merge: true });
            
            const successMsg = document.getElementById('success-message');
            successMsg.textContent = isEditMode ? 'Product updated!' : 'Product added!';
            successMsg.classList.remove('hidden');
            
            if (!isEditMode) {
                form.reset(); 
                variantsContainer.innerHTML = '';
                variantsSection.classList.add('hidden');
                const previewContainer = document.getElementById('preview-container');
                const previewImg = document.getElementById('image-preview');
                if (previewContainer) previewContainer.classList.add('hidden');
                if (previewImg) previewImg.src = "";
                
                // Reset checkbox to custom (default)
                document.querySelector(`input[name="product-type"][value="custom"]`).checked = true;

                // GENERATE NEXT ID AGAIN
                generateNextId().then(id => {
                    productIdInput.value = id;
                });

            } else {
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
/**
 * Project Blockify - Main JavaScript Application
 * LEGO E-commerce Platform with AJAX functionality
 */

class BlockifyApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentUser = null;
        this.cart = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadUserFromToken();
        this.updateCartDisplay();
        this.initializePage();
    }

    /**
     * Bind global event listeners
     */
    bindEvents() {
        // Navigation toggle for mobile
        document.addEventListener('click', (e) => {
            if (e.target.matches('.navbar-toggler')) {
                this.toggleMobileMenu();
            }
        });

        // Search form submission
        const searchForm = document.querySelector('#searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Cart icon click
        const cartIcon = document.querySelector('#cartIcon');
        if (cartIcon) {
            cartIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCart();
            });
        }

        // Generic AJAX form handler
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.ajax-form')) {
                e.preventDefault();
                this.handleAjaxForm(e.target);
            }
        });

        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-add-cart') || e.target.closest('.btn-add-cart')) {
                e.preventDefault();
                const button = e.target.closest('.btn-add-cart') || e.target;
                this.addToCart(button);
            }
        });
    }

    /**
     * Initialize page-specific functionality
     */
    initializePage() {
        const page = this.getCurrentPage();
        
        switch (page) {
            case 'home':
                this.initHomePage();
                break;
            case 'products':
                this.initProductsPage();
                break;
            case 'product-detail':
                this.initProductDetailPage();
                break;
            case 'cart':
                this.initCartPage();
                break;
            case 'login':
                this.initAuthPages();
                break;
            case 'register':
                this.initAuthPages();
                break;
            default:
                console.log('No specific initialization for page:', page);
        }
    }

    /**
     * Get current page identifier
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        
        if (filename === 'index.html' || filename === '') return 'home';
        if (filename === 'products.html') return 'products';
        if (filename === 'product-detail.html') return 'product-detail';
        if (filename === 'cart.html') return 'cart';
        if (filename === 'login.html') return 'login';
        if (filename === 'register.html') return 'register';
        
        return filename.replace('.html', '');
    }

    /**
     * Make AJAX requests with proper error handling
     */
    async makeRequest(url, options = {}) {
        try {
            const token = localStorage.getItem('blockify_token');
            
            const defaultHeaders = {
                'Content-Type': 'application/json',
            };

            if (token) {
                defaultHeaders.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(`${this.apiBaseUrl}${url}`, {
                headers: { ...defaultHeaders, ...options.headers },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            this.showNotification(error.message || 'Network error occurred', 'error');
            throw error;
        }
    }

    /**
     * Load user data from stored token
     */
    async loadUserFromToken() {
        const token = localStorage.getItem('blockify_token');
        
        if (!token) {
            this.updateAuthUI(false);
            return;
        }

        try {
            const response = await this.makeRequest('/auth/profile');
            this.currentUser = response.data;
            this.updateAuthUI(true);
        } catch (error) {
            // Token might be expired
            localStorage.removeItem('blockify_token');
            this.updateAuthUI(false);
        }
    }

    /**
     * Update authentication UI elements
     */
    updateAuthUI(isLoggedIn) {
        const authElements = document.querySelectorAll('[data-auth]');
        
        authElements.forEach(element => {
            const authType = element.dataset.auth;
            
            if (authType === 'logged-in' && isLoggedIn) {
                element.style.display = 'block';
            } else if (authType === 'logged-out' && !isLoggedIn) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });

        // Update user name if logged in
        if (isLoggedIn && this.currentUser) {
            const userNameElements = document.querySelectorAll('[data-user-name]');
            userNameElements.forEach(element => {
                element.textContent = this.currentUser.full_name || this.currentUser.email;
            });
        }
    }

    /**
     * Handle search functionality
     */
    async handleSearch() {
        const searchInput = document.querySelector('#searchInput');
        const query = searchInput.value.trim();

        if (!query) {
            this.showNotification('Please enter a search term', 'warning');
            return;
        }

        // Redirect to products page with search query
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
    }

    /**
     * Add product to cart
     */
    async addToCart(button) {
        const productId = button.dataset.productId;
        const quantity = parseInt(button.dataset.quantity || '1');

        if (!this.currentUser) {
            this.showNotification('Please login to add items to cart', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Adding...';
        button.disabled = true;

        try {
            await this.makeRequest('/cart/add', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            this.showNotification('Product added to cart successfully!', 'success');
            this.updateCartDisplay();
            
            // Reset button
            button.textContent = originalText;
            button.disabled = false;
        } catch (error) {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    /**
     * Update cart display in navigation
     */
    async updateCartDisplay() {
        if (!this.currentUser) return;

        try {
            const response = await this.makeRequest('/cart/count');
            const count = response.data.count;

            const cartBadge = document.querySelector('#cartBadge');
            if (cartBadge) {
                cartBadge.textContent = count;
                cartBadge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            // Silently handle cart count errors
            console.error('Error updating cart count:', error);
        }
    }

    /**
     * Show cart modal or redirect to cart page
     */
    showCart() {
        window.location.href = 'cart.html';
    }

    /**
     * Toggle mobile navigation menu
     */
    toggleMobileMenu() {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse) {
            navbarCollapse.classList.toggle('show');
        }
    }

    /**
     * Handle generic AJAX form submissions
     */
    async handleAjaxForm(form) {
        const formData = new FormData(form);
        const jsonData = {};
        
        for (let [key, value] of formData.entries()) {
            jsonData[key] = value;
        }

        const url = form.dataset.url || form.action;
        const method = form.dataset.method || form.method || 'POST';

        try {
            const response = await this.makeRequest(url.replace(this.apiBaseUrl, ''), {
                method: method.toUpperCase(),
                body: JSON.stringify(jsonData)
            });

            this.showNotification(response.message || 'Success!', 'success');
            
            // Handle form-specific success actions
            if (form.dataset.onSuccess) {
                this.handleFormSuccess(form.dataset.onSuccess, response);
            }
        } catch (error) {
            // Error already handled in makeRequest
        }
    }

    /**
     * Handle form success actions
     */
    handleFormSuccess(action, response) {
        switch (action) {
            case 'login':
                if (response.data.token) {
                    localStorage.setItem('blockify_token', response.data.token);
                    this.currentUser = response.data.user;
                    this.updateAuthUI(true);
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
                break;
            case 'register':
                if (response.data.token) {
                    localStorage.setItem('blockify_token', response.data.token);
                    this.currentUser = response.data.user;
                    this.updateAuthUI(true);
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
                break;
            case 'redirect':
                const redirectUrl = response.redirect || 'index.html';
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
                break;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Get Bootstrap alert class for notification type
     */
    getBootstrapAlertClass(type) {
        const classMap = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return classMap[type] || 'info';
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.makeRequest('/auth/logout', { method: 'POST' });
        } catch (error) {
            // Continue with logout even if API call fails
        }

        localStorage.removeItem('blockify_token');
        this.currentUser = null;
        this.updateAuthUI(false);
        this.showNotification('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    // Page-specific initialization methods
    initHomePage() {
        this.loadFeaturedProducts();
        this.loadCategories();
    }

    async loadFeaturedProducts() {
        try {
            const response = await this.makeRequest('/products/featured');
            this.renderProducts(response.data, '#featuredProducts');
        } catch (error) {
            console.error('Error loading featured products:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await this.makeRequest('/categories/root');
            this.renderCategories(response.data, '#categoriesContainer');
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderProducts(products, container) {
        const element = document.querySelector(container);
        if (!element) return;

        element.innerHTML = products.map(product => `
            <div class="col-md-3 mb-4">
                <div class="card product-card h-100">
                    <img src="${product.images[0] || '/images/placeholder-product.png'}" 
                         class="card-img-top product-image" 
                         alt="${product.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">
                            <a href="product-detail.html?id=${product.id}" class="product-title">
                                ${product.name}
                            </a>
                        </h5>
                        <p class="card-text flex-grow-1">${product.short_description || ''}</p>
                        <div class="mt-auto">
                            <div class="mb-2">
                                ${product.sale_price ? 
                                    `<span class="product-sale-price me-2">$${product.price}</span>
                                     <span class="product-price">$${product.sale_price}</span>` :
                                    `<span class="product-price">$${product.price}</span>`
                                }
                            </div>
                            <button class="btn btn-lego btn-add-cart w-100" 
                                    data-product-id="${product.id}">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCategories(categories, container) {
        const element = document.querySelector(container);
        if (!element) return;

        element.innerHTML = categories.map(category => `
            <div class="col-md-3 mb-3">
                <a href="products.html?category=${category.id}" 
                   class="category-card"
                   style="background-image: url('${category.image_url || '/images/placeholder-category.png'}')">
                    <div class="category-overlay">
                        <h5 class="category-title">${category.name}</h5>
                    </div>
                </a>
            </div>
        `).join('');
    }

    initProductsPage() {
        this.loadProducts();
        this.initFilters();
    }

    initProductDetailPage() {
        this.loadProductDetail();
    }

    initCartPage() {
        this.loadCart();
    }

    initAuthPages() {
        // Auth pages are handled by generic form handler
    }

    async loadProducts() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlParams.entries());

        try {
            const response = await this.makeRequest('/products?' + new URLSearchParams(params));
            this.renderProducts(response.data, '#productsContainer');
            this.renderPagination(response.pagination, '#paginationContainer');
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderPagination(pagination, container) {
        const element = document.querySelector(container);
        if (!element || !pagination) return;

        const { page, totalPages, hasNext, hasPrev } = pagination;
        
        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${!hasPrev ? 'disabled' : ''}">
                <a class="page-link" href="?${this.updateUrlParam('page', page - 1)}">Previous</a>
            </li>
        `;
        
        // Page numbers (simplified - show current and nearby pages)
        for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="?${this.updateUrlParam('page', i)}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${!hasNext ? 'disabled' : ''}">
                <a class="page-link" href="?${this.updateUrlParam('page', page + 1)}">Next</a>
            </li>
        `;
        
        paginationHTML += '</ul></nav>';
        element.innerHTML = paginationHTML;
    }

    updateUrlParam(param, value) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set(param, value);
        return urlParams.toString();
    }

    initFilters() {
        // Initialize product filters
        const filterForm = document.querySelector('#filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        const form = document.querySelector('#filterForm');
        const formData = new FormData(form);
        const params = new URLSearchParams();
        
        for (let [key, value] of formData.entries()) {
            if (value) {
                params.set(key, value);
            }
        }
        
        window.location.search = params.toString();
    }

    async loadProductDetail() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            this.showNotification('Product not found', 'error');
            return;
        }

        try {
            const response = await this.makeRequest(`/products/${productId}`);
            this.renderProductDetail(response.data);
        } catch (error) {
            this.showNotification('Product not found', 'error');
        }
    }

    renderProductDetail(product) {
        // This would be implemented based on the specific product detail page structure
        console.log('Rendering product detail:', product);
    }

    async loadCart() {
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await this.makeRequest('/cart');
            this.renderCartItems(response.data);
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    }

    renderCartItems(cart) {
        // This would be implemented based on the specific cart page structure
        console.log('Rendering cart:', cart);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blockifyApp = new BlockifyApp();
});

// Global logout function for navigation
function logout() {
    if (window.blockifyApp) {
        window.blockifyApp.logout();
    }
}
// Project Blockify - Main JavaScript File

class BlockifyApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.cartItems = this.loadCart();
        this.init();
    }

    init() {
        console.log('🧱 Project Blockify initialized');
        this.updateCartBadge();
        this.bindEvents();
        this.checkApiHealth();
    }

    bindEvents() {
        // Shop Now button
        const shopButton = document.querySelector('.btn-warning');
        if (shopButton) {
            shopButton.addEventListener('click', () => {
                this.showMessage('🛍️ Shop functionality coming soon!', 'info');
            });
        }

        // Featured Sets button
        const featuredButton = document.querySelector('.btn-outline-light');
        if (featuredButton) {
            featuredButton.addEventListener('click', () => {
                this.showMessage('⭐ Featured sets will be displayed here!', 'info');
            });
        }

        // Cart icon
        const cartIcon = document.querySelector('#navbarNav .nav-link[href="#cart"]');
        if (cartIcon) {
            cartIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCart();
            });
        }
    }

    async checkApiHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl.replace('/api', '')}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ API Health:', data);
                this.showMessage('🚀 Connected to backend API', 'success');
            }
        } catch (error) {
            console.warn('⚠️ API not available:', error.message);
            this.showMessage('⚠️ Backend API not available - demo mode', 'warning');
        }
    }

    loadCart() {
        const stored = localStorage.getItem('blockify_cart');
        return stored ? JSON.parse(stored) : [];
    }

    saveCart() {
        localStorage.setItem('blockify_cart', JSON.stringify(this.cartItems));
        this.updateCartBadge();
    }

    updateCartBadge() {
        const badge = document.querySelector('.navbar .badge');
        if (badge) {
            const totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'inline' : 'none';
        }
    }

    addToCart(product) {
        const existingItem = this.cartItems.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cartItems.push({ ...product, quantity: 1 });
        }
        this.saveCart();
        this.showMessage(`✅ ${product.name} added to cart!`, 'success');
    }

    showCart() {
        if (this.cartItems.length === 0) {
            this.showMessage('🛒 Your cart is empty', 'info');
            return;
        }

        const cartHtml = this.cartItems.map(item => 
            `<div class="d-flex justify-content-between align-items-center mb-2">
                <span>${item.name}</span>
                <span class="badge bg-primary">${item.quantity}</span>
            </div>`
        ).join('');

        const modalHtml = `
            <div class="modal fade" id="cartModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🛒 Your Cart</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${cartHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary">Checkout</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('cartModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('cartModal'));
        modal.show();
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'danger' : 'primary'} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Add toast
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blockifyApp = new BlockifyApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockifyApp;
}
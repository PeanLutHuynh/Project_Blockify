/**
 * CartController - MVC Controller for Cart Page
 * Following rule.md: MVC + OOP architecture
 */

import { cartService } from '../../core/services/CartService.js';
import { CartItem } from '../../core/models/Cart.js';
import { updateCartBadge } from '../../core/config/init.js';
import { toastStore } from '../../core/services/index.js';

export class CartController {
  private cartTableBody: HTMLElement | null = null;
  private totalCostElement: HTMLElement | null = null;
  private purchaseButton: HTMLButtonElement | null = null;
  private emptyCartMessage: HTMLElement | null = null;
  private selectAllCheckbox: HTMLInputElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.initializeElements();
    this.attachEventListeners();
    this.renderCart();
  }


  private initializeElements(): void {
    this.cartTableBody = document.getElementById('cart-table-body');
    this.totalCostElement = document.getElementById('total-cost');
    this.purchaseButton = document.getElementById('purchase-button') as HTMLButtonElement;
    this.emptyCartMessage = document.getElementById('empty-cart-message');
    this.selectAllCheckbox = document.getElementById('select-all') as HTMLInputElement;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Select all checkbox
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
    }

    // Purchase button
    if (this.purchaseButton) {
      this.purchaseButton.addEventListener('click', () => this.handlePurchase());
    }

    // Clear cart button (if exists)
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => this.handleClearCart());
    }
  }

  /**
   * Render cart items
   */
  renderCart(): void {
    if (!this.cartTableBody) return;

    const items = cartService.getItems();

    // Clear existing content
    this.cartTableBody.innerHTML = '';

    if (items.length === 0) {
      this.showEmptyCart();
      updateCartBadge(); // Update badge when cart is empty
      return;
    }

    this.hideEmptyCart();

    // Render each cart item
    items.forEach(item => {
      const row = this.createCartItemRow(item);
      this.cartTableBody!.appendChild(row);
    });

    // Update total cost
    this.updateTotalCost();

    // Update purchase button state
    this.updatePurchaseButton();
    
    // Update cart badge
    updateCartBadge();
  }

  /**
   * Normalize image URL (handle relative paths from backend)
   */
  private normalizeImageUrl(url: string): string {
    // If it's a placeholder URL from via.placeholder.com, return as-is
    if (url.includes('via.placeholder.com') || url.includes('placeholder.com')) {
      return url;
    }
    
    // If it's a full URL (starts with http/https), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL starts with /, it's a relative path - prepend frontend server
    if (url.startsWith('/')) {
      const frontendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3002'
        : 'https://blockify-vn.vercel.app';
      return `${frontendUrl}${url}`;
    }
    
    // Otherwise return as-is
    return url;
  }

  /**
   * Create cart item row
   */
  private createCartItemRow(item: CartItem): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.productId = item.productId.toString();

    const isSoldOut = item.isSoldOut();
    
    if (isSoldOut) {
      row.classList.add('sold-out');
    }

    // Checkbox column
    const checkboxCell = document.createElement('td');
    if (!isSoldOut) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('item-checkbox');
      checkbox.checked = item.selected; // ← Use item's selected state
      checkbox.addEventListener('change', (e) => {
        // Update item's selected state
        item.selected = (e.target as HTMLInputElement).checked;
        // Save to localStorage
        cartService.getCart().saveToLocalStorage('blockify_cart');
        // Update UI
        this.handleItemCheckChange();
      });
      checkboxCell.appendChild(checkbox);
    }
    row.appendChild(checkboxCell);

    // Product info column - Use normalized image URL
    const normalizedImageUrl = this.normalizeImageUrl(item.imageUrl);
    const productCell = document.createElement('td');
    
    // Use a simple SVG placeholder instead of external service
    const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZTBlMGUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    
    productCell.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${normalizedImageUrl}" alt="${item.productName}" class="product-thumbnail me-3" style="width: 60px; height: 60px; object-fit: cover;" onerror="this.src='${fallbackImage}'">
        <div>
          <div class="fw-bold">${item.productName}</div>
          ${isSoldOut ? '<span class="badge bg-danger ms-2">Hết hàng</span>' : ''}
        </div>
      </div>
    `;
    row.appendChild(productCell);

    // Unit price column
    const priceCell = document.createElement('td');
    if (item.hasSalePrice()) {
      priceCell.innerHTML = `
        <div>
          <span class="text-decoration-line-through text-muted">${item.formatPrice(item.price)}</span><br>
          <span class="text-danger fw-bold">${item.getFormattedEffectivePrice()}</span>
        </div>
      `;
    } else {
      priceCell.textContent = item.getFormattedEffectivePrice();
    }
    row.appendChild(priceCell);

    // Quantity column
    const quantityCell = document.createElement('td');
    if (isSoldOut) {
      quantityCell.innerHTML = '<span class="text-muted">Không khả dụng</span>';
    } else {
      quantityCell.innerHTML = `
        <div class="input-group" style="width: 120px;">
          <button class="btn btn-outline-secondary btn-sm decrease-qty" type="button">-</button>
          <input type="number" class="form-control form-control-sm text-center quantity-input" 
                 value="${item.quantity}" min="1" max="${item.stockQuantity - item.minStockLevel}" readonly>
          <button class="btn btn-outline-secondary btn-sm increase-qty" type="button">+</button>
        </div>
      `;

      // Attach quantity change events
      const decreaseBtn = quantityCell.querySelector('.decrease-qty');
      const increaseBtn = quantityCell.querySelector('.increase-qty');

      decreaseBtn?.addEventListener('click', () => this.handleDecreaseQuantity(item.productId));
      increaseBtn?.addEventListener('click', () => this.handleIncreaseQuantity(item.productId));
    }
    row.appendChild(quantityCell);

    // Total price column
    const totalCell = document.createElement('td');
    totalCell.classList.add('item-total');
    if (isSoldOut) {
      totalCell.innerHTML = '<span class="text-muted">0₫</span>';
    } else {
      totalCell.innerHTML = `<span class="text-danger fw-bold">${item.getFormattedTotalPrice()}</span>`;
    }
    row.appendChild(totalCell);

    // Actions column
    const actionsCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.title = 'Xóa';
    deleteBtn.addEventListener('click', () => this.handleRemoveItem(item.productId));
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    return row;
  }

  /**
   * Handle select all checkbox
   */
  private handleSelectAll(): void {
    const isChecked = this.selectAllCheckbox?.checked || false;
    const items = cartService.getItems();

    // Update all items' selected state
    items.forEach(item => {
      if (!item.isSoldOut()) {
        item.selected = isChecked;
      }
    });

    // Save to localStorage
    cartService.getCart().saveToLocalStorage('blockify_cart');

    // Update UI checkboxes
    const checkboxes = document.querySelectorAll('.item-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
    });

    this.updateTotalCost();
    this.updatePurchaseButton();
  }

  /**
   * Handle individual item checkbox change
   */
  private handleItemCheckChange(): void {
    this.updateTotalCost();
    this.updatePurchaseButton();

    // Update select all checkbox
    const checkboxes = document.querySelectorAll('.item-checkbox') as NodeListOf<HTMLInputElement>;
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.checked = checkedCount === checkboxes.length;
    }
  }

  /**
   * Handle increase quantity
   */
  private async handleIncreaseQuantity(productId: number): Promise<void> {
    const result = await cartService.increaseQuantity(productId);

    if (result.success) {
      this.renderCart();
      this.showToast('success', result.message);
    } else {
      this.showToast('error', result.message);
    }
  }

  /**
   * Handle decrease quantity
   */
  private async handleDecreaseQuantity(productId: number): Promise<void> {
    const result = await cartService.decreaseQuantity(productId);

    if (result.success) {
      this.renderCart();
      this.showToast('success', result.message);
    } else {
      this.showToast('error', result.message);
    }
  }

  /**
   * Handle remove item
   */
  private handleRemoveItem(productId: number): void {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      return;
    }

    const result = cartService.removeFromCart(productId);

    if (result.success) {
      this.renderCart();
      this.showToast('success', result.message);
    } else {
      this.showToast('error', result.message);
    }
  }

  /**
   * Handle clear cart
   */
  private async handleClearCart(): Promise<void> {
    if (!confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
      return;
    }

    const result = await cartService.clearCart();
    this.renderCart();
    
    if (result.success) {
      this.showToast('success', result.message);
    } else {
      this.showToast('error', result.message);
    }
  }

  /**
   * Handle purchase
   */
  private async handlePurchase(): Promise<void> {
    const selectedItems = this.getSelectedItems();

    if (selectedItems.length === 0) {
      this.showToast('warning', 'Vui lòng chọn sản phẩm để mua');
      return;
    }

    // Check if any selected item is sold out
    const hasSoldOut = selectedItems.some(item => item.isSoldOut());
    if (hasSoldOut) {
      this.showToast('error', 'Một số sản phẩm đã hết hàng. Vui lòng bỏ chọn hoặc xóa chúng.');
      return;
    }

    // Sync with backend to verify stock
    const syncResult = await cartService.syncWithBackend();
    if (!syncResult.success) {
      this.showToast('error', syncResult.message || 'Không thể kiểm tra tồn kho');
      return;
    }

    // Store selected items in sessionStorage for order page
    const selectedItemsData = selectedItems.map(item => item.toJSON());
    sessionStorage.setItem('checkoutItems', JSON.stringify(selectedItemsData));

    // Redirect to order page
    window.location.href = '/pages/OrderPage.html';
  }

  /**
   * Get selected items
   */
  private getSelectedItems(): CartItem[] {
    // Get all items from cart and filter by selected flag
    const items = cartService.getItems();
    return items.filter(item => item.selected && !item.isSoldOut());
  }

  /**
   * Update total cost display
   */
  private updateTotalCost(): void {
    if (!this.totalCostElement) return;

    const selectedItems = this.getSelectedItems();
    const total = selectedItems.reduce((sum, item) => sum + item.getTotalPrice(), 0);

    this.totalCostElement.textContent = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(total);
  }

  /**
   * Update purchase button state
   */
  private updatePurchaseButton(): void {
    if (!this.purchaseButton) return;

    const selectedItems = this.getSelectedItems();
    const hasPurchasable = selectedItems.length > 0 && selectedItems.every(item => !item.isSoldOut());

    this.purchaseButton.disabled = !hasPurchasable;
  }

  /**
   * Show empty cart message
   */
  private showEmptyCart(): void {
    if (this.emptyCartMessage) {
      this.emptyCartMessage.classList.remove('d-none');
    }

    if (this.totalCostElement) {
      this.totalCostElement.textContent = '0₫';
    }

    if (this.purchaseButton) {
      this.purchaseButton.disabled = true;
    }
  }

  /**
   * Hide empty cart message
   */
  private hideEmptyCart(): void {
    if (this.emptyCartMessage) {
      this.emptyCartMessage.classList.add('d-none');
    }
  }

  /**
   * Show toast notification
   */
  private showToast(type: 'success' | 'error' | 'warning', message: string): void {
    // Use toastStore for consistent notifications
    if (type === 'success') {
      toastStore.success('Thành công', message);
    } else if (type === 'error') {
      toastStore.error('Lỗi', message);
    } else {
      toastStore.warning('Cảnh báo', message);
    }
  }

  /**
   * Refresh cart (reload from service)
   */
  public refresh(): void {
    this.renderCart();
  }
}

// Import product service for real API calls
import { productService } from '../../core/services/ProductService.js';
import { Product } from '../../core/models/Product.js';
import { cartService } from '../../core/services/CartService.js';

/**
 * ProductController - MVC Controller
 * Handles product display on pages
 */
export class ProductController {
  private productService = productService;

  /**
   * Load and display products on home page
   */
  async loadHomePageProducts(): Promise<void> {
    try {
      // Load real products from Supabase via API
      this.showLoadingState();
      
      const result = await this.productService.searchProducts('lego');
      
      if (!result.success || result.products.length === 0) {
        this.showError('Không có sản phẩm');
        return;
      }
      
      this.renderMainProducts(result.products);
      
    } catch (error) {
      console.error('Error loading products:', error);
      this.showError('Không thể load sản phẩm');
    }
  }

  /**
   * Load products by category
   */
  async loadProductsByCategory(categoryId: string): Promise<void> {
    try {
      this.showLoadingState();
      
      const result = await this.productService.getProductsByCategory(categoryId);
      
      if (!result.success || result.products.length === 0) {
        this.showError('Không có sản phẩm trong danh mục này');
        return;
      }
      
      this.renderMainProducts(result.products);
      
    } catch (error) {
      console.error('Error loading products by category:', error);
      this.showError('Không thể load sản phẩm');
    }
  }

  /**
   * Render main product list
   */
  private renderMainProducts(products: Product[]): void {
    const mainProductList = document.getElementById("main-product-list");
    if (!mainProductList) return;

    mainProductList.innerHTML = '';

    products.forEach(product => {
      const productCard = this.createProductCardFromAPI(product);
      mainProductList.appendChild(productCard);
    });
  }

  /**
   * Create product card from API Product model
   */
  private createProductCardFromAPI(product: Product): HTMLElement {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-sm-6 mb-4';
    
    const effectivePrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    const hasSalePrice = product.salePrice && product.salePrice > 0 && product.salePrice < product.price;
    
    col.innerHTML = `
      <div class="product-card shadow-sm">
        <div class="product-image position-relative">
          <i class="bi bi-heart icon-heart"></i>
          <img src="${product.imageUrl || '/public/images/placeholder.jpg'}" 
               alt="${product.name}"
               style="width: 100%; height: 250px; object-fit: cover;">
          ${hasSalePrice ? '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Sale</span>' : ''}
        </div>
        <div class="product-info p-3">
          <div class="mb-2">
            <span class="${product.isSoldOut() ? 'text-danger' : 'text-success'}">
              <i class="bi bi-${product.isSoldOut() ? 'x-circle' : 'check-circle'}-fill"></i> 
              ${product.isSoldOut() ? 'Hết hàng' : 'Còn hàng'}
            </span>
            <span class="mx-2">|</span>
            <span class="text-muted">Mã: #${product.id}</span>
          </div>
        </div>
        <div class="divider"></div>
        <div class="product-title px-3 pt-2">${product.name}</div>
        <div class="product-description px-3 text-muted small" style="height: 60px; overflow: hidden;">
          ${product.description}
        </div>
        <div class="product-price px-3 py-2">
          ${hasSalePrice ? 
            `<span class="text-decoration-line-through text-muted me-2">${this.formatPrice(product.price)}</span>
             <span class="text-danger fw-bold">${this.formatPrice(effectivePrice)}</span>` 
            : this.formatPrice(product.price)
          }
        </div>
        <div class="px-3 pb-3">
          <button class="btn-cart w-100" 
                  data-product-id="${product.id}"
                  data-product-name="${product.name}"
                  data-product-slug="${product.slug}"
                  data-product-price="${product.price}"
                  data-product-sale-price="${product.salePrice || 0}"
                  data-product-image="${product.imageUrl}"
                  data-stock-quantity="${product.stockQuantity}"
                  data-min-stock-level="${product.minStockLevel}"
                  ${product.isSoldOut() ? 'disabled' : ''}>
            <i class="bi bi-cart-plus"></i> ${product.isSoldOut() ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    `;

    // Add click event to view details
    const card = col.querySelector('.product-card') as HTMLElement;
    card?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.btn-cart') && !target.closest('.icon-heart')) {
        this.viewProductDetailFromAPI(product);
      }
    });

    // Add click event for Add to Cart button
    const addToCartBtn = col.querySelector('.btn-cart');
    addToCartBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleAddToCart(addToCartBtn as HTMLButtonElement);
    });

    return col;
  }

  /**
   * Handle Add to Cart click
   */
  private async handleAddToCart(button: HTMLButtonElement): Promise<void> {
    try {
      const productId = parseInt(button.dataset.productId || '0');
      const productName = button.dataset.productName || '';
      const productSlug = button.dataset.productSlug || '';
      const price = parseFloat(button.dataset.productPrice || '0');
      const salePrice = parseFloat(button.dataset.productSalePrice || '0');
      const imageUrl = button.dataset.productImage || '';
      const stockQuantity = parseInt(button.dataset.stockQuantity || '0');
      const minStockLevel = parseInt(button.dataset.minStockLevel || '0');

      // Show loading
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm"></i> Đang thêm...';
      button.disabled = true;

      const result = await cartService.addToCart({
        productId,
        productName,
        productSlug,
        imageUrl,
        price,
        salePrice: salePrice > 0 ? salePrice : null,
        quantity: 1,
        stockQuantity,
        minStockLevel
      });

      button.disabled = false;

      if (result.success) {
        button.innerHTML = '<i class="bi bi-check-lg"></i> Đã thêm!';
        button.classList.add('btn-success');
        
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('btn-success');
        }, 2000);

        // Update cart badge if exists
        this.updateCartBadge();
        
        // Show notification
        this.showNotification('success', result.message);
      } else {
        button.innerHTML = originalText;
        this.showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      button.innerHTML = '<i class="bi bi-cart-plus"></i> Thêm vào giỏ';
      button.disabled = false;
      this.showNotification('error', 'Có lỗi xảy ra khi thêm sản phẩm');
    }
  }

  /**
   * Update cart badge
   */
  private updateCartBadge(): void {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const count = cartService.getTotalItemsCount();
      badge.textContent = count.toString();
      if (count > 0) {
        badge.classList.remove('d-none');
      }
    }
  }

  /**
   * Show notification
   */
  private showNotification(type: 'success' | 'error' | 'warning', message: string): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You can integrate with Bootstrap toast or custom notification system
  }

  /**
   * Navigate to product detail page from API Product
   */
  private viewProductDetailFromAPI(product: Product): void {
    // Navigate using product URL
    if (product.productUrl) {
      window.location.href = product.productUrl;
    } else {
      console.warn('Product URL not available');
    }
  }

  /**
   * Format price to VND
   */
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  /**
   * Show loading state
   */
  private showLoadingState(): void {
    const mainProductList = document.getElementById("main-product-list");
    if (!mainProductList) return;
    
    mainProductList.innerHTML = `
      <div class="col-12 text-center p-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Đang tải...</span>
        </div>
        <p class="mt-3 text-muted">Đang tải sản phẩm...</p>
      </div>
    `;
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const mainProductList = document.getElementById("main-product-list");
    if (mainProductList) {
      mainProductList.innerHTML = `
        <div class="col-12 text-center p-4">
          <i class="bi bi-exclamation-triangle fs-1 text-danger"></i>
          <p class="text-danger mt-3">${message}</p>
          <button class="btn btn-primary mt-2" onclick="location.reload()">
            Thử lại
          </button>
        </div>
      `;
    }
  }
}

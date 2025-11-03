// Import product service for real API calls
import { productService } from '../../core/services/ProductService.js';
import { Product } from '../../core/models/Product.js';

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
    
    col.innerHTML = `
      <div class="product-card shadow-sm">
        <div class="product-image position-relative">
          <i class="bi bi-heart icon-heart"></i>
          <img src="${product.imageUrl || '/public/images/img2.jpg'}" 
               alt="${product.name}"
               style="width: 100%; height: 250px; object-fit: cover;">
        </div>
        <div class="product-info p-3">
          <div class="mb-2">
            <span class="text-success">
              <i class="bi bi-check-circle-fill"></i> Còn hàng
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
        <div class="product-price px-3 py-2">${this.formatPrice(product.price)}</div>
        <div class="px-3 pb-3">
          <button class="btn-cart w-100" data-product-id="${product.id}">
            <i class="bi bi-cart-plus"></i> Thêm vào giỏ
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

    return col;
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

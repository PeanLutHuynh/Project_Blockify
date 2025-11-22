import { productService } from '../../core/services/ProductService.js';
import { Product } from '../../core/models/Product.js';

/**
 * SearchController - MVC Controller
 * UC3 - Thanh tìm kiếm
 * Handles search UI interactions and manages view updates
 * Follows MVC architecture pattern
 */
export class SearchController {
  private productService = productService;
  
  // DOM Elements
  private searchInput: HTMLInputElement | null = null;
  private overlay: HTMLElement | null = null;
  private openSearchBtn: HTMLElement | null = null;
  private closeSearchBtn: HTMLElement | null = null;
  private suggestionContainer: HTMLElement | null = null;
  
  // State
  private debounceTimer: number | null = null;
  private currentQuery: string = '';

  constructor() {
    this.initializeElements();
    this.clearHardcodedSuggestions();
    this.attachEventListeners();
  }

  /**
   * Remove hardcoded suggestions from HTML
   */
  private clearHardcodedSuggestions(): void {
    if (this.suggestionContainer) {
      const hardcodedSuggestions = this.suggestionContainer.querySelectorAll('.suggestion-box');
      hardcodedSuggestions.forEach(el => el.remove());
    }
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): void {
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.overlay = document.getElementById('overlay') as HTMLElement;
    this.openSearchBtn = document.getElementById('openSearch') as HTMLElement;
    this.closeSearchBtn = document.getElementById('closeSearch') as HTMLElement;
    this.suggestionContainer = this.overlay?.querySelector('.search-popup') as HTMLElement;

    if (!this.searchInput || !this.overlay) {
      console.warn('Search elements not found in DOM');
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.searchInput || !this.overlay) {
      return;
    }

    // Open search popup
    this.openSearchBtn?.addEventListener('click', () => {
      this.showSearchPopup();
    });

    // Close search popup
    this.closeSearchBtn?.addEventListener('click', () => {
      this.hideSearchPopup();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hideSearchPopup();
      }
    });

    // LUỒNG CHÍNH Bước 1: Người dùng nhập từ khóa
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e);
    });

    // LUỒNG CHÍNH Bước 2: Người dùng nhấn Enter
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearchSubmit();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideSearchPopup();
      }
    });
  }

  /**
   * Show search popup
   */
  private showSearchPopup(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.searchInput?.focus();
    }
  }

  /**
   * Hide search popup
   */
  private hideSearchPopup(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      if (this.searchInput) {
        this.searchInput.value = '';
      }
      this.clearSuggestions();
      this.currentQuery = '';
    }
  }

  /**
   * Handle search input with debouncing
   */
  private handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim();
    this.currentQuery = query;

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // LUỒNG THAY THẾ A1: Từ khóa rỗng
    if (query.length === 0) {
      this.clearSuggestions();
      return;
    }

    // Validate minimum length
    if (query.length < 2) {
      this.clearSuggestions();
      return;
    }

    // Debounce: wait 300ms after user stops typing
    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  /**
   * Handle search form submission
   */
  private async handleSearchSubmit(): Promise<void> {
    const query = this.searchInput?.value.trim() || '';

    if (query.length < 2) {
      this.showErrorMessage('Vui lòng nhập ít nhất 2 ký tự');
      return;
    }

    await this.performSearch(query);
  }

  /**
   * LUỒNG CHÍNH Bước 3: Hệ thống truy vấn dữ liệu
   * Perform search and update view
   */
  private async performSearch(query: string): Promise<void> {
    try {
      // Show loading state
      this.showLoadingState();

      // Call service layer
      const result = await this.productService.searchProducts(query);

      if (!result.success) {
        // LUỒNG THAY THẾ A3: Lỗi hệ thống
        this.showErrorMessage(result.message || 'Có lỗi xảy ra');
        return;
      }

      // LUỒNG CHÍNH Bước 4: Hiển thị kết quả
      this.displaySearchResults(result.products);

    } catch (error) {
      console.error('Search failed:', error);
      this.showErrorMessage('Có lỗi xảy ra, vui lòng thử lại sau');
    }
  }

  /**
   * Display search results in view
   */
  private displaySearchResults(products: Product[]): void {
    if (!this.suggestionContainer) return;

    // Clear existing suggestions
    this.clearSuggestions();

    // LUỒNG THAY THẾ A2: Không tìm thấy kết quả
    if (products.length === 0) {
      this.showEmptyState();
      return;
    }

    // LUỒNG CHÍNH: Render product suggestions
    products.forEach(product => {
      const suggestionElement = this.createSuggestionElement(product);
      this.suggestionContainer?.appendChild(suggestionElement);
    });
  }

  /**
   * Create suggestion DOM element
   */
  private createSuggestionElement(product: Product): HTMLElement {
    const div = document.createElement('div');
    div.className = 'suggestion-box';
    div.style.cursor = 'pointer';

    div.innerHTML = `
      <div>
        <button class="suggestion-btn text-white">Suggestion</button>
        <span class="suggestion-text">${this.escapeHtml(product.name)}</span>
      </div>
      <i class="bi bi-box-arrow-up-right" style="color:white"></i>
    `;

    // Attach click event
    div.addEventListener('click', () => {
      this.handleProductSelect(product);
    });

    // Hover effects
    div.addEventListener('mouseenter', () => {
      div.style.backgroundColor = '#3d4f63';
    });

    div.addEventListener('mouseleave', () => {
      div.style.backgroundColor = '#314157';
    });

    return div;
  }

  /**
   * Handle product selection
   */
  private handleProductSelect(product: Product): void {
    // Update search input
    if (this.searchInput) {
      this.searchInput.value = product.name;
    }

    // Navigate to product detail page with slug
    const slug = product.slug;
    if (slug) {
      // Close popup first
      this.hideSearchPopup();
      // Navigate to product page with slug parameter
      window.location.href = `./ProductDetail.html?slug=${slug}`;
      console.log(`🔗 Navigating to ProductDetail with slug: ${slug}`);
    } else {
      console.warn('Product slug not available:', product);
      // Try using productUrl as fallback
      if (product.productUrl) {
        this.hideSearchPopup();
        window.location.href = product.productUrl;
      } else {
        // Close search popup anyway
        this.hideSearchPopup();
        alert('Không thể mở trang chi tiết sản phẩm');
      }
    }
  }

  /**
   * Show loading state in view
   */
  private showLoadingState(): void {
    if (!this.suggestionContainer) return;

    this.clearSuggestions();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'suggestion-box';
    loadingDiv.innerHTML = `
      <div style="text-align: center; width: 100%;">
        <span class="text-white">Đang tìm kiếm...</span>
      </div>
    `;

    this.suggestionContainer.appendChild(loadingDiv);
  }

  /**
   * LUỒNG THAY THẾ A2: Show empty state
   */
  private showEmptyState(): void {
    if (!this.suggestionContainer) return;

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'suggestion-box';
    emptyDiv.innerHTML = `
      <div style="text-align: center; width: 100%;">
        <span class="text-white">Không tìm thấy sản phẩm "${this.escapeHtml(this.currentQuery)}"</span>
        <br>
        <small class="text-white" style="opacity: 0.7;">Thử tìm kiếm với từ khóa khác</small>
      </div>
    `;

    this.suggestionContainer.appendChild(emptyDiv);
  }

  /**
   * Show error message in view
   */
  private showErrorMessage(message: string): void {
    if (!this.suggestionContainer) return;

    this.clearSuggestions();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'suggestion-box';
    errorDiv.style.backgroundColor = '#d32f2f';
    errorDiv.innerHTML = `
      <div style="text-align: center; width: 100%;">
        <span class="text-white">${this.escapeHtml(message)}</span>
      </div>
    `;

    this.suggestionContainer.appendChild(errorDiv);
  }

  /**
   * Clear all suggestions from view
   */
  private clearSuggestions(): void {
    if (!this.suggestionContainer) return;

    const existingSuggestions = this.suggestionContainer.querySelectorAll('.suggestion-box');
    existingSuggestions.forEach(el => el.remove());
  }

  /**
   * Escape HTML to prevent XSS attacks
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

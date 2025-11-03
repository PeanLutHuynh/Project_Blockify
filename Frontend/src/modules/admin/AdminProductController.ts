import { httpClient } from '../../core/api/FetchHttpClient.js';

/**
 * AdminProductController - Frontend
 * Handles product management UI interactions for Admin
 */
export class AdminProductController {
  private products: any[] = [];
  private categories: any[] = [];
  private currentPage: number = 1;

  constructor() {
    this.init();
  }

  /**
   * Initialize controller
   */
  private init(): void {
    this.setupEventListeners();
    this.setupBulkActions();
    this.setupImageUpload();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search functionality
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      let searchTimeout: any;
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchProducts(target.value);
        }, 500);
      });

      // Search on Enter
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          const target = e.target as HTMLInputElement;
          this.searchProducts(target.value);
        }
      });
    }

    // Add product form
    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddProduct();
      });
    }

    // Edit product form
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
      editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEditProduct();
      });
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        document.querySelectorAll('.product-checkbox').forEach((checkbox: any) => {
          checkbox.checked = checked;
        });
      });
    }
  }

  /**
   * Setup bulk actions
   */
  private setupBulkActions(): void {
    // Bulk Edit
    const bulkEditBtn = document.getElementById('bulkEditBtn');
    if (bulkEditBtn) {
      bulkEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleBulkEdit();
      });
    }

    // Bulk Delete
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleBulkDelete();
      });
    }
  }

  /**
   * Get selected product IDs
   */
  private getSelectedProductIds(): number[] {
    const selectedIds: number[] = [];
    document.querySelectorAll('.product-checkbox:checked').forEach((checkbox: any) => {
      const productId = parseInt(checkbox.dataset.productId);
      if (productId) {
        selectedIds.push(productId);
      }
    });
    return selectedIds;
  }

  /**
   * Handle bulk edit
   */
  private async handleBulkEdit(): Promise<void> {
    const selectedIds = this.getSelectedProductIds();
    
    if (selectedIds.length === 0) {
      this.showError('Vui lòng chọn ít nhất một sản phẩm để chỉnh sửa');
      return;
    }

    // Show bulk edit modal or prompt
    const newStatus = prompt(`Chỉnh sửa hàng loạt ${selectedIds.length} sản phẩm\n\nChọn trạng thái mới:\n- active (Đang bán)\n- inactive (Ngừng bán)\n- draft (Nháp)`);
    
    if (!newStatus || !['active', 'inactive', 'draft'].includes(newStatus)) {
      return;
    }

    try {
      // Update each product
      const updatePromises = selectedIds.map(id => 
        httpClient.patch(`/api/admin/products/${id}/status`, { status: newStatus })
      );

      await Promise.all(updatePromises);
      
      this.showSuccess(`Đã cập nhật ${selectedIds.length} sản phẩm thành công!`);
      await this.loadProducts(this.currentPage);
      
      // Uncheck all
      (document.getElementById('selectAllCheckbox') as HTMLInputElement).checked = false;
    } catch (error: any) {
      console.error('Error bulk editing:', error);
      this.showError('Không thể cập nhật sản phẩm hàng loạt');
    }
  }

  /**
   * Handle bulk delete
   */
  private async handleBulkDelete(): Promise<void> {
    const selectedIds = this.getSelectedProductIds();
    
    if (selectedIds.length === 0) {
      this.showError('Vui lòng chọn ít nhất một sản phẩm để xóa');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn?`)) {
      return;
    }

    try {
      // Delete each product
      const deletePromises = selectedIds.map(id => 
        httpClient.delete(`/api/admin/products/${id}`)
      );

      await Promise.all(deletePromises);
      
      this.showSuccess(`Đã xóa ${selectedIds.length} sản phẩm thành công!`);
      await this.loadProducts(this.currentPage);
      
      // Uncheck all
      (document.getElementById('selectAllCheckbox') as HTMLInputElement).checked = false;
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      this.showError('Không thể xóa sản phẩm hàng loạt');
    }
  }

  /**
   * Load all products
   */
  async loadProducts(page: number = 1): Promise<void> {
    try {
      console.log('📦 Loading products, page:', page);
      
      const response = await httpClient.get(
        `/api/admin/products?page=${page}&limit=20`
      );

      console.log('📦 Products response:', response);

      if (response.success && response.data) {
        this.products = response.data.products || [];
        this.currentPage = response.data.pagination?.page || 1;
        
        console.log('📦 Loaded products:', this.products.length);
        
        this.renderProducts();
      } else {
        console.error('❌ Failed to load products:', response);
        this.showError('Không thể tải danh sách sản phẩm: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      this.showError('Không thể tải danh sách sản phẩm');
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string): Promise<void> {
    try {
      if (!query || query.trim().length < 2) {
        this.loadProducts();
        return;
      }

      console.log('🔍 Searching products:', query);

      const response = await httpClient.get(
        `/api/admin/products/search?q=${encodeURIComponent(query.trim())}`
      );

      console.log('🔍 Search response:', response);

      if (response.success && response.data) {
        this.products = response.data.products || response.data || [];
        this.renderProducts();
      } else {
        this.products = [];
        this.renderProducts();
      }
    } catch (error) {
      console.error('Error searching products:', error);
      this.showError('Không thể tìm kiếm sản phẩm');
    }
  }

  /**
   * Apply filters
   */
  async applyFilters(): Promise<void> {
    try {
      const categoryId = (document.getElementById('categoryFilter') as HTMLSelectElement)?.value;
      const stockFilter = (document.getElementById('stockFilter') as HTMLSelectElement)?.value;
      const statusFilter = (document.getElementById('statusFilter') as HTMLSelectElement)?.value;
      const searchQuery = (document.getElementById('productSearch') as HTMLInputElement)?.value;

      console.log('🔧 Applying filters:', { categoryId, stockFilter, statusFilter, searchQuery });

      // Build query parameters for backend
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100'); // Get more for client-side filtering

      if (categoryId) params.append('category_id', categoryId);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery && searchQuery.trim().length >= 2) {
        params.append('query', searchQuery.trim());
      }

      const response = await httpClient.get(`/api/admin/products?${params.toString()}`);

      console.log('🔧 Filter response:', response);

      if (response.success && response.data) {
        let products = response.data.products || [];
        
        // Client-side stock filtering
        // Hết hàng: stock_quantity = 0
        // Sắp hết: stock_quantity <= 5 && stock_quantity > 0
        // Còn hàng: stock_quantity > 5
        if (stockFilter === 'out_of_stock') {
          products = products.filter((p: any) => p.stock_quantity === 0);
        } else if (stockFilter === 'low_stock') {
          products = products.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity <= 5);
        } else if (stockFilter === 'in_stock') {
          products = products.filter((p: any) => p.stock_quantity > 5);
        }

        this.products = products;
        this.currentPage = 1;
        this.renderProducts();
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      this.showError('Không thể lọc sản phẩm');
    }
  }

  /**
   * Render products list as table rows (Shopee style)
   */
  private renderProducts(): void {
    const productList = document.getElementById('productList');
    const totalProductsEl = document.getElementById('totalProducts');
    const productCountText = document.getElementById('productCountText');
    
    if (!productList) return;

    // Update total count
    if (totalProductsEl) {
      totalProductsEl.textContent = this.products.length.toString();
    }
    if (productCountText) {
      productCountText.textContent = `${this.products.length} Sản Phẩm`;
    }

    if (this.products.length === 0) {
      productList.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-5">
            <i class="bi bi-inbox" style="font-size: 3rem;"></i>
            <p class="mt-3">Không tìm thấy sản phẩm nào</p>
          </td>
        </tr>
      `;
      return;
    }

    productList.innerHTML = this.products
      .map(
        (product) => {
          // Get primary image
          const primaryImage = product.images && product.images.length > 0 
            ? product.images.find((img: any) => img.is_primary)?.image_url || product.images[0]?.image_url
            : null;

          // Calculate stock status
          const stockQuantity = product.stock_quantity || 0;
          const stockClass = stockQuantity === 0 ? 'text-danger' : stockQuantity < 10 ? 'text-warning' : '';
          
          // Get category name
          const categoryName = product.categories?.category_name || product.category_name || 'N/A';

          return `
            <tr data-product-id="${product.product_id}">
              <td><input type="checkbox" class="form-check-input product-checkbox" data-product-id="${product.product_id}"></td>
              
              <!-- Product Name with Image -->
              <td>
                <div class="d-flex align-items-center">
                  <div class="me-3" style="width: 50px; height: 50px; flex-shrink: 0;">
                    ${primaryImage 
                      ? `<img src="${primaryImage}" alt="${product.product_name}" class="rounded" style="width: 100%; height: 100%; object-fit: cover;">` 
                      : `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 100%; height: 100%;"><i class="bi bi-image text-muted"></i></div>`
                    }
                  </div>
                  <div class="flex-grow-1">
                    <div class="fw-medium text-truncate" style="max-width: 250px;" title="${product.product_name}">
                      ${product.product_name}
                    </div>
                    ${product.piece_count ? `<small class="text-muted">${product.piece_count} mảnh</small>` : ''}
                  </div>
                </div>
              </td>
              
              <!-- SKU -->
              <td>
                <small class="text-muted">${product.product_slug || 'N/A'}</small>
              </td>
              
              <!-- Category -->
              <td>
                <span class="badge bg-light text-dark">${categoryName}</span>
              </td>
              
              <!-- Price -->
              <td>
                <div>₫${this.formatPrice(product.price)}</div>
                ${product.sale_price ? `<div><small class="text-danger">₫${this.formatPrice(product.sale_price)}</small></div>` : ''}
              </td>
              
              <!-- Stock -->
              <td class="${stockClass}">
                <strong>${stockQuantity}</strong>
                ${stockQuantity === 0 ? '<div><small>Hết hàng</small></div>' : ''}
                ${stockQuantity > 0 && stockQuantity < 10 ? '<div><small>Sắp hết</small></div>' : ''}
              </td>
              
              <!-- Sales (Doanh số) - From backend sold_count -->
              <td>
                <div>${product.sold_count || 0}</div>
                <small class="text-muted">Đã bán</small>
              </td>
              
              <!-- Actions -->
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary edit-product-btn" data-product-id="${product.product_id}" title="Chỉnh sửa">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-danger delete-product-btn" data-product-id="${product.product_id}" title="Xóa">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }
      )
      .join('');

    this.attachProductEventListeners();
  }

  /**
   * Attach event listeners to product cards
   */
  private attachProductEventListeners(): void {
    // Edit buttons
    document.querySelectorAll('.edit-product-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) {
          this.editProduct(parseInt(productId));
        }
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-product-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId && confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
          await this.deleteProduct(parseInt(productId));
        }
      });
    });
  }

  /**
   * Generate product slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Handle add product form submission
   */
  private async handleAddProduct(): Promise<void> {
    try {
      const productName = (document.getElementById('productName') as HTMLInputElement)?.value;
      
      // Get form data
      const difficultyValue = (document.getElementById('productAge') as HTMLInputElement)?.value.trim();
      
      const formData: any = {
        product_name: productName,
        product_slug: this.generateSlug(productName),
        category_id: parseInt((document.getElementById('productCategory') as HTMLSelectElement)?.value || '1'),
        description: (document.getElementById('productDesc') as HTMLTextAreaElement)?.value || '',
        short_description: '',
        price: parseFloat((document.getElementById('productPrice') as HTMLInputElement)?.value),
        stock_quantity: parseInt((document.getElementById('productStock') as HTMLInputElement)?.value || '0'),
        piece_count: parseInt((document.getElementById('productPieces') as HTMLInputElement)?.value) || null,
        difficulty_level: difficultyValue || null,
        status: (document.getElementById('productStatus') as HTMLSelectElement)?.value || 'active',
        images: [],
      };

      // Collect image URLs from uploaded images
      const imageInputs = document.querySelectorAll('.product-image-input');
      imageInputs.forEach((_input: any, index) => {
        const previewDiv = document.getElementById(`preview-${index}`);
        if (previewDiv) {
          const imgElement = previewDiv.querySelector('img[data-uploaded-url]');
          if (imgElement) {
            const uploadedUrl = imgElement.getAttribute('data-uploaded-url');
            if (uploadedUrl) {
              formData.images.push({
                image_url: uploadedUrl,
                is_primary: index === 0,
                sort_order: index,
              });
            }
          }
        }
      });

      // Send request
      const response = await httpClient.post('/api/admin/products', formData);

      if (response.success) {
        this.showSuccess('Thêm sản phẩm thành công!');
        
        // Reset form
        (document.getElementById('productForm') as HTMLFormElement)?.reset();
        document.querySelectorAll('.image-preview').forEach((preview) => {
          preview.innerHTML = '';
        });
        
        // Close modal
        const modalEl = document.getElementById('addProductModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
        
        // Reload products
        await this.loadProducts(this.currentPage);
      } else {
        this.showError(response.error || 'Không thể thêm sản phẩm');
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      this.showError(error.message || 'Không thể thêm sản phẩm');
    }
  }

  /**
   * Edit product
   */
  private async editProduct(productId: number): Promise<void> {
    try {
      console.log('✏️ Loading product for edit:', productId);
      
      // Get product details
      const response = await httpClient.get(`/api/admin/products/${productId}`);

      console.log('✏️ Product response:', response);

      if (response.success && response.data) {
        const product = response.data;

        console.log('✏️ Product data:', product);
        console.log('✏️ Product images:', product.images);

        // Fill form with product data
        (document.getElementById('editProductId') as HTMLInputElement).value = product.product_id;
        (document.getElementById('editProductName') as HTMLInputElement).value = product.product_name;
        (document.getElementById('editProductCategory') as HTMLSelectElement).value = product.category_id;
        (document.getElementById('editProductDesc') as HTMLTextAreaElement).value = product.description || '';
        (document.getElementById('editProductPrice') as HTMLInputElement).value = product.price;
        (document.getElementById('editProductStock') as HTMLInputElement).value = product.stock_quantity || 0;
        (document.getElementById('editProductPieces') as HTMLInputElement).value = product.piece_count || 0;
        (document.getElementById('editProductAge') as HTMLInputElement).value = product.difficulty_level || '';
        (document.getElementById('editProductStatus') as HTMLSelectElement).value = product.status || 'active';

        // Clear all image previews first
        for (let i = 0; i < 4; i++) {
          const preview = document.getElementById(`edit-preview-${i}`);
          if (preview) {
            preview.innerHTML = '';
          }
        }

        // Show existing images - use product_images like ProductDetail
        const images = product.product_images || product.images || [];
        console.log('📸 Product images array:', images);
        
        if (images.length > 0) {
          console.log(`✏️ Rendering ${images.length} images`);
          images.slice(0, 4).forEach((img: any, index: number) => {
            const preview = document.getElementById(`edit-preview-${index}`);
            if (preview) {
              console.log(`✏️ Setting image ${index}:`, img.image_url);
              preview.innerHTML = `<img src="${img.image_url}" alt="Image ${index + 1}" style="max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px;">`;
            } else {
              console.warn(`⚠️ Preview element not found: edit-preview-${index}`);
            }
          });
        } else {
          console.warn('⚠️ No images found in product data');
        }

        // Show modal
        const modalEl = document.getElementById('editProductModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = new (window as any).bootstrap.Modal(modalEl);
          modal.show();
        }
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
      this.showError('Không thể tải thông tin sản phẩm');
    }
  }

  /**
   * Handle edit product form submission
   */
  private async handleEditProduct(): Promise<void> {
    try {
      const productId = parseInt((document.getElementById('editProductId') as HTMLInputElement)?.value);
      const productName = (document.getElementById('editProductName') as HTMLInputElement)?.value;

      const difficultyValue = (document.getElementById('editProductAge') as HTMLInputElement)?.value.trim();
      
      const formData: any = {
        product_name: productName,
        product_slug: this.generateSlug(productName),
        category_id: parseInt((document.getElementById('editProductCategory') as HTMLSelectElement)?.value),
        description: (document.getElementById('editProductDesc') as HTMLTextAreaElement)?.value || '',
        price: parseFloat((document.getElementById('editProductPrice') as HTMLInputElement)?.value),
        stock_quantity: parseInt((document.getElementById('editProductStock') as HTMLInputElement)?.value),
        piece_count: parseInt((document.getElementById('editProductPieces') as HTMLInputElement)?.value) || null,
        difficulty_level: difficultyValue || null,
        status: (document.getElementById('editProductStatus') as HTMLSelectElement)?.value,
      };

      const response = await httpClient.put(`/api/admin/products/${productId}`, formData);

      if (response.success) {
        this.showSuccess('Cập nhật sản phẩm thành công!');
        
        // Close modal
        const modalEl = document.getElementById('editProductModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
        
        // Reload products
        await this.loadProducts(this.currentPage);
      } else {
        this.showError(response.error || 'Không thể cập nhật sản phẩm');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      this.showError(error.message || 'Không thể cập nhật sản phẩm');
    }
  }

  /**
   * Delete product
   */
  private async deleteProduct(productId: number): Promise<void> {
    try {
      const response = await httpClient.delete(`/api/admin/products/${productId}`);

      if (response.success) {
        this.showSuccess('Xóa sản phẩm thành công!');
        await this.loadProducts(this.currentPage);
      } else {
        this.showError(response.error || 'Không thể xóa sản phẩm');
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      this.showError(error.message || 'Không thể xóa sản phẩm');
    }
  }

  /**
   * Load categories for dropdown
   */
  async loadCategories(): Promise<void> {
    try {
      console.log('📁 Loading categories...');
      
      const response = await httpClient.get('/api/admin/categories/active');

      console.log('📁 Categories response:', response);

      if (response.success && response.data) {
        this.categories = response.data.categories || [];
        console.log('📁 Loaded categories:', this.categories.length);
        this.renderCategoryDropdowns();
      } else {
        console.error('❌ Failed to load categories:', response);
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
  }

  /**
   * Render category dropdowns
   */
  private renderCategoryDropdowns(): void {
    const selects = [
      document.getElementById('productCategory'),
      document.getElementById('editProductCategory'),
      document.getElementById('categoryFilter'),
    ];

    selects.forEach((select) => {
      if (select) {
        const isFilter = select.id === 'categoryFilter';
        const defaultOption = isFilter ? '<option value="">Danh mục</option>' : '';
        
        select.innerHTML = defaultOption + this.categories
          .map(
            (cat) =>
              `<option value="${cat.category_id}">${cat.category_name}</option>`
          )
          .join('');
      }
    });
  }

  /**
   * Helper: Format price
   */
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
  }

  /**
   * Setup image upload handlers
   */
  private setupImageUpload(): void {
    // Add product image inputs
    const addImageInputs = document.querySelectorAll('.product-image-input');
    addImageInputs.forEach((input) => {
      input.addEventListener('change', async (e) => {
        const fileInput = e.target as HTMLInputElement;
        const index = fileInput.dataset.index;
        const file = fileInput.files?.[0];
        
        if (file && index) {
          await this.handleImageUpload(file, parseInt(index), 'preview');
        }
      });
    });

    // Edit product image inputs
    const editImageInputs = document.querySelectorAll('.edit-product-image-input');
    editImageInputs.forEach((input) => {
      input.addEventListener('change', async (e) => {
        const fileInput = e.target as HTMLInputElement;
        const index = fileInput.dataset.index;
        const file = fileInput.files?.[0];
        
        if (file && index) {
          await this.handleImageUpload(file, parseInt(index), 'edit-preview');
        }
      });
    });
  }

  /**
   * Handle image upload - Upload to Supabase Storage and show preview
   */
  private async handleImageUpload(file: File, index: number, previewPrefix: string): Promise<void> {
    try {
      // Show loading state
      const previewDiv = document.getElementById(`${previewPrefix}-${index}`);
      if (previewDiv) {
        previewDiv.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Đang tải...</span></div>';
      }

      // Upload to server
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('blockify_auth_token');
      
      console.log(`📤 Uploading image ${index} to server...`);

      const response = await fetch('http://localhost:3001/api/admin/products/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      console.log(`📡 Upload response:`, result);

      if (result.success && result.data?.imageUrl) {
        const imageUrl = result.data.imageUrl;
        
        // Show preview with uploaded URL
        if (previewDiv) {
          previewDiv.innerHTML = `
            <img src="${imageUrl}" alt="Image ${index + 1}" style="max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px;" data-uploaded-url="${imageUrl}">
            <div class="mt-1 small text-success">✅ Đã tải lên</div>
          `;
        }
        
        console.log(`✅ Image ${index} uploaded: ${imageUrl}`);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Image upload error:', error);
      this.showError(error.message || 'Không thể tải ảnh lên');
      
      // Show error state
      const previewDiv = document.getElementById(`${previewPrefix}-${index}`);
      if (previewDiv) {
        previewDiv.innerHTML = '<div class="text-danger small">❌ Upload thất bại</div>';
      }
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    // You can implement a toast or alert here
    alert(message);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    // You can implement a toast or alert here
    alert(message);
  }
}

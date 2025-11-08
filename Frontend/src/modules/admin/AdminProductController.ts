import { httpClient } from '../../core/api/FetchHttpClient.js';

/**
 * AdminProductController - Frontend
 * Handles product management UI interactions for Admin
 */
export class AdminProductController {
  private products: any[] = [];
  private categories: any[] = [];
  private currentPage: number = 1;
  // @ts-ignore - Used for bulk edit tracking
  private selectedProducts: any[] = [];
  private currentSortField: string | null = null;
  private currentSortOrder: 'asc' | 'desc' | null = null;

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
    this.setupSortHandlers();
    // Load categories for dropdowns
    this.loadCategories();
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
   * Setup sort handlers for table columns
   */
  private setupSortHandlers(): void {
    // Add click handlers to sortable table headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', (e) => {
        const field = (e.currentTarget as HTMLElement).dataset.sort;
        if (field) {
          this.handleSortClick(field);
        }
      });
    });
  }

  /**
   * Handle sort click - toggle sort order
   */
  private handleSortClick(field: string): void {
    // Toggle sort order
    if (this.currentSortField === field) {
      if (this.currentSortOrder === null) {
        this.currentSortOrder = 'asc';
      } else if (this.currentSortOrder === 'asc') {
        this.currentSortOrder = 'desc';
      } else {
        // Reset to no sort
        this.currentSortField = null;
        this.currentSortOrder = null;
      }
    } else {
      // New field, start with ascending
      this.currentSortField = field;
      this.currentSortOrder = 'asc';
    }

    // Update sort icons
    this.updateSortIcons();

    // Apply filters with new sort
    this.applyFilters();
  }

  /**
   * Update sort icons based on current sort state
   */
  private updateSortIcons(): void {
    // Reset all icons
    document.querySelectorAll('th[data-sort] i').forEach(icon => {
      icon.className = 'bi bi-arrow-down-up';
    });

    // Update active icon
    if (this.currentSortField && this.currentSortOrder) {
      const icon = document.querySelector(`th[data-sort="${this.currentSortField}"] i`);
      if (icon) {
        if (this.currentSortOrder === 'asc') {
          icon.className = 'bi bi-sort-up text-primary';
        } else {
          icon.className = 'bi bi-sort-down text-primary';
        }
      }
    }
  }

  /**
   * Reset all filters
   */
  public resetFilters(): void {
    // Reset all filter dropdowns
    (document.getElementById('categoryFilter') as HTMLSelectElement).value = '';
    (document.getElementById('stockFilter') as HTMLSelectElement).value = '';
    (document.getElementById('statusFilter') as HTMLSelectElement).value = '';
    (document.getElementById('difficultyFilter') as HTMLSelectElement).value = '';
    (document.getElementById('featuredFilter') as HTMLSelectElement).value = '';
    (document.getElementById('newFilter') as HTMLSelectElement).value = '';
    (document.getElementById('bestsellerFilter') as HTMLSelectElement).value = '';
    (document.getElementById('productSearch') as HTMLInputElement).value = '';

    // Reset sort
    this.currentSortField = null;
    this.currentSortOrder = null;
    this.updateSortIcons();

    // Reload products
    this.applyFilters();
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
   * Handle bulk edit - Open advanced modal
   */
  private async handleBulkEdit(): Promise<void> {
    const selectedIds = this.getSelectedProductIds();
    
    if (selectedIds.length === 0) {
      this.showError('Vui lòng chọn ít nhất một sản phẩm để chỉnh sửa');
      return;
    }

    // Get full product data for selected products
    try {
      const productPromises = selectedIds.map(id => httpClient.get(`/api/admin/products/${id}`));
      const responses = await Promise.all(productPromises);
      const products = responses.map(res => res.data).filter(p => p);

      // Store selected products for modal
      this.selectedProducts = products;

      // Open modal
      this.openBulkEditAdvancedModal(products);
    } catch (error: any) {
      console.error('Error loading products:', error);
      this.showError('Không thể tải thông tin sản phẩm');
    }
  }

  /**
   * Open Bulk Edit Advanced Modal
   */
  private openBulkEditAdvancedModal(products: any[]): void {
    console.log('🔧 Opening bulk edit modal for', products.length, 'products');
    
    // Clear previous table data
    const tbody = document.getElementById('bulkEditTableBody');
    if (tbody) tbody.innerHTML = '';
    
    // Update count
    const countElem = document.getElementById('bulkEditCount');
    if (countElem) countElem.textContent = products.length.toString();

    const saveCountElem = document.getElementById('bulkEditSaveCount');
    if (saveCountElem) saveCountElem.textContent = products.length.toString();

    // Reset field selector
    const fieldSelect = document.getElementById('bulkEditField') as HTMLSelectElement;
    if (fieldSelect) {
      fieldSelect.value = '';
      // Remove old event listeners and add new one
      const newFieldSelect = fieldSelect.cloneNode(true) as HTMLSelectElement;
      fieldSelect.parentNode?.replaceChild(newFieldSelect, fieldSelect);
      newFieldSelect.addEventListener('change', () => this.onBulkEditFieldChange(products));
    }

    // Hide table and helper initially
    const tableContainer = document.getElementById('bulkEditTableContainer');
    if (tableContainer) tableContainer.style.display = 'none';

    const helper = document.getElementById('bulkEditHelper');
    if (helper) helper.style.display = 'none';

    // Setup save button
    const saveBtn = document.getElementById('bulkEditSaveBtn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
      // Remove old event listeners
      const newSaveBtn = saveBtn.cloneNode(true) as HTMLButtonElement;
      saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.onclick = () => this.saveBulkEdit(products);
    }

    // Show modal
    const modalEl = document.getElementById('bulkEditAdvancedModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  /**
   * Handle field selection change
   */
  private onBulkEditFieldChange(products: any[]): void {
    const fieldSelect = document.getElementById('bulkEditField') as HTMLSelectElement;
    const selectedField = fieldSelect?.value;

    const tableContainer = document.getElementById('bulkEditTableContainer');
    const helper = document.getElementById('bulkEditHelper');
    const saveBtn = document.getElementById('bulkEditSaveBtn') as HTMLButtonElement;

    if (!selectedField) {
      if (tableContainer) tableContainer.style.display = 'none';
      if (helper) helper.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
      return;
    }

    // Show table
    if (tableContainer) tableContainer.style.display = 'block';
    if (helper) {
      helper.style.display = 'block';
      const helperText = document.getElementById('bulkEditHelperText');
      if (helperText) helperText.textContent = this.getBulkEditHelperText(selectedField);
    }
    if (saveBtn) saveBtn.disabled = false;

    // Render table rows
    this.renderBulkEditTable(products, selectedField);

    // Load categories if needed
    if (selectedField === 'category') {
      this.loadCategoriesForBulkEdit(products);
    }
  }

  /**
   * Get helper text for field
   */
  private getBulkEditHelperText(field: string): string {
    const texts: Record<string, string> = {
      status: 'Chọn trạng thái mới cho từng sản phẩm (active/inactive/draft)',
      category: 'Chọn danh mục mới cho từng sản phẩm',
      price: 'Nhập giá bán mới (VD: 500000)',
      sale_price: 'Nhập giá khuyến mãi (để trống nếu không có)',
      stock: 'Nhập số lượng tồn kho mới',
      difficulty: 'Chọn độ khó (Easy/Medium/Hard/Expert)',
      piece_count: 'Nhập số mảnh ghép',
      is_featured: 'Bật/tắt sản phẩm nổi bật',
      is_bestseller: 'Bật/tắt bán chạy nhất',
      is_new: 'Bật/tắt sản phẩm mới'
    };
    return texts[field] || 'Nhập giá trị mới cho từng sản phẩm';
  }

  /**
   * Render bulk edit table
   */
  private renderBulkEditTable(products: any[], field: string): void {
    const tbody = document.getElementById('bulkEditTableBody');
    if (!tbody) return;

    tbody.innerHTML = products.map((product, index) => {
      const thumbnail = product.images?.[0]?.image_url || product.product_images?.[0]?.image_url || '/images/placeholder.png';
      const currentValue = this.getCurrentFieldValue(product, field);
      const inputHtml = this.getBulkEditInputHtml(field, currentValue, index);

      return `
        <tr>
          <td>
            <img src="${thumbnail}" alt="${product.product_name}" 
                 class="rounded" style="width: 60px; height: 60px; object-fit: cover;">
          </td>
          <td>
            <div class="fw-semibold">${product.product_name}</div>
            <small class="text-muted">ID: ${product.product_id}</small>
          </td>
          <td>${product.category_name || '-'}</td>
          <td><code>${product.product_slug || '-'}</code></td>
          <td>
            <span class="badge bg-secondary">${this.formatCurrentValue(field, currentValue)}</span>
          </td>
          <td>
            ${inputHtml}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Get current field value
   */
  private getCurrentFieldValue(product: any, field: string): any {
    const fieldMap: Record<string, string> = {
      status: 'status',
      category: 'category_id',
      price: 'price',
      sale_price: 'sale_price',
      stock: 'stock_quantity',
      difficulty: 'difficulty_level',
      piece_count: 'piece_count',
      is_featured: 'is_featured',
      is_bestseller: 'is_bestseller',
      is_new: 'is_new'
    };
    return product[fieldMap[field]];
  }

  /**
   * Format current value for display
   */
  private formatCurrentValue(field: string, value: any): string {
    if (value === null || value === undefined || value === '') return 'Chưa đặt';
    
    if (field === 'price' || field === 'sale_price') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
    
    if (field.startsWith('is_')) {
      return value ? 'Có' : 'Không';
    }
    
    if (field === 'status') {
      const statusMap: Record<string, string> = {
        active: 'Đang bán',
        inactive: 'Ngừng bán',
        draft: 'Nháp'
      };
      return statusMap[value] || value;
    }
    
    if (field === 'difficulty') {
      const difficultyMap: Record<string, string> = {
        Easy: 'Dễ',
        Medium: 'Trung bình',
        Hard: 'Khó',
        Expert: 'Chuyên gia'
      };
      return difficultyMap[value] || value;
    }
    
    return value.toString();
  }

  /**
   * Get input HTML for bulk edit
   */
  private getBulkEditInputHtml(field: string, currentValue: any, index: number): string {
    const inputName = `bulk_${field}_${index}`;
    
    switch (field) {
      case 'status':
        return `
          <select class="form-select bulk-edit-input" name="${inputName}" data-index="${index}">
            <option value="active" ${currentValue === 'active' ? 'selected' : ''}>Đang bán</option>
            <option value="inactive" ${currentValue === 'inactive' ? 'selected' : ''}>Ngừng bán</option>
            <option value="draft" ${currentValue === 'draft' ? 'selected' : ''}>Nháp</option>
          </select>
        `;
      
      case 'category':
        // Need to load categories
        return `<select class="form-select bulk-edit-input" name="${inputName}" data-index="${index}" id="bulk-category-${index}"></select>`;
      
      case 'difficulty':
        return `
          <select class="form-select bulk-edit-input" name="${inputName}" data-index="${index}">
            <option value="">-- Chọn độ khó --</option>
            <option value="Easy" ${currentValue === 'Easy' ? 'selected' : ''}>Dễ (Easy)</option>
            <option value="Medium" ${currentValue === 'Medium' ? 'selected' : ''}>Trung bình (Medium)</option>
            <option value="Hard" ${currentValue === 'Hard' ? 'selected' : ''}>Khó (Hard)</option>
            <option value="Expert" ${currentValue === 'Expert' ? 'selected' : ''}>Chuyên gia (Expert)</option>
          </select>
        `;
      
      case 'is_featured':
      case 'is_bestseller':
      case 'is_new':
        return `
          <div class="form-check form-switch">
            <input class="form-check-input bulk-edit-input" type="checkbox" name="${inputName}" 
                   data-index="${index}" ${currentValue ? 'checked' : ''}>
          </div>
        `;
      
      case 'price':
      case 'sale_price':
        return `
          <input type="number" class="form-control bulk-edit-input" name="${inputName}" 
                 data-index="${index}" value="${currentValue || ''}" min="0" step="1000" 
                 placeholder="Nhập giá...">
        `;
      
      case 'stock':
      case 'piece_count':
        return `
          <input type="number" class="form-control bulk-edit-input" name="${inputName}" 
                 data-index="${index}" value="${currentValue || ''}" min="0" 
                 placeholder="Nhập số...">
        `;
      
      default:
        return `
          <input type="text" class="form-control bulk-edit-input" name="${inputName}" 
                 data-index="${index}" value="${currentValue || ''}" 
                 placeholder="Nhập giá trị...">
        `;
    }
  }

  /**
   * Save bulk edit changes
   */
  private async saveBulkEdit(products: any[]): Promise<void> {
    const fieldSelect = document.getElementById('bulkEditField') as HTMLSelectElement;
    const selectedField = fieldSelect?.value;

    if (!selectedField) {
      this.showError('Vui lòng chọn tiêu chí cần sửa');
      return;
    }

    try {
      // Collect all input values
      const inputs = document.querySelectorAll('.bulk-edit-input') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
      const updates: any[] = [];

      inputs.forEach((input) => {
        const index = parseInt(input.dataset.index || '0');
        const product = products[index];
        
        let newValue: any;
        if (input.type === 'checkbox') {
          newValue = (input as HTMLInputElement).checked;
        } else if (input.type === 'number') {
          newValue = input.value ? parseFloat(input.value) : null;
        } else {
          newValue = input.value || null;
        }

        updates.push({
          product_id: product.product_id,
          field: selectedField,
          value: newValue
        });
      });

      console.log('📤 Bulk updates:', updates);

      // Send updates to backend
      const updatePromises = updates.map(async (update) => {
        try {
          console.log(`📝 Processing update for product ${update.product_id}:`, { field: update.field, value: update.value });
          
          // Get full product data first
          const productResponse = await httpClient.get(`/api/admin/products/${update.product_id}`);
          
          if (!productResponse.success || !productResponse.data) {
            console.error(`❌ Failed to get product ${update.product_id}:`, productResponse);
            throw new Error(`Failed to get product ${update.product_id}`);
          }
          
          const product = productResponse.data;
          console.log(`✅ Got product ${update.product_id}:`, product);
          
          // Use appropriate endpoint
          if (update.field === 'status') {
            const payload = { 
              status: update.value,
              reason: 'Bulk edit from admin'
            };
            console.log(`📤 PATCH /api/admin/products/${update.product_id}/status:`, payload);
            return httpClient.patch(`/api/admin/products/${update.product_id}/status`, payload);
          } else if (update.field === 'stock') {
            const payload = { 
              stock_quantity: update.value,
              reason: 'Bulk edit from admin'
            };
            console.log(`📤 PATCH /api/admin/products/${update.product_id}/stock:`, payload);
            return httpClient.patch(`/api/admin/products/${update.product_id}/stock`, payload);
          } else {
            // For other fields, use PUT with full product data
            const payload = this.buildBulkEditPayload(product, update.field, update.value);
            console.log(`📤 PUT /api/admin/products/${update.product_id}:`, payload);
            return httpClient.put(`/api/admin/products/${update.product_id}`, payload);
          }
        } catch (err) {
          console.error(`❌ Error updating product ${update.product_id}:`, err);
          return { success: false, error: err };
        }
      });

      const results = await Promise.all(updatePromises);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        this.showSuccess(`Đã cập nhật ${successCount} sản phẩm thành công!` + (failCount > 0 ? ` (${failCount} thất bại)` : ''));
      } else {
        this.showError('Không thể cập nhật sản phẩm');
      }
      
      // Close modal
      const modalEl = document.getElementById('bulkEditAdvancedModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        modal?.hide();
      }

      // Reload products
      await this.loadProducts(this.currentPage);
      
      // Uncheck all
      (document.getElementById('selectAllCheckbox') as HTMLInputElement).checked = false;
    } catch (error: any) {
      console.error('❌ Error bulk editing:', error);
      this.showError('Không thể cập nhật sản phẩm hàng loạt');
    }
  }

  /**
   * Build payload for bulk edit based on field and current product data
   */
  private buildBulkEditPayload(product: any, field: string, value: any): any {
    const payload: any = {
      product_name: product.product_name,
      product_slug: product.product_slug,
      category_id: parseInt(product.category_id),
      description: product.description || '',
      short_description: product.short_description || '',
      price: parseFloat(product.price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
      stock_quantity: parseInt(product.stock_quantity) || 0,
      min_stock_level: product.min_stock_level ? parseInt(product.min_stock_level) : null,
      weight: product.weight ? parseFloat(product.weight) : null,
      dimensions: product.dimensions || null,
      piece_count: product.piece_count ? parseInt(product.piece_count) : null,
      difficulty_level: product.difficulty_level || null,
      is_featured: Boolean(product.is_featured),
      is_bestseller: Boolean(product.is_bestseller),
      is_new: Boolean(product.is_new),
      status: product.status
    };

    // Update the specific field with proper type conversion
    const fieldMap: Record<string, string> = {
      category: 'category_id',
      price: 'price',
      sale_price: 'sale_price',
      stock: 'stock_quantity',
      difficulty: 'difficulty_level',
      piece_count: 'piece_count',
      is_featured: 'is_featured',
      is_bestseller: 'is_bestseller',
      is_new: 'is_new'
    };

    const targetField = fieldMap[field] || field;
    
    // Convert value to proper type based on field
    if (field === 'category') {
      payload[targetField] = parseInt(value);
    } else if (field === 'price' || field === 'sale_price') {
      payload[targetField] = value ? parseFloat(value) : null;
    } else if (field === 'stock' || field === 'piece_count') {
      payload[targetField] = value ? parseInt(value) : null;
    } else if (field.startsWith('is_')) {
      payload[targetField] = Boolean(value);
    } else {
      payload[targetField] = value;
    }

    console.log(`📦 Built payload for ${field} (${targetField}):`, payload);
    
    return payload;
  }

  /**
   * Load categories for bulk edit dropdowns
   */
  private async loadCategoriesForBulkEdit(products: any[]): Promise<void> {
    try {
      console.log('📦 Loading categories for bulk edit...');
      const response = await httpClient.get('/api/admin/categories');
      
      console.log('📦 Categories response:', response);
      
      if (response.success && response.data) {
        // Backend returns: { success: true, data: { categories: [...], count: N } }
        let categories = response.data.categories || [];
        
        console.log('📦 Categories array:', categories);
        
        if (!Array.isArray(categories) || categories.length === 0) {
          console.warn('⚠️ No categories found');
          return;
        }
        
        // Populate each category select
        products.forEach((product, index) => {
          const select = document.getElementById(`bulk-category-${index}`) as HTMLSelectElement;
          if (select) {
            console.log(`📝 Populating category select for product ${index}:`, product.category_id);
            select.innerHTML = categories.map((cat: any) => 
              `<option value="${cat.category_id}" ${cat.category_id === product.category_id ? 'selected' : ''}>
                ${cat.category_name}
              </option>`
            ).join('');
          }
        });
        
        console.log('✅ Categories loaded for bulk edit');
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
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
      
      // Load all products (high limit to show everything on one page)
      const response = await httpClient.get(
        `/api/admin/products?page=1&limit=1000`
      );

      console.log('📦 Products response:', response);
      console.log('📦 Backend returned:', response.data?.products?.length, 'products');
      console.log('📦 Pagination:', response.data?.pagination);

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
      const difficultyFilter = (document.getElementById('difficultyFilter') as HTMLSelectElement)?.value;
      const featuredFilter = (document.getElementById('featuredFilter') as HTMLSelectElement)?.value;
      const newFilter = (document.getElementById('newFilter') as HTMLSelectElement)?.value;
      const bestsellerFilter = (document.getElementById('bestsellerFilter') as HTMLSelectElement)?.value;
      const searchQuery = (document.getElementById('productSearch') as HTMLInputElement)?.value;

      console.log('🔧 Applying filters:', { 
        categoryId, stockFilter, statusFilter, difficultyFilter, 
        featuredFilter, newFilter, bestsellerFilter, searchQuery,
        sort: { field: this.currentSortField, order: this.currentSortOrder }
      });

      // Build query parameters for backend
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000'); // Load all products for client-side filtering

      if (categoryId) params.append('category_id', categoryId);
      if (statusFilter) params.append('status', statusFilter);
      if (stockFilter) params.append('stock_filter', stockFilter);
      if (difficultyFilter) params.append('difficulty_level', difficultyFilter);
      if (featuredFilter) params.append('is_featured', featuredFilter);
      if (newFilter) params.append('is_new', newFilter);
      if (bestsellerFilter) params.append('is_bestseller', bestsellerFilter);
      if (searchQuery && searchQuery.trim().length >= 2) {
        params.append('query', searchQuery.trim());
      }

      // Add sort parameters
      if (this.currentSortField && this.currentSortOrder) {
        params.append('sortBy', this.currentSortField);
        params.append('sortOrder', this.currentSortOrder);
      }

      const response = await httpClient.get(`/api/admin/products?${params.toString()}`);

      console.log('🔧 Filter response:', response);

      if (response.success && response.data) {
        this.products = response.data.products || [];
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
      console.log('🚀 Starting product creation...');
      
      const productName = (document.getElementById('productName') as HTMLInputElement)?.value;
      const categorySelect = document.getElementById('productCategory') as HTMLSelectElement;
      const categoryName = categorySelect?.selectedOptions[0]?.text || 'uncategorized';
      const categoryId = parseInt(categorySelect?.value || '0');
      
      console.log('📋 Product info:', { productName, categoryName, categoryId });
      
      // Validate required fields
      if (!productName || !categoryId) {
        this.showError('Vui lòng nhập tên sản phẩm và chọn danh mục!');
        return;
      }
      
      // Step 1: Prepare product data FIRST (without images)
      const difficultyValue = (document.getElementById('productAge') as HTMLSelectElement)?.value.trim();
      
      // Get and parse all form values
      const priceValue = parseFloat((document.getElementById('productPrice') as HTMLInputElement)?.value);
      const salePriceValue = parseFloat((document.getElementById('productSalePrice') as HTMLInputElement)?.value);
      const stockValue = parseInt((document.getElementById('productStock') as HTMLInputElement)?.value);
      const minStockValue = parseInt((document.getElementById('productMinStock') as HTMLInputElement)?.value);
      const weightValue = parseFloat((document.getElementById('productWeight') as HTMLInputElement)?.value);
      const piecesValue = parseInt((document.getElementById('productPieces') as HTMLInputElement)?.value);
      
      // Validate required fields
      if (isNaN(priceValue) || priceValue <= 0) {
        this.showError('Vui lòng nhập giá sản phẩm hợp lệ!');
        return;
      }
      
      const productData: any = {
        product_name: productName,
        product_slug: this.generateSlug(productName),
        category_id: categoryId,
        description: (document.getElementById('productDesc') as HTMLTextAreaElement)?.value || '',
        short_description: (document.getElementById('productShortDesc') as HTMLTextAreaElement)?.value || '',
        price: priceValue,
        sale_price: !isNaN(salePriceValue) ? salePriceValue : undefined,
        stock_quantity: !isNaN(stockValue) ? stockValue : 0,
        min_stock_level: !isNaN(minStockValue) ? minStockValue : undefined,
        weight: !isNaN(weightValue) ? weightValue : undefined,
        dimensions: (document.getElementById('productDimensions') as HTMLInputElement)?.value || undefined,
        piece_count: !isNaN(piecesValue) ? piecesValue : undefined,
        difficulty_level: difficultyValue || undefined,
        is_featured: (document.getElementById('productIsFeatured') as HTMLInputElement)?.checked || false,
        is_bestseller: (document.getElementById('productIsBestseller') as HTMLInputElement)?.checked || false,
        is_new: (document.getElementById('productIsNew') as HTMLInputElement)?.checked || false,
        status: (document.getElementById('productStatus') as HTMLSelectElement)?.value || 'active',
      };

      console.log('📦 Product data:', productData);
      
      // Step 2: Create product WITHOUT images first
      console.log('🔄 Step 1: Creating product...');
      const createResponse = await httpClient.post('/api/admin/products', productData);

      if (!createResponse.success || !createResponse.data?.product_id) {
        console.error('❌ Backend error:', createResponse);
        this.showError(createResponse.error || createResponse.message || 'Không thể thêm sản phẩm');
        return;
      }
      
      const productId = createResponse.data.product_id;
      console.log('✅ Product created with ID:', productId);
      
      // Step 3: Upload images with product_id (one by one)
      const imageInputs = document.querySelectorAll('.product-image-input') as NodeListOf<HTMLInputElement>;
      const token = localStorage.getItem('blockify_auth_token');
      let uploadedCount = 0;
      
      console.log('🖼️ Step 2: Uploading images...');
      
      for (let index = 0; index < imageInputs.length; index++) {
        const input = imageInputs[index];
        const file = input.files?.[0];
        
        if (file) {
          console.log(`📤 Uploading image ${index}...`);
          
          const formData = new FormData();
          formData.append('image', file);
          formData.append('productName', productName);
          formData.append('categoryId', categoryId.toString());
          formData.append('imageIndex', index.toString());

          const uploadResponse = await fetch(`http://localhost:3001/api/admin/products/${productId}/images`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const result = await uploadResponse.json();
          
          if (result.success) {
            uploadedCount++;
            console.log(`✅ Image ${index} uploaded successfully`);
          } else {
            console.error(`❌ Failed to upload image ${index}:`, result.error);
          }
        }
      }
      
      console.log(`✅ Product created! Images uploaded: ${uploadedCount}`);
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
    } catch (error: any) {
      console.error('❌ Error adding product:', error);
      this.showError(error.message || error.error || 'Không thể thêm sản phẩm');
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
        (document.getElementById('editProductShortDesc') as HTMLTextAreaElement).value = product.short_description || '';
        (document.getElementById('editProductPrice') as HTMLInputElement).value = product.price;
        (document.getElementById('editProductSalePrice') as HTMLInputElement).value = product.sale_price || '';
        (document.getElementById('editProductStock') as HTMLInputElement).value = product.stock_quantity || 0;
        (document.getElementById('editProductMinStock') as HTMLInputElement).value = product.min_stock_level || '';
        (document.getElementById('editProductWeight') as HTMLInputElement).value = product.weight || '';
        (document.getElementById('editProductDimensions') as HTMLInputElement).value = product.dimensions || '';
        (document.getElementById('editProductPieces') as HTMLInputElement).value = product.piece_count || 0;
        
        // Set difficulty level - only if it's a valid option (capitalize first letter)
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
        const difficultySelect = document.getElementById('editProductAge') as HTMLSelectElement;
        if (product.difficulty_level) {
          // Capitalize first letter
          const capitalizedDifficulty = product.difficulty_level.charAt(0).toUpperCase() + product.difficulty_level.slice(1).toLowerCase();
          if (validDifficulties.includes(capitalizedDifficulty)) {
            difficultySelect.value = capitalizedDifficulty;
          } else {
            difficultySelect.value = ''; // Reset to empty if invalid value
          }
        } else {
          difficultySelect.value = '';
        }
        
        // Set checkboxes
        (document.getElementById('editProductIsFeatured') as HTMLInputElement).checked = product.is_featured || false;
        (document.getElementById('editProductIsBestseller') as HTMLInputElement).checked = product.is_bestseller || false;
        (document.getElementById('editProductIsNew') as HTMLInputElement).checked = product.is_new || false;
        
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
              preview.innerHTML = `
                <div style="position: relative; display: inline-block;">
                  <img src="${img.image_url}" alt="Image ${index + 1}" style="max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px;" data-image-url="${img.image_url}">
                  <button type="button" class="btn btn-danger btn-sm remove-image-btn" data-index="${index}" data-prefix="edit-preview" 
                    style="position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; padding: 0; border-radius: 50%; font-size: 12px; line-height: 1;">
                    ×
                  </button>
                </div>
              `;
              
              // Add click handler for remove button
              const removeBtn = preview.querySelector('.remove-image-btn');
              if (removeBtn) {
                removeBtn.addEventListener('click', async () => {
                  await this.deleteImageFromStorage(img.image_url, index);
                });
              }
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
      console.log('🔄 Starting product update...');
      
      const productId = parseInt((document.getElementById('editProductId') as HTMLInputElement)?.value);
      const productName = (document.getElementById('editProductName') as HTMLInputElement)?.value;
      const categorySelect = document.getElementById('editProductCategory') as HTMLSelectElement;
      const categoryId = parseInt(categorySelect?.value || '0');

      console.log('📋 Product info:', { productId, productName, categoryId });

      // Step 1: Update product info FIRST
      console.log('� Step 1: Updating product info...');

      // Step 2: Prepare product data
      const difficultyValue = (document.getElementById('editProductAge') as HTMLSelectElement)?.value.trim();
      
      const productData: any = {
        product_name: productName,
        product_slug: this.generateSlug(productName),
        category_id: categoryId,
        description: (document.getElementById('editProductDesc') as HTMLTextAreaElement)?.value || '',
        short_description: (document.getElementById('editProductShortDesc') as HTMLTextAreaElement)?.value || '',
        price: parseFloat((document.getElementById('editProductPrice') as HTMLInputElement)?.value),
        sale_price: parseFloat((document.getElementById('editProductSalePrice') as HTMLInputElement)?.value) || null,
        stock_quantity: parseInt((document.getElementById('editProductStock') as HTMLInputElement)?.value),
        min_stock_level: parseInt((document.getElementById('editProductMinStock') as HTMLInputElement)?.value) || null,
        weight: parseFloat((document.getElementById('editProductWeight') as HTMLInputElement)?.value) || null,
        dimensions: (document.getElementById('editProductDimensions') as HTMLInputElement)?.value || null,
        piece_count: parseInt((document.getElementById('editProductPieces') as HTMLInputElement)?.value) || null,
        difficulty_level: difficultyValue || null,
        is_featured: (document.getElementById('editProductIsFeatured') as HTMLInputElement)?.checked || false,
        is_bestseller: (document.getElementById('editProductIsBestseller') as HTMLInputElement)?.checked || false,
        is_new: (document.getElementById('editProductIsNew') as HTMLInputElement)?.checked || false,
        status: (document.getElementById('editProductStatus') as HTMLSelectElement)?.value,
      };

      console.log('📦 Product update data:', productData);

      // Step 2: Update product info first
      console.log('🔄 Step 1: Updating product...');
      const updateResponse = await httpClient.put(`/api/admin/products/${productId}`, productData);

      if (!updateResponse.success) {
        console.error('❌ Failed to update product:', updateResponse);
        this.showError(updateResponse.error || 'Không thể cập nhật sản phẩm');
        return;
      }

      console.log('✅ Product info updated');

      // Step 3: Handle image uploads (if any new images)
      console.log('🖼️ Step 2: Checking for new images...');
      const imageInputs = document.querySelectorAll('.edit-product-image-input') as NodeListOf<HTMLInputElement>;
      const token = localStorage.getItem('blockify_auth_token');
      let uploadedCount = 0;
      
      for (let index = 0; index < imageInputs.length; index++) {
        const input = imageInputs[index];
        const file = input.files?.[0];
        
        if (file) {
          console.log(`📤 Uploading image ${index}...`);
          
          const formData = new FormData();
          formData.append('image', file);
          formData.append('productName', productName);
          formData.append('categoryId', categoryId.toString());
          formData.append('imageIndex', index.toString());

          const uploadResponse = await fetch(`http://localhost:3001/api/admin/products/${productId}/images`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const result = await uploadResponse.json();
          
          if (result.success) {
            uploadedCount++;
            console.log(`✅ Image ${index} uploaded successfully`);
          } else {
            console.error(`❌ Failed to upload image ${index}:`, result.error);
          }
        }
      }
      
      if (uploadedCount > 0) {
        console.log(`✅ Uploaded ${uploadedCount} images`);
      } else {
        console.log('ℹ️ No new images to upload');
      }

      console.log('✅ Product updated successfully!');
      this.showSuccess('Cập nhật sản phẩm thành công!');
      
      // Close modal
      const modalEl = document.getElementById('editProductModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        modal?.hide();
      }
      
      // Reload products
      await this.loadProducts(this.currentPage);
    } catch (error: any) {
      console.error('❌ Error updating product:', error);
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
   * Handle image selection - Show LOCAL preview only (don't upload yet)
   */
  private async handleImageUpload(file: File, index: number, previewPrefix: string): Promise<void> {
    try {
      // Show loading state
      const previewDiv = document.getElementById(`${previewPrefix}-${index}`);
      if (previewDiv) {
        previewDiv.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Đang tải...</span></div>';
      }

      // Read file as Data URL for LOCAL preview
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const localImageUrl = e.target?.result as string;
        
        // Show preview with local Data URL and delete button
        if (previewDiv && localImageUrl) {
          previewDiv.innerHTML = `
            <div style="position: relative; display: inline-block;">
              <img src="${localImageUrl}" alt="Image ${index + 1}" style="max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px;" data-local-preview="true">
              <button type="button" class="btn btn-danger btn-sm remove-image-btn" data-index="${index}" data-prefix="${previewPrefix}" 
                style="position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; padding: 0; border-radius: 50%; font-size: 12px; line-height: 1;">
                ×
              </button>
            </div>
          `;
          
          // Add click handler for remove button
          const removeBtn = previewDiv.querySelector('.remove-image-btn');
          if (removeBtn) {
            removeBtn.addEventListener('click', () => {
              this.removeImagePreview(index, previewPrefix);
            });
          }
        }
        
        console.log(`✅ Preview image ${index} loaded`);
      };

      reader.onerror = () => {
        if (previewDiv) {
          previewDiv.innerHTML = '<div class="text-danger small">❌ Không thể đọc file</div>';
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Image preview error:', error);
      this.showError(error.message || 'Không thể xem trước ảnh');
      
      // Show error state
      const previewDiv = document.getElementById(`${previewPrefix}-${index}`);
      if (previewDiv) {
        previewDiv.innerHTML = '<div class="text-danger small">❌ Lỗi</div>';
      }
    }
  }

  /**
   * Remove image preview and clear file input
   */
  private removeImagePreview(index: number, previewPrefix: string): void {
    try {
      // Clear preview
      const previewDiv = document.getElementById(`${previewPrefix}-${index}`);
      if (previewDiv) {
        previewDiv.innerHTML = '';
      }

      // Clear file input - Find the correct input based on prefix
      const inputClass = previewPrefix === 'preview' ? 'product-image-input' : 'edit-product-image-input';
      const fileInputs = document.querySelectorAll(`.${inputClass}`);
      
      fileInputs.forEach((input: any) => {
        if (input.dataset.index === String(index)) {
          input.value = ''; // Clear the file input
          console.log(`🗑️ Cleared image ${index} (${previewPrefix})`);
        }
      });
    } catch (error: any) {
      console.error('❌ Error removing image preview:', error);
    }
  }

  /**
   * Delete image from Supabase Storage and update database
   */
  private async deleteImageFromStorage(imageUrl: string, imageIndex: number): Promise<void> {
    try {
      if (!confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi Storage?')) {
        return;
      }

      console.log(`🗑️ Deleting image ${imageIndex} from Storage:`, imageUrl);

      const productId = parseInt((document.getElementById('editProductId') as HTMLInputElement)?.value);
      if (!productId) {
        throw new Error('Product ID not found');
      }

      // Call backend API to delete image using httpClient
      const response = await httpClient.delete(
        `/api/admin/products/${productId}/images/${imageIndex}`
      );

      if (!response.success) {
        throw new Error(response.message || 'Không thể xóa ảnh');
      }

      console.log(`✅ Image ${imageIndex} deleted from Storage successfully`);
      
      // Clear preview after successful deletion
      const previewDiv = document.getElementById(`edit-preview-${imageIndex}`);
      if (previewDiv) {
        previewDiv.innerHTML = '';
      }

      // Clear file input
      const fileInputs = document.querySelectorAll('.edit-product-image-input');
      fileInputs.forEach((input: any) => {
        if (input.dataset.index === String(imageIndex)) {
          input.value = '';
        }
      });

      alert('✅ Đã xóa ảnh khỏi Storage thành công!');
    } catch (error: any) {
      console.error('❌ Error deleting image:', error);
      alert(`❌ Lỗi xóa ảnh: ${error.message}`);
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
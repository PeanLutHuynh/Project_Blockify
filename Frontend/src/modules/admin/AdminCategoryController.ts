import { httpClient } from '../../core/api/FetchHttpClient.js';

/**
 * Admin Category Controller
 * Quản lý danh mục sản phẩm
 */
export class AdminCategoryController {
  private categories: any[] = [];
  private listenersSetup: boolean = false; // ✅ Flag to prevent duplicate listeners

  constructor() {
    this.init();
  }

  /**
   * Initialize controller
   */
  private init(): void {
    // Delay setup to ensure DOM is fully ready (especially modals)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.setupEventListeners(), 100);
      });
    } else {
      setTimeout(() => this.setupEventListeners(), 100);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // ✅ Prevent duplicate event listeners
    if (this.listenersSetup) {
      console.log('⚠️ Event listeners already set up, skipping...');
      return;
    }
    
    console.log('🔧 Setting up AdminCategoryController event listeners...');
    
    // Search functionality
    const searchInput = document.getElementById('categorySearch');
    console.log('🔍 Search input found:', !!searchInput);
    if (searchInput) {
      let searchTimeout: any;
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchCategories(target.value);
        }, 500);
      });
    }

    // Add category form
    const categoryForm = document.getElementById('categoryForm');
    console.log('📝 Add category form found:', !!categoryForm);
    if (categoryForm) {
      categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('✅ Form submit prevented, calling handleAddCategory()');
        await this.handleAddCategory();
      });

      // Auto-generate slug from category name
      const categoryNameInput = document.getElementById('categoryName');
      const categorySlugInput = document.getElementById('categorySlug');
      if (categoryNameInput && categorySlugInput) {
        categoryNameInput.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const slug = this.generateSlug(target.value);
          (categorySlugInput as HTMLInputElement).value = slug;
        });
      }
    } else {
      console.error('❌ categoryForm NOT FOUND! Check HTML element ID');
    }

    // Edit category form
    const editCategoryForm = document.getElementById('editCategoryForm');
    console.log('✏️ Edit category form found:', !!editCategoryForm);
    if (editCategoryForm) {
      editCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('✅ Edit form submit prevented, calling handleEditCategory()');
        await this.handleEditCategory();
      });

      // Auto-generate slug on edit form too
      const editCategoryNameInput = document.getElementById('editCategoryName');
      const editCategorySlugInput = document.getElementById('editCategorySlug');
      if (editCategoryNameInput && editCategorySlugInput) {
        editCategoryNameInput.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const slug = this.generateSlug(target.value);
          (editCategorySlugInput as HTMLInputElement).value = slug;
        });
      }
    } else {
      console.error('❌ editCategoryForm NOT FOUND! Check HTML element ID');
    }
    
    // ✅ Mark listeners as set up
    this.listenersSetup = true;
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Generate slug from text (Vietnamese support)
   */
  private generateSlug(text: string): string {
    if (!text) return '';
    
    // Convert to lowercase
    let slug = text.toLowerCase();
    
    // Replace Vietnamese characters
    const vietnameseMap: { [key: string]: string } = {
      'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
      'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
      'ì|í|ị|ỉ|ĩ': 'i',
      'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
      'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
      'ỳ|ý|ỵ|ỷ|ỹ': 'y',
      'đ': 'd',
    };

    for (const pattern in vietnameseMap) {
      slug = slug.replace(new RegExp(pattern, 'g'), vietnameseMap[pattern]);
    }

    // Remove special characters and replace spaces with hyphens
    slug = slug
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return slug;
  }

  /**
   * Load categories
   */
  async loadCategories(): Promise<void> {
    try {
      console.log('📦 Loading categories...');
      
      const response = await httpClient.get('/api/admin/categories');

      console.log('📦 Categories response:', response);

      if (response.success && response.data) {
        this.categories = response.data.categories || [];
        
        console.log('📦 Loaded categories:', this.categories.length);
        
        this.renderCategories();
      } else {
        console.error('❌ Failed to load categories:', response);
        this.showError('Không thể tải danh sách danh mục: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      this.showError('Không thể tải danh sách danh mục');
    }
  }

  /**
   * Search categories
   */
  async searchCategories(query: string): Promise<void> {
    try {
      if (!query || query.trim().length < 2) {
        this.loadCategories();
        return;
      }

      console.log('🔍 Searching categories:', query);

      // Client-side search for now
      const filtered = this.categories.filter(cat => 
        cat.category_name.toLowerCase().includes(query.toLowerCase()) ||
        cat.category_slug.toLowerCase().includes(query.toLowerCase())
      );

      this.categories = filtered;
      this.renderCategories();
    } catch (error) {
      console.error('Error searching categories:', error);
      this.showError('Không thể tìm kiếm danh mục');
    }
  }

  /**
   * Render categories table
   */
  private renderCategories(): void {
    console.log('🎨 Rendering categories...', this.categories.length);
    
    const categoryList = document.getElementById('categoryList');
    const totalCategoriesEl = document.getElementById('totalCategories');
    const categoryCountText = document.getElementById('categoryCountText');
    
    if (!categoryList) {
      console.error('❌ categoryList element not found!');
      return;
    }

    // Update total count
    if (totalCategoriesEl) {
      totalCategoriesEl.textContent = this.categories.length.toString();
    }
    if (categoryCountText) {
      categoryCountText.textContent = `${this.categories.length} Danh Mục`;
    }
    
    console.log('📊 Category count updated:', this.categories.length);

    if (this.categories.length === 0) {
      categoryList.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-5">
            <i class="bi bi-inbox" style="font-size: 3rem;"></i>
            <p class="mt-3">Không tìm thấy danh mục nào</p>
          </td>
        </tr>
      `;
      return;
    }

    categoryList.innerHTML = this.categories
      .map((category) => {
        const isActive = category.is_active !== false;
        const statusBadge = isActive 
          ? '<span class="badge bg-success">Hoạt động</span>'
          : '<span class="badge bg-secondary">Tạm ẩn</span>';
        
        return `
          <tr data-category-id="${category.category_id}">
            <td>${category.category_id}</td>
            <td>
              <div class="fw-medium">${category.category_name}</div>
            </td>
            <td>
              <code class="text-muted">${category.category_slug}</code>
            </td>
            <td>
              <div class="text-truncate" style="max-width: 300px;" title="${category.description || 'N/A'}">
                ${category.description || '<span class="text-muted">Chưa có mô tả</span>'}
              </div>
            </td>
            <td>
              <span class="badge bg-primary">${category.product_count || 0}</span>
            </td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary me-1" onclick="window.adminCategoryController?.openEditModal(${category.category_id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="window.adminCategoryController?.deleteCategory(${category.category_id})">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
  }

  /**
   * Handle add category - Following AdminProductController pattern
   */
  public async handleAddCategory(): Promise<void> {
    try {
      console.log('🚀 Starting category creation...');
      
      const form = document.getElementById('categoryForm') as HTMLFormElement;
      if (!form) {
        console.error('❌ categoryForm not found!');
        return;
      }

      // Get form values directly from inputs
      const categoryNameInput = document.getElementById('categoryName') as HTMLInputElement;
      const categoryDescInput = document.querySelector('#categoryForm textarea[name="description"]') as HTMLTextAreaElement;
      const categoryActiveSelect = document.querySelector('#categoryForm select[name="is_active"]') as HTMLSelectElement;
      
      const categoryName = categoryNameInput?.value?.trim();
      
      console.log('📋 Category info:', { 
        categoryName, 
        description: categoryDescInput?.value,
        is_active: categoryActiveSelect?.value 
      });

      // Validate required fields
      if (!categoryName || categoryName === '') {
        this.showError('Vui lòng nhập tên danh mục!');
        return;
      }

      // Prepare category data (matching backend DTO exactly)
      const categoryData: any = {
        category_name: categoryName,
        description: categoryDescInput?.value?.trim() || undefined,
        is_active: categoryActiveSelect?.value === 'true',
      };

      console.log('📦 Category data to send:', categoryData);

      // Create category
      console.log('🔄 Creating category...');
      const response = await httpClient.post('/api/admin/categories', categoryData);
      
      console.log('📥 Response from backend:', response);

      if (!response.success) {
        console.error('❌ Backend error:', response);
        this.showError(response.error || response.message || 'Không thể thêm danh mục');
        return;
      }

      console.log('✅ Category created successfully!');
      this.showSuccess('Thêm danh mục thành công!');
      
      // Reset form
      form.reset();
      
      // Close modal properly (like AdminProductController)
      const modalEl = document.getElementById('addCategoryModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }
        
        // Clean up backdrop manually
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
        }, 300);
      }

      // Reload categories
      await this.loadCategories();
    } catch (error: any) {
      console.error('❌ Error adding category:', error);
      this.showError(error.message || error.error || 'Không thể thêm danh mục');
    }
  }

  /**
   * Open edit modal
   */
  public async openEditModal(categoryId: number): Promise<void> {
    try {
      const response = await httpClient.get(`/api/admin/categories/${categoryId}`);

      if (response.success && response.data) {
        const category = response.data;

        // Fill form
        (document.getElementById('editCategoryId') as HTMLInputElement).value = category.category_id;
        (document.getElementById('editCategoryName') as HTMLInputElement).value = category.category_name;
        (document.getElementById('editCategorySlug') as HTMLInputElement).value = category.category_slug;
        (document.getElementById('editCategoryDescription') as HTMLTextAreaElement).value = category.description || '';
        (document.getElementById('editCategoryActive') as HTMLSelectElement).value = category.is_active ? 'true' : 'false';

        // Show modal
        const modal = new (window as any).bootstrap.Modal(document.getElementById('editCategoryModal'));
        modal.show();
      }
    } catch (error) {
      console.error('Error loading category:', error);
      this.showError('Không thể tải thông tin danh mục');
    }
  }

  /**
   * Handle edit category - Following AdminProductController pattern
   */
  public async handleEditCategory(): Promise<void> {
    try {
      console.log('🔄 Starting category update...');
      
      const categoryIdInput = document.getElementById('editCategoryId') as HTMLInputElement;
      const categoryId = parseInt(categoryIdInput?.value);
      
      if (!categoryId || isNaN(categoryId)) {
        console.error('❌ Invalid category ID');
        return;
      }

      const form = document.getElementById('editCategoryForm') as HTMLFormElement;
      if (!form) {
        console.error('❌ editCategoryForm not found!');
        return;
      }

      // Get form values directly from inputs
      const categoryNameInput = document.getElementById('editCategoryName') as HTMLInputElement;
      const categoryDescInput = document.getElementById('editCategoryDescription') as HTMLTextAreaElement;
      const categoryActiveSelect = document.getElementById('editCategoryActive') as HTMLSelectElement;
      
      const categoryName = categoryNameInput?.value?.trim();

      console.log('📋 Category info:', { 
        categoryId, 
        categoryName, 
        description: categoryDescInput?.value,
        is_active: categoryActiveSelect?.value 
      });

      // Validate required fields
      if (!categoryName || categoryName === '') {
        this.showError('Vui lòng nhập tên danh mục!');
        return;
      }

      // Prepare category data (matching backend DTO exactly)
      const categoryData: any = {
        category_name: categoryName,
        description: categoryDescInput?.value?.trim() || undefined,
        is_active: categoryActiveSelect?.value === 'true',
      };

      console.log('📦 Category update data:', categoryData);

      // Update category
      console.log('🔄 Updating category...');
      const response = await httpClient.put(`/api/admin/categories/${categoryId}`, categoryData);
      
      console.log('📥 Update response:', response);

      if (!response.success) {
        console.error('❌ Backend error:', response);
        this.showError(response.error || response.message || 'Không thể cập nhật danh mục');
        return;
      }

      console.log('✅ Category updated successfully!');
      this.showSuccess('Cập nhật danh mục thành công!');

      // Close modal properly (like AdminProductController)
      const modalEl = document.getElementById('editCategoryModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }
        
        // Clean up backdrop manually
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
        }, 300);
      }

      // Reload categories
      await this.loadCategories();
    } catch (error: any) {
      console.error('❌ Error updating category:', error);
      this.showError(error.message || error.error || 'Không thể cập nhật danh mục');
    }
  }

  /**
   * Delete category
   */
  public async deleteCategory(categoryId: number): Promise<void> {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này? Tất cả sản phẩm trong danh mục sẽ bị ảnh hưởng.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting category:', categoryId);

      const response = await httpClient.delete(`/api/admin/categories/${categoryId}`);

      if (response.success) {
        this.showSuccess('Xóa danh mục thành công!');
        await this.loadCategories();
      } else {
        this.showError('Không thể xóa danh mục: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      this.showError('Không thể xóa danh mục');
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    // Use console.log instead of alert to avoid duplicate notifications
    console.log('✅ SUCCESS:', message);
    
    // Show Bootstrap toast if available
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = 'toast align-items-center text-white bg-success border-0';
      toast.setAttribute('role', 'alert');
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;
      toastContainer.appendChild(toast);
      const bsToast = new (window as any).bootstrap.Toast(toast);
      bsToast.show();
      
      // Remove after shown
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
    } else {
      // Fallback to alert if no toast container
      alert(message);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    // Use console.error instead of just alert
    console.error('❌ ERROR:', message);
    
    // Show Bootstrap toast if available
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = 'toast align-items-center text-white bg-danger border-0';
      toast.setAttribute('role', 'alert');
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;
      toastContainer.appendChild(toast);
      const bsToast = new (window as any).bootstrap.Toast(toast);
      bsToast.show();
      
      // Remove after shown
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
    } else {
      // Fallback to alert if no toast container
      alert(message);
    }
  }
}

// Export to window for global access
declare global {
  interface Window {
    adminCategoryController?: AdminCategoryController;
  }
}

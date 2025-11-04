/**
 * AdminUserController - Frontend Controller
 * Quản lý users cho admin
 */

import { httpClient } from '../../core/api/FetchHttpClient.js';

interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
}

export class AdminUserController {
  private currentFilter: 'all' | 'active' | 'inactive' = 'all';
  private currentSearchQuery: string = '';
  private users: User[] = [];
  private statistics: UserStatistics | null = null;
  private listenersSetup: boolean = false; // ✅ Flag to prevent duplicate listeners

  constructor() {
    this.init();
  }

  /**
   * Khởi tạo controller
   */
  private init(): void {
    // Setup listeners when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.checkAndLoadData();
      });
    } else {
      this.setupEventListeners();
      this.checkAndLoadData();
    }
  }

  /**
   * Kiểm tra và load data nếu section đang active
   */
  private checkAndLoadData(): void {
    const customerSection = document.getElementById('customer');
    
    // Load data ngay nếu section đang active
    if (customerSection?.classList.contains('active')) {
      this.loadData();
    }
    
    // Setup listener để load data khi switch sang customer section
    document.querySelectorAll('.menu li').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        if (target === 'customer') {
          setTimeout(() => this.loadData(), 100);
        }
      });
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // ✅ Prevent duplicate event listeners
    if (this.listenersSetup) {
      return;
    }
    
    // Wait for DOM elements to be available
    const waitForElements = () => {
      const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
      const filterSelect = document.getElementById('user-status-filter') as HTMLSelectElement;
      
      if (!searchInput || !filterSelect) {
        setTimeout(waitForElements, 100);
        return;
      }
      
      // Search input with debounce
      searchInput.addEventListener('input', this.debounce(() => {
        this.currentSearchQuery = searchInput.value.trim();
        this.loadUsers();
      }, 500));
      
      // Handle Enter key
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.currentSearchQuery = searchInput.value.trim();
          this.loadUsers();
        }
      });

      // Status filter
      filterSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.currentFilter = target.value as 'all' | 'active' | 'inactive';
        this.loadUsers();
      });

      // ✅ Mark listeners as set up
      this.listenersSetup = true;
    };
    
    waitForElements();
  }

  /**
   * Load tất cả dữ liệu
   */
  private async loadData(): Promise<void> {
    await Promise.all([
      this.loadStatistics(),
      this.loadUsers()
    ]);
  }

  /**
   * Load thống kê users
   */
  private async loadStatistics(): Promise<void> {
    try {
      const response = await httpClient.get('/api/admin/users/statistics');
      
      if (response.success && response.data) {
        this.statistics = response.data;
        this.renderStatistics();
      }
    } catch (error: any) {
      console.error('Error loading user statistics:', error);
    }
  }

  /**
   * Load danh sách users
   */
  private async loadUsers(): Promise<void> {
    try {
      // Build URL with query string
      let url = '/api/admin/users?limit=100';

      // Search query
      if (this.currentSearchQuery) {
        url += `&search=${encodeURIComponent(this.currentSearchQuery)}`;
      }

      // Status filter
      if (this.currentFilter !== 'all') {
        url += `&status=${encodeURIComponent(this.currentFilter)}`;
      }

      const response = await httpClient.get(url);
      
      if (response.success && response.data) {
        this.users = response.data.users || [];
        this.renderUsersTable();
        this.renderPagination(response.data.total || 0);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      this.showError('Không thể tải danh sách người dùng');
    }
  }

  /**
   * Render thống kê
   */
  private renderStatistics(): void {
    if (!this.statistics) return;

    const statsContainer = document.getElementById('user-statistics');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <i class="bi bi-people fs-1 text-primary"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-0 small">Tổng người dùng</p>
                  <h3 class="mb-0">${this.statistics.total}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <i class="bi bi-check-circle fs-1 text-success"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-0 small">Đang hoạt động</p>
                  <h3 class="mb-0">${this.statistics.active}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <i class="bi bi-x-circle fs-1 text-danger"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="text-muted mb-0 small">Bị khóa</p>
                  <h3 class="mb-0">${this.statistics.inactive}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render bảng users
   */
  private renderUsersTable(): void {
    const tbody = document.getElementById('users-table-body');
    
    if (!tbody) {
      console.error('users-table-body not found!');
      return;
    }

    if (this.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5">
            <i class="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
            <p class="text-muted mb-0">Không tìm thấy người dùng nào</p>
          </td>
        </tr>
      `;
      return;
    }

    const htmlContent = this.users.map(user => `<tr>
<td>
<div class="d-flex align-items-center">
<img src="${user.avatar_url || '../../public/images/img2.jpg'}" alt="${user.full_name || user.username}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;" onerror="this.src='../../public/images/img2.jpg'">
<div>
<div class="fw-semibold">${this.escapeHtml(user.full_name || user.username)}</div>
<small class="text-muted">@${this.escapeHtml(user.username)}</small>
</div>
</div>
</td>
<td>${this.escapeHtml(user.email)}</td>
<td>${user.phone ? this.escapeHtml(user.phone) : '<span class="text-muted">-</span>'}</td>
<td>${this.formatGender(user.gender)}</td>
<td>${this.formatBirthDate(user.birth_date)}</td>
<td>
<span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">${user.is_active ? 'Đang hoạt động' : 'Bị khóa'}</span>
</td>
<td>
<button class="btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}" onclick="window.adminUserController.toggleUserStatus(${user.user_id}, ${!user.is_active})">
<i class="bi bi-${user.is_active ? 'lock' : 'unlock'}"></i>
${user.is_active ? 'Khóa' : 'Mở khóa'}
</button>
<button class="btn btn-sm btn-info ms-1" onclick="window.adminUserController.showUserDetail(${user.user_id})">
<i class="bi bi-eye"></i>
</button>
</td>
</tr>`).join('');
    
    tbody.innerHTML = htmlContent;
  }

  /**
   * Render pagination
   */
  private renderPagination(total: number): void {
    const paginationContainer = document.getElementById('user-pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(total / 10);
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    // Simple pagination for now
    paginationContainer.innerHTML = `
      <div class="text-muted text-center">
        Tổng: ${total} người dùng
      </div>
    `;
  }

  /**
   * Toggle user status (activate/deactivate)
   */
  public async toggleUserStatus(userId: number, isActive: boolean): Promise<void> {
    const confirmMessage = isActive 
      ? 'Bạn có chắc muốn mở khóa tài khoản này?' 
      : 'Bạn có chắc muốn khóa tài khoản này?';

    if (!confirm(confirmMessage)) return;

    try {
      const response = await httpClient.patch(
        `/api/admin/users/${userId}/status`,
        { is_active: isActive }
      );

      if (response.success) {
        this.showSuccess(response.message || 'Cập nhật trạng thái thành công');
        await this.loadData(); // Reload both statistics and users list
      } else {
        this.showError(response.message || 'Không thể cập nhật trạng thái');
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      this.showError('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  }

  /**
   * Show user detail modal
   */
  public async showUserDetail(userId: number): Promise<void> {
    try {
      const response = await httpClient.get(`/api/admin/users/${userId}`);
      
      if (response.success && response.data) {
        this.renderUserDetailModal(response.data);
      }
    } catch (error: any) {
      console.error('Error loading user detail:', error);
      this.showError('Không thể tải thông tin người dùng');
    }
  }

  /**
   * Render user detail modal
   */
  private renderUserDetailModal(user: User): void {
    const modalHTML = `
      <div class="modal fade" id="userDetailModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-person-circle me-2"></i>
                Chi tiết người dùng
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="text-center mb-4">
                <img 
                  src="${user.avatar_url || '../../public/images/img2.jpg'}" 
                  alt="${user.full_name || user.username}"
                  class="rounded-circle"
                  style="width: 100px; height: 100px; object-fit: cover;"
                  onerror="this.src='../../public/images/img2.jpg'"
                >
              </div>
              
              <table class="table table-borderless">
                <tbody>
                  <tr>
                    <th style="width: 40%">ID:</th>
                    <td>${user.user_id}</td>
                  </tr>
                  <tr>
                    <th>Tên đăng nhập:</th>
                    <td>@${this.escapeHtml(user.username)}</td>
                  </tr>
                  <tr>
                    <th>Họ tên:</th>
                    <td>${this.escapeHtml(user.full_name || '-')}</td>
                  </tr>
                  <tr>
                    <th>Email:</th>
                    <td>${this.escapeHtml(user.email)}</td>
                  </tr>
                  <tr>
                    <th>Số điện thoại:</th>
                    <td>${user.phone ? this.escapeHtml(user.phone) : '-'}</td>
                  </tr>
                  <tr>
                    <th>Giới tính:</th>
                    <td>${this.formatGender(user.gender)}</td>
                  </tr>
                  <tr>
                    <th>Sinh nhật:</th>
                    <td>${this.formatBirthDate(user.birth_date)}</td>
                  </tr>
                  <tr>
                    <th>Trạng thái:</th>
                    <td>
                      <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                        ${user.is_active ? 'Đang hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Ngày tạo:</th>
                    <td>${this.formatDateTime(user.created_at)}</td>
                  </tr>
                  <tr>
                    <th>Cập nhật cuối:</th>
                    <td>${this.formatDateTime(user.updated_at)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('userDetailModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = new (window as any).bootstrap.Modal(document.getElementById('userDetailModal'));
    modal.show();

    // Cleanup on hide
    const modalElement = document.getElementById('userDetailModal');
    if (modalElement) {
      modalElement.addEventListener('hidden.bs.modal', function (this: HTMLElement) {
        this.remove();
      });
    }
  }

  /**
   * Format gender
   */
  private formatGender(gender: 'male' | 'female' | null): string {
    if (!gender) return '<span class="text-muted">-</span>';
    return gender === 'male' ? 'Nam' : 'Nữ';
  }

  /**
   * Format birth date
   */
  private formatBirthDate(date: string | null): string {
    if (!date) return '<span class="text-muted">-</span>';
    
    try {
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return '<span class="text-muted">-</span>';
    }
  }

  /**
   * Format date time
   */
  private formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce helper
   */
  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
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
    adminUserController?: AdminUserController;
  }
}

// Export global instance for inline onclick handlers
(window as any).adminUserController = new AdminUserController();

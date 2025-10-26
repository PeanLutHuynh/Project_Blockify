/**
 * AdminUserSearchController
 * Handles admin user search and management functionality
 */

import userProfileService, { UserProfile, UserAddress } from '../user/UserProfileService.js';
import { authService } from '../../core/services/AuthService.js';

export class AdminUserSearchController {
  private currentPage: number = 1;
  private pageLimit: number = 20;
  private searchTerm: string = '';
  private filterType: string = '';
  private totalPages: number = 1;

  constructor() {
    this.initializeController();
  }

  /**
   * Initialize the controller
   */
  private async initializeController(): Promise<void> {
    // Check if user is admin
    const user = authService.getUser();
    if (!user || (user as any)['role'] !== 'admin') {
      console.error('❌ Not authorized: Admin access required');
      alert('You do not have permission to access this page');
      window.location.href = 'HomePage.html';
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Load initial users
    await this.loadUsers();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search button
    const searchBtn = document.getElementById('btn-search-users');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
    }

    // Search input (Enter key)
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }

    // Filter select
    const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.handleSearch());
    }

    // Pagination buttons
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.handlePreviousPage());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.handleNextPage());
    }
  }

  /**
   * Handle search
   */
  private async handleSearch(): Promise<void> {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const filterSelect = document.getElementById('filter-select') as HTMLSelectElement;

    this.searchTerm = searchInput?.value.trim() || '';
    this.filterType = filterSelect?.value || '';
    this.currentPage = 1; // Reset to first page

    await this.loadUsers();
  }

  /**
   * Load users from API
   */
  private async loadUsers(): Promise<void> {
    try {
      const loadingEl = document.getElementById('loading-indicator');
      if (loadingEl) loadingEl.style.display = 'block';

      const response = await userProfileService.searchUsers(
        this.searchTerm,
        this.currentPage,
        this.pageLimit,
        this.filterType || undefined
      );

      if (loadingEl) loadingEl.style.display = 'none';

      if (response.success && response.data) {
        const { users, pagination } = response.data;
        this.totalPages = pagination.totalPages;

        this.renderUsers(users);
        this.updatePagination(pagination);
      } else {
        console.error('❌ Failed to load users:', response.message);
        this.renderError(response.message);
      }
    } catch (error: any) {
      console.error('❌ Error loading users:', error);
      this.renderError('An error occurred while loading users');
    }
  }

  /**
   * Render users table
   */
  private renderUsers(users: UserProfile[]): void {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    if (users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
            No users found
          </td>
        </tr>
      `;
      return;
    }

    const rows = users.map(user => `
      <tr>
        <td>${user.user_id}</td>
        <td>
          <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random`}" 
               alt="${this.escapeHtml(user.username)}" 
               style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        </td>
        <td>${this.escapeHtml(user.username)}</td>
        <td>${this.escapeHtml(user.email)}</td>
        <td>${this.escapeHtml(user.full_name || '-')}</td>
        <td>${this.escapeHtml(user.phone || '-')}</td>
        <td>
          <span class="status-badge ${user.is_active ? 'active' : 'inactive'}" 
                style="padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                       background: ${user.is_active ? '#4CAF50' : '#f44336'}; 
                       color: white;">
            ${user.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn-view-user" data-user-id="${user.user_id}" 
                  style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px;">
            View
          </button>
          ${user.is_active ? `
            <button class="btn-suspend-user" data-user-id="${user.user_id}" 
                    style="padding: 6px 12px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Suspend
            </button>
          ` : `
            <button class="btn-activate-user" data-user-id="${user.user_id}" 
                    style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Activate
            </button>
          `}
        </td>
      </tr>
    `).join('');

    tableBody.innerHTML = rows;

    // Attach action event listeners
    this.attachUserActionListeners();
  }

  /**
   * Attach event listeners to user action buttons
   */
  private attachUserActionListeners(): void {
    // View user buttons
    document.querySelectorAll('.btn-view-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = parseInt((e.target as HTMLElement).dataset.userId || '0');
        this.handleViewUser(userId);
      });
    });

    // Suspend user buttons
    document.querySelectorAll('.btn-suspend-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = parseInt((e.target as HTMLElement).dataset.userId || '0');
        this.handleSuspendUser(userId);
      });
    });

    // Activate user buttons
    document.querySelectorAll('.btn-activate-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = parseInt((e.target as HTMLElement).dataset.userId || '0');
        this.handleActivateUser(userId);
      });
    });
  }

  /**
   * Handle view user details
   */
  private async handleViewUser(userId: number): Promise<void> {
    try {
      const response = await userProfileService.getFullUserProfile(userId);

      if (response.success && response.data) {
        this.showUserDetailsModal(response.data.user, response.data.addresses);
      } else {
        alert(response.message || 'Failed to load user details');
      }
    } catch (error: any) {
      console.error('❌ Error loading user details:', error);
      alert('An error occurred while loading user details');
    }
  }

  /**
   * Show user details modal
   */
  private showUserDetailsModal(user: UserProfile, addresses: UserAddress[]): void {
    const modal = document.getElementById('user-details-modal');
    if (!modal) {
      console.error('User details modal not found');
      return;
    }

    // Populate modal content
    const modalContent = `
      <div style="padding: 1rem;">
        <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
          <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random`}" 
               alt="${this.escapeHtml(user.username)}" 
               style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-right: 1rem;">
          <div>
            <h2 style="margin: 0;">${this.escapeHtml(user.full_name || user.username)}</h2>
            <p style="margin: 0.25rem 0; color: #666;">@${this.escapeHtml(user.username)}</p>
            <span class="status-badge ${user.is_active ? 'active' : 'inactive'}" 
                  style="padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                         background: ${user.is_active ? '#4CAF50' : '#f44336'}; 
                         color: white;">
              ${user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h3>Profile Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>User ID:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${user.user_id}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${this.escapeHtml(user.email)}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${this.escapeHtml(user.phone || '-')}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Gender:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${user.gender || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Birth Date:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${user.birth_date || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Created:</strong></td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${new Date(user.created_at).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div>
          <h3>Addresses (${addresses.length})</h3>
          ${addresses.length === 0 ? '<p style="color: #666;">No addresses found</p>' : addresses.map(addr => `
            <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; position: relative;">
              ${addr.is_default ? '<span style="position: absolute; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Default</span>' : ''}
              <h4 style="margin: 0 0 0.5rem 0;">${this.escapeHtml(addr.address_name)}</h4>
              <p style="margin: 0 0 0.5rem 0;">${this.escapeHtml(addr.full_address)}</p>
              <p style="margin: 0; color: #888; font-size: 14px;">
                ${this.escapeHtml(addr.ward)}, ${this.escapeHtml(addr.district)}, ${this.escapeHtml(addr.city)}
                ${addr.postal_code ? ` - ${this.escapeHtml(addr.postal_code)}` : ''}
              </p>
            </div>
          `).join('')}
        </div>

        <div style="text-align: right; margin-top: 1.5rem;">
          <button id="btn-close-modal" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    `;

    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = modalContent;
    }

    modal.style.display = 'block';

    // Close button
    const closeBtn = document.getElementById('btn-close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
  }

  /**
   * Handle suspend user
   */
  private async handleSuspendUser(userId: number): Promise<void> {
    const reason = prompt('Enter reason for suspending this user:');
    if (!reason) return;

    try {
      const response = await userProfileService.suspendUser(userId, reason);

      if (response.success) {
        alert('User suspended successfully');
        await this.loadUsers(); // Refresh list
      } else {
        alert(response.message || 'Failed to suspend user');
      }
    } catch (error: any) {
      console.error('❌ Error suspending user:', error);
      alert('An error occurred while suspending user');
    }
  }

  /**
   * Handle activate user
   */
  private async handleActivateUser(userId: number): Promise<void> {
    if (!confirm('Are you sure you want to activate this user?')) {
      return;
    }

    try {
      const response = await userProfileService.activateUser(userId);

      if (response.success) {
        alert('User activated successfully');
        await this.loadUsers(); // Refresh list
      } else {
        alert(response.message || 'Failed to activate user');
      }
    } catch (error: any) {
      console.error('❌ Error activating user:', error);
      alert('An error occurred while activating user');
    }
  }

  /**
   * Update pagination UI
   */
  private updatePagination(pagination: any): void {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('btn-prev-page') as HTMLButtonElement;
    const nextBtn = document.getElementById('btn-next-page') as HTMLButtonElement;

    if (pageInfo) {
      pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages} (Total: ${pagination.total} users)`;
    }

    if (prevBtn) {
      prevBtn.disabled = pagination.page <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = pagination.page >= pagination.totalPages;
    }
  }

  /**
   * Handle previous page
   */
  private async handlePreviousPage(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadUsers();
    }
  }

  /**
   * Handle next page
   */
  private async handleNextPage(): Promise<void> {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadUsers();
    }
  }

  /**
   * Render error message
   */
  private renderError(message: string): void {
    const tableBody = document.getElementById('users-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #f44336;">
            ❌ ${this.escapeHtml(message)}
          </td>
        </tr>
      `;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize controller when DOM is ready (if on admin page)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('Admin')) {
      new AdminUserSearchController();
    }
  });
} else {
  if (window.location.pathname.includes('Admin')) {
    new AdminUserSearchController();
  }
}

import { userService } from '@/core/api/services';
import { authStore, toastStore } from '@/core/services';
import { validateEmail, validateUsername, validatePhone } from '@/core/utils';
import { User, UpdateUserDto } from '@/types';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, ROUTES } from '@/shared/constants';

/**
 * User Profile Controller
 * Handles user profile management, avatar upload, and account settings
 */
export class UserController {
  private form!: HTMLFormElement;
  private emailInput!: HTMLInputElement;
  private usernameInput!: HTMLInputElement;
  private firstNameInput!: HTMLInputElement;
  private lastNameInput!: HTMLInputElement;
  private phoneInput!: HTMLInputElement;
  private avatarInput!: HTMLInputElement;
  private avatarPreview!: HTMLImageElement;
  private saveButton!: HTMLButtonElement;
  private currentUser: User | null = null;

  constructor() {
    this.checkAuthentication();
    this.initializeElements();
    this.setupEventListeners();
    this.loadUserData();
  }

  /**
   * Check if user is authenticated
   */
  private checkAuthentication(): void {
    const authState = authStore.getState();
    if (!authState.isAuthenticated) {
      window.location.href = ROUTES.SIGN_IN;
      return;
    }
    this.currentUser = authState.user;
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): void {
    this.form = document.querySelector('#profileForm') as HTMLFormElement;
    this.emailInput = document.getElementById('email') as HTMLInputElement;
    this.usernameInput = document.getElementById('username') as HTMLInputElement;
    this.firstNameInput = document.getElementById('firstName') as HTMLInputElement;
    this.lastNameInput = document.getElementById('lastName') as HTMLInputElement;
    this.phoneInput = document.getElementById('phone') as HTMLInputElement;
    this.avatarInput = document.getElementById('avatar') as HTMLInputElement;
    this.avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
    this.saveButton = document.querySelector('#saveProfile') as HTMLButtonElement;

    if (!this.form) {
      throw new Error('Profile form not found');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Avatar upload
    this.avatarInput?.addEventListener('change', this.handleAvatarChange.bind(this));

    // Real-time validation
    this.emailInput?.addEventListener('blur', this.validateEmailField.bind(this));
    this.usernameInput?.addEventListener('blur', this.validateUsernameField.bind(this));
    this.phoneInput?.addEventListener('blur', this.validatePhoneField.bind(this));

    // Clear validation on input
    [this.emailInput, this.usernameInput, this.phoneInput].forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.clearFieldValidation(input));
      }
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  /**
   * Load current user data into form
   */
  private loadUserData(): void {
    if (!this.currentUser) return;

    if (this.emailInput) this.emailInput.value = this.currentUser.email || '';
    if (this.usernameInput) this.usernameInput.value = this.currentUser.username || '';
    if (this.firstNameInput) this.firstNameInput.value = this.currentUser.firstName || '';
    if (this.lastNameInput) this.lastNameInput.value = this.currentUser.lastName || '';
    if (this.phoneInput) this.phoneInput.value = this.currentUser.phone || '';
    
    // Load avatar
    if (this.avatarPreview && this.currentUser.avatar) {
      this.avatarPreview.src = this.currentUser.avatar;
      this.avatarPreview.style.display = 'block';
    }

    // Update page title with user name
    const userName = this.currentUser.firstName 
      ? `${this.currentUser.firstName} ${this.currentUser.lastName || ''}`.trim()
      : this.currentUser.username;
    
    const welcomeText = document.querySelector('.welcome-text');
    if (welcomeText) {
      welcomeText.textContent = `Xin chào, ${userName}!`;
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    const updateData: UpdateUserDto = {
      firstName: this.firstNameInput?.value.trim() || undefined,
      lastName: this.lastNameInput?.value.trim() || undefined,
      phone: this.phoneInput?.value.trim() || undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateUserDto] === undefined) {
        delete updateData[key as keyof UpdateUserDto];
      }
    });

    this.setLoading(true);

    try {
      const response = await userService.updateUser(this.currentUser!.id, updateData);

      if (response.success && response.data) {
        // Update auth store with new user data
        authStore.updateUser(response.data);
        this.currentUser = response.data;

        toastStore.success(SUCCESS_MESSAGES.PROFILE_UPDATED);
        
        // Reload user data to reflect changes
        this.loadUserData();
      } else {
        this.showError(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      if (error.response?.status === 409) {
        this.showError('Email hoặc tên đăng nhập đã được sử dụng');
      } else if (error.response?.status === 422) {
        this.showError('Dữ liệu không hợp lệ');
      } else {
        this.showError(ERROR_MESSAGES.NETWORK_ERROR);
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle avatar file change
   */
  private async handleAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toastStore.error('Lỗi', 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)');
      input.value = '';
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toastStore.error('Lỗi', 'Kích thước file không được vượt quá 5MB');
      input.value = '';
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.avatarPreview && e.target?.result) {
        this.avatarPreview.src = e.target.result as string;
        this.avatarPreview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);

    // Upload avatar
    this.setLoading(true);
    try {
      const response = await userService.uploadAvatar(file, (progress) => {
        // Update progress indicator if needed
        console.log(`Upload progress: ${progress}%`);
      });

      if (response.success && response.data) {
        // Update user avatar in store
        const updatedUser = { ...this.currentUser!, avatar: response.data.avatarUrl };
        authStore.updateUser(updatedUser);
        this.currentUser = updatedUser;

        toastStore.success('Thành công', 'Cập nhật ảnh đại diện thành công');
      } else {
        this.showError('Không thể tải lên ảnh đại diện');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      this.showError('Lỗi khi tải lên ảnh đại diện');
      
      // Reset preview
      if (this.avatarPreview) {
        this.avatarPreview.src = this.currentUser?.avatar || '';
        this.avatarPreview.style.display = this.currentUser?.avatar ? 'block' : 'none';
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Validate entire form
   */
  private validateForm(): boolean {
    const isEmailValid = this.validateEmailField();
    const isUsernameValid = this.validateUsernameField();
    const isPhoneValid = this.validatePhoneField();

    return isEmailValid && isUsernameValid && isPhoneValid;
  }

  /**
   * Validate email field
   */
  private validateEmailField(): boolean {
    if (!this.emailInput) return true;
    
    const email = this.emailInput.value.trim();
    
    if (!email) {
      this.showFieldError(this.emailInput, 'Email là bắt buộc');
      return false;
    }

    if (!validateEmail(email)) {
      this.showFieldError(this.emailInput, 'Định dạng email không hợp lệ');
      return false;
    }

    this.showFieldSuccess(this.emailInput);
    return true;
  }

  /**
   * Validate username field
   */
  private validateUsernameField(): boolean {
    if (!this.usernameInput) return true;
    
    const username = this.usernameInput.value.trim();
    
    if (!username) {
      this.showFieldError(this.usernameInput, 'Tên đăng nhập là bắt buộc');
      return false;
    }

    const validation = validateUsername(username);
    if (!validation.isValid) {
      this.showFieldError(this.usernameInput, validation.errors[0]);
      return false;
    }

    this.showFieldSuccess(this.usernameInput);
    return true;
  }

  /**
   * Validate phone field
   */
  private validatePhoneField(): boolean {
    if (!this.phoneInput) return true;
    
    const phone = this.phoneInput.value.trim();
    
    if (phone) {
      const validation = validatePhone(phone);
      if (!validation.isValid) {
        this.showFieldError(this.phoneInput, validation.errors[0]);
        return false;
      }
    }

    this.showFieldSuccess(this.phoneInput);
    return true;
  }

  /**
   * Show field error
   */
  private showFieldError(input: HTMLInputElement, message: string): void {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    
    const feedback = input.parentElement?.querySelector('.invalid-feedback') as HTMLElement;
    if (feedback) {
      feedback.textContent = message;
    }
  }

  /**
   * Show field success
   */
  private showFieldSuccess(input: HTMLInputElement): void {
    input.classList.add('is-valid');
    input.classList.remove('is-invalid');
  }

  /**
   * Clear field validation
   */
  private clearFieldValidation(input: HTMLInputElement): void {
    input.classList.remove('is-valid', 'is-invalid');
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    if (this.saveButton) {
      this.saveButton.disabled = loading;
      this.saveButton.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...'
        : '<i class="fas fa-save me-2"></i>Lưu thay đổi';
    }

    // Disable form inputs
    const inputs = [this.emailInput, this.usernameInput, this.firstNameInput, this.lastNameInput, this.phoneInput];
    inputs.forEach(input => {
      if (input) input.disabled = loading;
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    toastStore.error('Lỗi', message);
  }

  /**
   * Handle logout
   */
  private async handleLogout(): Promise<void> {
    try {
      await authStore.clearAuth();
      toastStore.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
      
      setTimeout(() => {
        window.location.href = ROUTES.SIGN_IN;
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      authStore.clearAuth();
      window.location.href = ROUTES.SIGN_IN;
    }
  }
}

/**
 * User Management Controller (Admin only)
 */
export class UserManagementController {
  private userList: User[] = [];
  private currentPage = 1;
  private pageSize = 10;
  private totalUsers = 0;

  constructor() {
    this.checkAdminPermission();
    this.initializeElements();
    this.setupEventListeners();
    this.loadUsers();
  }

  /**
   * Check if user has admin permission
   */
  private checkAdminPermission(): void {
    const authState = authStore.getState();
    if (!authState.isAuthenticated || !authState.user || authState.user.role !== 'admin') {
      window.location.href = ROUTES.HOME;
      return;
    }
  }

  private initializeElements(): void {
    // Implementation for admin user management
    console.log('User Management Controller initialized');
  }

  private setupEventListeners(): void {
    // Implementation for admin events
  }

  /**
   * Load users list
   */
  private async loadUsers(): Promise<void> {
    try {
      const response = await userService.getUsers(this.currentPage, this.pageSize);
      
      if (response.success && response.data) {
        this.userList = response.data;
        this.totalUsers = response.pagination?.total || 0;
        this.renderUserList();
        this.renderPagination();
      }
    } catch (error) {
      console.error('Load users error:', error);
      toastStore.error('Lỗi', 'Không thể tải danh sách người dùng');
    }
  }

  private renderUserList(): void {
    // Implementation for rendering user list
    console.log('Rendering user list:', this.userList);
  }

  private renderPagination(): void {
    // Implementation for pagination
    const totalPages = Math.ceil(this.totalUsers / this.pageSize);
    console.log('Rendering pagination:', { currentPage: this.currentPage, totalPages, totalUsers: this.totalUsers });
  }
}

// Export for use in specific pages
export const userController = new UserController();
export const userManagementController = new UserManagementController();
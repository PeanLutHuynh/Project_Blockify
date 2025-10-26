import { authService } from '../../core/services/AuthService.js';
import { httpClient } from '../../core/api/FetchHttpClient.js';
import { User } from '../../core/models/User.js';
import userProfileService, { UserAddress } from './UserProfileService.js';

/**
 * AccountController
 * Handles user account page operations
 * Following MVC pattern - this is the Controller
 */
export class AccountController {
  private currentUser: User | null = null;
  private addresses: UserAddress[] = [];
  public editingAddressId: number | null = null;
  // private isEditingProfile: boolean = false; // TODO: Re-enable for readonly mode

  constructor() {
    this.initializePage();
    // Expose to window for HTML onclick handlers
    (window as any).accountControllerInstance = this;
  }

  /**
   * Initialize account page
   */
  async initializePage(): Promise<void> {
    console.log('🔧 Initializing Account page...');
    console.log('📝 Current user from constructor:', this.currentUser);
    
    const isAuthenticated = await this.checkAuthentication();
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, redirecting...');
      return;
    }

    console.log('✅ User authenticated, current user:', this.currentUser);
    console.log('🆔 User ID:', this.currentUser?.id);

    // Load user profile if not already loaded
    await this.loadUserProfile();
    console.log('📊 After loadUserProfile, user ID:', this.currentUser?.id);

    // Load addresses
    await this.loadAddresses();

    // Setup date dropdowns
    this.setupDateDropdowns();

    // Set up event listeners for the UI elements
    this.setupEventListeners();
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuthentication(): Promise<boolean> {
    // Check local auth state first
    const isLocalAuth = authService.isAuthenticated();
    const localUser = authService.getUser();
    
    if (isLocalAuth && localUser) {
      console.log('✅ User authenticated via local state:', localUser.email);
      this.currentUser = localUser;
      return true;
    }

    // If no local auth, check Supabase session
    const isSupabaseAuth = await authService.isSupabaseAuthenticated();
    
    if (!isSupabaseAuth) {
      console.warn('⚠️ No authentication found, redirecting to sign in');
      this.redirectToSignIn();
      return false;
    }

    // Try to get current user from backend using Supabase token
    console.warn('⚠️ Supabase session exists but no local auth, fetching from backend...');
    const result = await authService.getCurrentUser();
    
    if (!result.success || !result.user) {
      console.error('❌ Failed to get user profile from backend');
      this.redirectToSignIn();
      return false;
    }
    
    this.currentUser = result.user;
    return true;
  }

  /**
   * Load user profile data
   */
  private async loadUserProfile(): Promise<void> {
    if (!this.currentUser) {
      // Try to fetch from backend
      const result = await authService.getCurrentUser();
      
      if (result.success && result.user) {
        this.currentUser = result.user;
      } else {
        console.error('❌ Failed to load user profile');
        this.redirectToSignIn();
        return;
      }
    }

    // Populate user data in the UI
    this.populateUserData();
  }

  /**
   * Populate user data into form fields
   */
  private populateUserData(): void {
    if (!this.currentUser) return;

    console.log('📋 Populating user data:', this.currentUser);

    // Update sidebar avatar and username
    const sidebarAvatar = document.querySelector('.user-info .avatar') as HTMLImageElement;
    const sidebarUsername = document.querySelector('.user-info .username') as HTMLElement;
    
    if (sidebarAvatar) {
      sidebarAvatar.src = this.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.getDisplayName())}&background=random`;
    }
    
    if (sidebarUsername) {
      sidebarUsername.textContent = this.currentUser.username || this.currentUser.email;
    }

    // Update form inputs
    const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[placeholder="Enter your email"]') as HTMLInputElement;
    const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
    
    if (nameInput) {
      nameInput.value = this.currentUser.fullName || '';
    }
    
    if (emailInput) {
      emailInput.value = this.currentUser.email || '';
      emailInput.disabled = true; // Email cannot be changed
    }
    
    if (phoneInput) {
      phoneInput.value = this.currentUser.phone || '';
    }

    // Update gender radio buttons
    if (this.currentUser.gender) {
      const genderRadio = document.querySelector(`input[name="sex"][value="${this.currentUser.gender}"]`) as HTMLInputElement;
      if (genderRadio) {
        genderRadio.checked = true;
      }
    }

    // Update birth date dropdowns
    if (this.currentUser.birthDate) {
      const birthDateStr = this.currentUser.birthDate instanceof Date 
        ? this.currentUser.birthDate.toISOString() 
        : this.currentUser.birthDate;
      this.populateBirthDate(birthDateStr);
    }

    // Update large avatar in the profile section
    const largeAvatar = document.querySelector('.large-avatar') as HTMLImageElement;
    if (largeAvatar) {
      largeAvatar.src = this.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.getDisplayName())}&background=random`;
    }

    // Set fields to readonly mode by default
    this.setProfileFieldsReadonly(true);

    console.log('✅ User data populated successfully');
  }

  /**
   * Populate birth date into dropdowns
   */
  private populateBirthDate(birthDate: string): void {
    try {
      const date = new Date(birthDate);
      const day = date.getDate();
      const month = date.getMonth() + 1; // 0-indexed
      const year = date.getFullYear();

      const dayButton = document.getElementById('day-button');
      const monthButton = document.getElementById('month-button');
      const yearButton = document.getElementById('year-button');

      if (dayButton) dayButton.textContent = day.toString();
      
      if (monthButton) {
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                           'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        monthButton.textContent = monthNames[month - 1];
        monthButton.setAttribute('data-value', month.toString());
      }
      
      if (yearButton) yearButton.textContent = year.toString();

      console.log('✅ Birth date populated:', { day, month, year });
    } catch (error) {
      console.error('❌ Error parsing birth date:', error);
    }
  }

  /**
   * Set profile fields readonly or editable
   */
  private setProfileFieldsReadonly(readonly: boolean): void {
    const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
    const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
    const genderRadios = document.querySelectorAll('input[name="sex"]') as NodeListOf<HTMLInputElement>;
    const dayButton = document.getElementById('day-button') as HTMLButtonElement;
    const monthButton = document.getElementById('month-button') as HTMLButtonElement;
    const yearButton = document.getElementById('year-button') as HTMLButtonElement;

    if (nameInput) nameInput.disabled = readonly;
    if (phoneInput) phoneInput.disabled = readonly;
    genderRadios.forEach(radio => radio.disabled = readonly);
    
    // Disable/enable dropdown buttons
    if (dayButton) dayButton.disabled = readonly;
    if (monthButton) monthButton.disabled = readonly;
    if (yearButton) yearButton.disabled = readonly;

    // Update button visibility
    this.updateProfileButtons(readonly);
  }

  /**
   * Update profile buttons based on edit mode
   */
  private updateProfileButtons(readonly: boolean): void {
    const buttons = document.querySelectorAll('.btn-primary-custom');
    buttons.forEach(btn => {
      const btnText = btn.textContent?.trim();
      if (btnText === 'Lưu' || btnText === 'Save') {
        (btn as HTMLButtonElement).style.display = readonly ? 'none' : 'inline-block';
      }
      if (btnText === 'Cập nhật' || btnText === 'Update') {
        (btn as HTMLButtonElement).style.display = readonly ? 'inline-block' : 'none';
      }
    });
  }

  /**
   * Handle edit profile button click
   */
  public handleEditProfile(): void {
    console.log('🔓 Enabling edit mode');
    this.setProfileFieldsReadonly(false);
  }

  /**
   * Handle avatar upload
   */
  public async handleAvatarUpload(): Promise<void> {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh');
        return;
      }
      
      try {
        // Show loading state
        const avatars = document.querySelectorAll('.avatar, .large-avatar') as NodeListOf<HTMLImageElement>;
        const originalSrcs: string[] = [];
        
        avatars.forEach((avatar, index) => {
          originalSrcs[index] = avatar.src;
          avatar.style.opacity = '0.5';
        });
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          avatars.forEach(avatar => {
            avatar.src = base64String;
          });
        };
        reader.readAsDataURL(file);
        
        // Upload to backend
        console.log('🔍 Checking authentication...');
        console.log('  - currentUser:', this.currentUser);
        console.log('  - currentUser.id:', this.currentUser?.id);
        
        if (!this.currentUser?.id) {
          console.error('❌ No current user ID');
          alert('Vui lòng đăng nhập lại');
          avatars.forEach((avatar, index) => {
            avatar.src = originalSrcs[index];
            avatar.style.opacity = '1';
          });
          return;
        }

        console.log('📤 Uploading avatar for user:', this.currentUser.id);

        const formData = new FormData();
        formData.append('avatar', file);

        const token = localStorage.getItem('blockify_auth_token');
        console.log('🔑 Token exists:', !!token);
        
        if (!token) {
          console.error('❌ No access token');
          alert('Vui lòng đăng nhập lại');
          avatars.forEach((avatar, index) => {
            avatar.src = originalSrcs[index];
            avatar.style.opacity = '1';
          });
          return;
        }

        const response = await fetch(`http://localhost:3001/api/v1/users/${this.currentUser.id}/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', [...response.headers.entries()]);

        const result = await response.json();
        console.log('📡 Response body:', result);

        if (result.success && response.ok) {
          console.log('✅ Avatar uploaded successfully:', result.data);
          
          alert('Cập nhật ảnh đại diện thành công!');
          
          // Update user data from response
          if (result.data && result.data.avatar_url) {
            // Create new user object with updated avatar
            const updatedUser = User.fromApiResponse(result.data);
            this.currentUser = updatedUser;
            authService['setCurrentUser'](updatedUser);
            
            // Update all avatars with new URL
            avatars.forEach(avatar => {
              avatar.src = result.data.avatar_url;
            });
          }
        } else {
          console.error('❌ Failed to upload avatar:', result.message);
          alert(result.message || 'Không thể cập nhật ảnh đại diện');
          
          // Restore original images
          avatars.forEach((avatar, index) => {
            avatar.src = originalSrcs[index];
          });
        }
        
        // Restore opacity
        avatars.forEach(avatar => {
          avatar.style.opacity = '1';
        });
        
      } catch (error: any) {
        console.error('❌ Error uploading avatar:', error);
        alert('Có lỗi xảy ra khi tải ảnh lên');
        
        // Restore opacity
        const avatars = document.querySelectorAll('.avatar, .large-avatar') as NodeListOf<HTMLImageElement>;
        avatars.forEach(avatar => {
          avatar.style.opacity = '1';
        });
      }
    };
    
    // Trigger file input click
    fileInput.click();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Find all Save/Update buttons by text content (Vietnamese)
    const buttons = document.querySelectorAll('.btn-primary-custom');
    buttons.forEach(btn => {
      const btnText = btn.textContent?.trim();
      // Lưu button
      if (btnText === 'Lưu' || btnText === 'Save') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSaveProfile();
        });
      }
      // Cập nhật button - enable editing
      if (btnText === 'Cập nhật' || btnText === 'Update') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleEditProfile();
        });
      }
    });

    console.log('✅ Event listeners setup complete');
  }

  /**
   * Setup date dropdowns
   */
  private setupDateDropdowns(): void {
    const dayMenu = document.getElementById('day-menu');
    const monthMenu = document.getElementById('month-menu');
    const yearMenu = document.getElementById('year-menu');
    
    const dayButton = document.getElementById('day-button');
    const monthButton = document.getElementById('month-button');
    const yearButton = document.getElementById('year-button');

    // Populate days (1-31)
    if (dayMenu) {
      for (let i = 1; i <= 31; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${i}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (dayButton) dayButton.textContent = i.toString();
        });
        dayMenu.appendChild(li);
      }
    }

    // Populate months (1-12) - Vietnamese names
    if (monthMenu) {
      const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                          'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
      for (let i = 1; i <= 12; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${monthNames[i-1]}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (monthButton) {
            monthButton.textContent = monthNames[i-1];
            monthButton.setAttribute('data-value', i.toString());
          }
        });
        monthMenu.appendChild(li);
      }
    }

    // Populate years (current year - 100 to current year)
    if (yearMenu) {
      const currentYear = new Date().getFullYear();
      for (let i = currentYear; i >= currentYear - 100; i--) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${i}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (yearButton) yearButton.textContent = i.toString();
        });
        yearMenu.appendChild(li);
      }
    }

    console.log('✅ Date dropdowns setup complete');
  }

  /**
   * Get date dropdown value
   */
  private getDateDropdownValue(type: 'day' | 'month' | 'year'): number | null {
    const button = document.getElementById(`${type}-button`);
    if (!button || !button.textContent) return null;

    if (type === 'month') {
      const dataValue = button.getAttribute('data-value');
      if (dataValue) return parseInt(dataValue);
      return null;
    }

    const value = parseInt(button.textContent);
    return isNaN(value) ? null : value;
  }

  /**
   * Handle save profile
   */
  private async handleSaveProfile(): Promise<void> {
    console.log('💾 handleSaveProfile called');
    console.log('📊 currentUser:', this.currentUser);
    console.log('🆔 currentUser?.id:', this.currentUser?.id);
    
    // If no user or no user ID, try to reload from backend
    if (!this.currentUser || !this.currentUser.id) {
      console.warn('⚠️ Current user missing or no ID, attempting to reload...');
      
      const result = await authService.getCurrentUser();
      if (result.success && result.user && result.user.id) {
        console.log('✅ User reloaded successfully, ID:', result.user.id);
        this.currentUser = result.user;
      } else {
        console.error('❌ Failed to reload user');
        alert('Vui lòng đăng nhập lại');
        return;
      }
    }

    try {
      const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
      const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
      
      const genderRadio = document.querySelector('input[name="sex"]:checked') as HTMLInputElement;

      // Get date values from dropdowns
      const day = this.getDateDropdownValue('day');
      const month = this.getDateDropdownValue('month');
      const year = this.getDateDropdownValue('year');

      const updateData: any = {};

      // Only include fields that have values
      if (nameInput?.value?.trim()) {
        const fullName = nameInput.value.trim();
        if (fullName.length < 2) {
          alert('Tên phải có ít nhất 2 ký tự');
          return;
        }
        if (fullName.length > 100) {
          alert('Tên không được vượt quá 100 ký tự');
          return;
        }
        updateData.fullName = fullName;
      }

      if (phoneInput?.value?.trim()) {
        const phone = phoneInput.value.trim().replace(/\s/g, '');
        // Validate Vietnam phone: 10 digits, starts with 0
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
          alert('Số điện thoại không hợp lệ. Phải là số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 0)');
          return;
        }
        updateData.phone = phone;
      }

      if (genderRadio?.value) {
        const gender = genderRadio.value.toLowerCase();
        if (!['male', 'female', 'other'].includes(gender)) {
          alert('Giới tính không hợp lệ');
          return;
        }
        updateData.gender = gender;
      }

      // Add birth date only if ALL values are selected and valid
      if (day && month && year && day > 0 && month > 0 && year > 0) {
        // Validate date is not in future
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        
        if (birthDate > today) {
          alert('Ngày sinh không thể là ngày trong tương lai');
          return;
        }
        
        // Validate user age >= 13
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        
        if (adjustedAge < 13) {
          alert('Bạn phải ít nhất 13 tuổi');
          return;
        }
        
        // Validate reasonable date (not before 1900)
        if (year < 1900 || adjustedAge > 150) {
          alert('Ngày sinh không hợp lệ');
          return;
        }
        
        // Format as ISO string for backend
        updateData.birthDate = birthDate.toISOString();
      }

      console.log('📤 Updating profile with data:', updateData);
      console.log('📤 User ID:', this.currentUser.id);

      // Validate that we have at least one field to update
      if (Object.keys(updateData).length === 0) {
        alert('Không có thông tin nào để cập nhật');
        return;
      }

      // Call backend API to update user profile
      const response = await httpClient.put<any>(`/api/v1/users/${this.currentUser.id}/profile`, updateData);

      if (response.success && response.data) {
        console.log('✅ Profile updated successfully');
        
        // Update local user data
        const updatedUser = User.fromApiResponse(response.data);
        this.currentUser = updatedUser;
        
        // Update auth service state
        authService['setCurrentUser'](updatedUser);
        
        alert('Cập nhật thông tin thành công!');
        
        // Reset to readonly mode
        this.setProfileFieldsReadonly(true);
        
        // Refresh UI
        this.populateUserData();
      } else {
        console.error('❌ Failed to update profile:', response.message);
        
        // Show more specific error message
        const errorMsg = response.message || response.error || 'Không thể cập nhật thông tin';
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      console.error('Error details:', error.response?.data);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Có lỗi xảy ra khi cập nhật thông tin';
      
      alert('Lỗi: ' + errorMessage);
    }
  }

  /**
   * Redirect to sign in page
   */
  private redirectToSignIn(): void {
    console.log('🔄 Redirecting to sign in page...');
    window.location.href = 'SigninPage.html';
  }

  /**
   * ========================================
   * ADDRESS MANAGEMENT METHODS
   * ========================================
   */

  /**
   * Get user ID as number
   */
  private getUserId(): number {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('❌ getUserId called but no currentUser or id');
      console.log('📊 currentUser:', this.currentUser);
      return 0; // Return 0 instead of throwing error
    }
    const userId = typeof this.currentUser.id === 'string' ? parseInt(this.currentUser.id) : this.currentUser.id;
    console.log('🆔 getUserId returning:', userId);
    return userId;
  }

  /**
   * Load user addresses
   */
  private async loadAddresses(): Promise<void> {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn('⚠️ Cannot load addresses: no current user');
      return;
    }

    try {
      const userId = this.getUserId();
      if (!userId) {
        console.warn('⚠️ Cannot load addresses: invalid user ID');
        return;
      }
      
      const response = await userProfileService.getUserAddresses(userId);

      if (response.success && response.data) {
        this.addresses = response.data;
        this.renderAddresses();
      } else {
        console.error('❌ Failed to load addresses:', response.message);
      }
    } catch (error: any) {
      console.error('❌ Error loading addresses:', error);
    }
  }

  /**
   * Render addresses list
   */
  private renderAddresses(): void {
    const addressContainer = document.getElementById('addresses-list');
    if (!addressContainer) return;

    if (this.addresses.length === 0) {
      addressContainer.innerHTML = '<p style="color: #666; padding: 1rem;">Chưa có địa chỉ nào. Nhấn "+ Thêm địa chỉ" để thêm mới.</p>';
      return;
    }

    const addressesHTML = this.addresses.map(addr => `
      <div class="address-card">
        <div class="d-flex justify-content-between mb-2">
          <div>
            <strong>${this.escapeHtml(addr.address_name)}</strong>
            ${addr.is_default ? '<span class="badge badge-default">Mặc định</span>' : ''}
          </div>
          <div class="text-muted small" style="cursor: pointer;">
            <span onclick="editAddress(${addr.address_id})">Chỉnh sửa</span> • 
            <span onclick="deleteAddress(${addr.address_id})">Xóa</span>
            ${!addr.is_default ? ` • <span onclick="setDefaultAddress(${addr.address_id})">Đặt mặc định</span>` : ''}
          </div>
        </div>
        <div>${this.escapeHtml(addr.full_address)}</div>
        <div>${this.escapeHtml(addr.ward)}, ${this.escapeHtml(addr.district)}, ${this.escapeHtml(addr.city)}</div>
        ${addr.postal_code ? `<div>Mã bưu điện: ${this.escapeHtml(addr.postal_code)}</div>` : ''}
      </div>
    `).join('');

    addressContainer.innerHTML = addressesHTML;
  }

  /**
   * Handle edit address (called from global function)
   */
  public async handleEditAddress(addressId: number): Promise<void> {
    const address = this.addresses.find(a => a.address_id === addressId);
    if (!address) return;

    this.editingAddressId = addressId;

    // Show form
    const form = document.getElementById('addAddressForm');
    if (form) form.style.display = 'block';

    // Populate fields
    (document.getElementById('addressName') as HTMLInputElement).value = address.address_name;
    (document.getElementById('fullAddress') as HTMLInputElement).value = address.full_address;
    (document.getElementById('ward') as HTMLInputElement).value = address.ward;
    (document.getElementById('district') as HTMLInputElement).value = address.district;
    (document.getElementById('city') as HTMLInputElement).value = address.city;
    (document.getElementById('postalCode') as HTMLInputElement).value = address.postal_code || '';
    (document.getElementById('isDefault') as HTMLInputElement).checked = address.is_default;
  }

  /**
   * Handle save address (called from global function)
   */
  public async handleSaveAddress(): Promise<void> {
    if (!this.currentUser) return;

    const addressName = (document.getElementById('addressName') as HTMLInputElement).value;
    const fullAddress = (document.getElementById('fullAddress') as HTMLInputElement).value;
    const ward = (document.getElementById('ward') as HTMLInputElement).value;
    const district = (document.getElementById('district') as HTMLInputElement).value;
    const city = (document.getElementById('city') as HTMLInputElement).value;
    const postalCode = (document.getElementById('postalCode') as HTMLInputElement).value;
    const isDefault = (document.getElementById('isDefault') as HTMLInputElement).checked;

    // Validation
    if (!addressName || !fullAddress || !ward || !district || !city) {
      alert('Vui lòng điền đầy đủ thông tin địa chỉ');
      return;
    }

    if (postalCode && !/^\d{6}$/.test(postalCode)) {
      alert('Mã bưu điện phải là 6 chữ số');
      return;
    }

    try {
      const userId = this.getUserId();
      let response;

      if (this.editingAddressId) {
        // Update
        response = await userProfileService.updateAddress(userId, this.editingAddressId, {
          addressName,
          fullAddress,
          ward,
          district,
          city,
          postalCode: postalCode || undefined
        });
      } else {
        // Add new
        response = await userProfileService.addAddress(userId, {
          addressName,
          fullAddress,
          ward,
          district,
          city,
          postalCode: postalCode || undefined,
          isDefault
        });
      }

      if (response.success) {
        alert(this.editingAddressId ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ thành công!');
        (window as any).cancelAddAddress();
        await this.loadAddresses();
      } else {
        alert(response.message || 'Lỗi khi lưu địa chỉ');
      }
    } catch (error: any) {
      console.error('❌ Error saving address:', error);
      alert('Có lỗi xảy ra khi lưu địa chỉ');
    }
  }

  /**
   * Handle delete address (called from global function)
   */
  public async handleDeleteAddress(addressId: number): Promise<void> {
    if (!this.currentUser) return;
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;

    try {
      const userId = this.getUserId();
      const response = await userProfileService.deleteAddress(userId, addressId);

      if (response.success) {
        alert('Xóa địa chỉ thành công!');
        await this.loadAddresses();
      } else {
        alert(response.message || 'Không thể xóa địa chỉ');
      }
    } catch (error: any) {
      console.error('❌ Error deleting address:', error);
      alert('Có lỗi xảy ra khi xóa địa chỉ');
    }
  }

  /**
   * Handle set default address (called from global function)
   */
  public async handleSetDefaultAddress(addressId: number): Promise<void> {
    if (!this.currentUser) return;

    try {
      const userId = this.getUserId();
      const response = await userProfileService.setDefaultAddress(userId, addressId);

      if (response.success) {
        alert('Đã đặt làm địa chỉ mặc định!');
        await this.loadAddresses();
      } else {
        alert(response.message || 'Không thể đặt địa chỉ mặc định');
      }
    } catch (error: any) {
      console.error('❌ Error setting default address:', error);
      alert('Có lỗi xảy ra');
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

// Initialize controller when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AccountController();
  });
} else {
  new AccountController();
}

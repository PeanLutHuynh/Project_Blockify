import { authService } from '../../core/services/AuthService.js';
import { httpClient } from '../../core/api/FetchHttpClient.js';
import { User } from '../../core/models/User.js';
import userProfileService, { UserAddress } from './UserProfileService.js';
import orderTrackingService, { Order } from './OrderTrackingService.js';
import { WishlistService, WishlistItem } from '../../core/services/WishlistService.js';
import { cartService } from '../../core/services/CartService.js';

/**
 * Get API base URL based on environment
 */
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }
  return 'https://blockify-backend.onrender.com';
};

/**
 * AccountController
 * Handles user account page operations
 * Following MVC pattern - this is the Controller
 */
export class AccountController {
  private static instance: AccountController | null = null;
  private currentUser: User | null = null;
  private addresses: UserAddress[] = [];
  private orders: Order[] = [];
  private wishlistItems: WishlistItem[] = [];
  private wishlistService: WishlistService = new WishlistService();
  private currentOrderStatus: string = 'All';
  public editingAddressId: number | null = null;
  private isSavingProfile: boolean = false; // Flag to prevent duplicate saves
  private eventListenersSetup: boolean = false; // Flag to prevent duplicate event listeners
  // private isEditingProfile: boolean = false; // TODO: Re-enable for readonly mode

  constructor() {
    // Singleton pattern - prevent multiple instances
    if (AccountController.instance) {
      console.warn('⚠️ AccountController already exists, returning existing instance');
      return AccountController.instance;
    }
    
    AccountController.instance = this;
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

    // Load orders
    await this.loadOrders();
    
    // Load wishlist
    await this.loadWishlist();

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

    // Fetch FULL profile data from backend API (includes phone, gender, birthDate)
    if (this.currentUser && this.currentUser.id) {
      try {
        console.log('🔄 [loadUserProfile] Fetching full profile from API for user:', this.currentUser.id);
        const response = await userProfileService.getUserProfile(parseInt(this.currentUser.id, 10));
        
        if (response.success && response.data) {
          console.log('✅ [loadUserProfile] Full profile loaded:', {
            fullName: response.data.full_name,
            email: response.data.email,
            phone: response.data.phone,
            gender: response.data.gender,
            birthDate: response.data.birth_date
          });
          
          // Create a new User object with complete profile data from API
          this.currentUser = User.fromApiResponse(response.data);
        } else {
          console.warn('⚠️ [loadUserProfile] Profile fetch failed:', response.message);
        }
      } catch (error) {
        console.error('⚠️ [loadUserProfile] Could not fetch full profile:', error);
        // Continue anyway with basic user data
      }
    }

    // Populate user data in the UI
    this.populateUserData();
  }

  /**
   * Populate user data into form fields
   */
  private populateUserData(): void {
    if (!this.currentUser) {
      console.error('❌ [populateUserData] No current user data available');
      return;
    }

    console.log('📋 [populateUserData] Populating user data:', {
      fullName: this.currentUser.fullName,
      email: this.currentUser.email,
      phone: this.currentUser.phone,
      gender: this.currentUser.gender,
      birthDate: this.currentUser.birthDate
    });

    // Update sidebar avatar and username
    const sidebarAvatar = document.querySelector('.user-info .avatar') as HTMLImageElement;
    const sidebarUsername = document.querySelector('.user-info .username') as HTMLElement;
    
    if (sidebarAvatar) {
      sidebarAvatar.src = this.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.getDisplayName())}&background=random`;
    }
    
    if (sidebarUsername) {
      sidebarUsername.textContent = this.currentUser.username || this.currentUser.email;
    }

    // Update form inputs - use same selectors as handleSaveProfile
    const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[placeholder="Enter your email"]') as HTMLInputElement;
    const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
    
    console.log('🔍 [populateUserData] Form elements found:', {
      nameInput: !!nameInput,
      emailInput: !!emailInput,
      phoneInput: !!phoneInput
    });
    
    if (nameInput) {
      nameInput.value = this.currentUser.fullName || '';
      console.log('✅ Name input populated:', nameInput.value);
    } else {
      console.warn('⚠️ Name input not found');
    }
    
    if (emailInput) {
      emailInput.value = this.currentUser.email || '';
      emailInput.disabled = true; // Email cannot be changed
      console.log('✅ Email input populated:', emailInput.value);
    } else {
      console.warn('⚠️ Email input not found');
    }
    
    if (phoneInput) {
      phoneInput.value = this.currentUser.phone || '';
      console.log('✅ Phone input populated:', phoneInput.value);
    } else {
      console.warn('⚠️ Phone input not found');
    }

    // Update gender radio buttons
    console.log('🔍 [populateUserData] Gender value:', this.currentUser.gender);
    if (this.currentUser.gender) {
      const genderValue = this.currentUser.gender.toLowerCase();
      const genderRadio = document.querySelector(`input[name="sex"][value="${genderValue}"]`) as HTMLInputElement;
      console.log('🔍 [populateUserData] Gender radio found:', !!genderRadio, 'for value:', genderValue);
      if (genderRadio) {
        genderRadio.checked = true;
        console.log('✅ Gender radio checked:', genderValue);
      } else {
        console.warn('⚠️ Gender radio not found for value:', genderValue);
      }
    } else {
      console.warn('⚠️ No gender value in currentUser');
    }

    // Update birth date dropdowns
    console.log('🔍 [populateUserData] BirthDate value:', this.currentUser.birthDate);
    if (this.currentUser.birthDate) {
      const birthDateStr = this.currentUser.birthDate instanceof Date 
        ? this.currentUser.birthDate.toISOString() 
        : this.currentUser.birthDate;
      console.log('🔍 [populateUserData] Calling populateBirthDate with:', birthDateStr);
      this.populateBirthDate(birthDateStr);
    } else {
      console.warn('⚠️ No birthDate value in currentUser');
    }

    // Update large avatar in the profile section
    const largeAvatar = document.querySelector('.large-avatar') as HTMLImageElement;
    if (largeAvatar) {
      largeAvatar.src = this.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.getDisplayName())}&background=random`;
    }

    // Set fields to readonly mode by default (only disables inputs, no button changes)
    this.setProfileFieldsReadonly(true);

    console.log('✅ User data populated successfully');
  }

  /**
   * Populate birth date into dropdowns
   */
  private populateBirthDate(birthDate: string): void {
    try {
      console.log('📅 [populateBirthDate] Input birthDate:', birthDate);
      const date = new Date(birthDate);
      const day = date.getDate();
      const month = date.getMonth() + 1; // 0-indexed
      const year = date.getFullYear();

      console.log('📅 [populateBirthDate] Parsed date:', { day, month, year });

      const dayButton = document.getElementById('day-button');
      const monthButton = document.getElementById('month-button');
      const yearButton = document.getElementById('year-button');

      console.log('📅 [populateBirthDate] Buttons found:', {
        dayButton: !!dayButton,
        monthButton: !!monthButton,
        yearButton: !!yearButton
      });

      if (dayButton) {
        dayButton.textContent = day.toString();
        console.log('✅ Day button updated:', day);
      } else {
        console.warn('⚠️ Day button not found');
      }
      
      if (monthButton) {
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                           'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        monthButton.textContent = monthNames[month - 1];
        monthButton.setAttribute('data-value', month.toString());
        console.log('✅ Month button updated:', monthNames[month - 1]);
      } else {
        console.warn('⚠️ Month button not found');
      }
      
      if (yearButton) {
        yearButton.textContent = year.toString();
        console.log('✅ Year button updated:', year);
      } else {
        console.warn('⚠️ Year button not found');
      }

      console.log('✅ Birth date populated successfully:', { day, month, year });
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
    const saveBtn = document.getElementById('saveProfileBtn') as HTMLButtonElement;

    if (nameInput) nameInput.disabled = readonly;
    if (phoneInput) phoneInput.disabled = readonly;
    genderRadios.forEach(radio => radio.disabled = readonly);
    
    // Disable/enable dropdown buttons
    if (dayButton) dayButton.disabled = readonly;
    if (monthButton) monthButton.disabled = readonly;
    if (yearButton) yearButton.disabled = readonly;

    // Disable Save button when in readonly mode
    if (saveBtn) saveBtn.disabled = readonly;
  }

  /**
   * Handle edit profile button click
   */
  public handleEditProfile(): void {
    console.log('🔓 Enabling edit mode');
    this.setProfileFieldsReadonly(false);
    
    // Toggle button states
    const saveBtn = document.getElementById('saveProfileBtn');
    const updateBtn = document.getElementById('updateProfileBtn');
    
    if (saveBtn && updateBtn) {
      // Save button becomes primary (active)
      saveBtn.classList.remove('btn-secondary');
      saveBtn.classList.add('btn-primary-custom');
      
      // Update button becomes secondary (inactive)
      updateBtn.classList.remove('btn-primary-custom');
      updateBtn.classList.add('btn-secondary');
    }
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

        const response = await fetch(`${getApiBaseUrl()}/api/v1/users/${this.currentUser.id}/avatar`, {
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
    // Prevent duplicate event listener binding
    if (this.eventListenersSetup) {
      console.log('⚠️ Event listeners already setup, skipping...');
      return;
    }
    
    console.log('🔧 Setting up event listeners...');
    
    // Bind Save and Update buttons by ID
    const saveBtn = document.getElementById('saveProfileBtn');
    const updateBtn = document.getElementById('updateProfileBtn');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('💾 Save profile clicked');
        this.handleSaveProfile();
      });
      console.log('✅ Bound Save handler');
    }
    
    if (updateBtn) {
      updateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('✏️ Update profile clicked');
        this.handleEditProfile();
      });
      console.log('✅ Bound Update handler');
    }

    // Mark as setup
    this.eventListenersSetup = true;
    console.log(`✅ Event listeners setup complete: Save and Update buttons bound by ID`);
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
    
    // Prevent duplicate saves
    if (this.isSavingProfile) {
      console.warn('⚠️ Save already in progress, ignoring duplicate call');
      return;
    }
    
    this.isSavingProfile = true;
    console.log('🔒 Save locked');
    
    try {
      await this._handleSaveProfileInternal();
    } finally {
      this.isSavingProfile = false;
      console.log('🔓 Save unlocked');
    }
  }

  private async _handleSaveProfileInternal(): Promise<void> {
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
        
        // Format as ISO date string (YYYY-MM-DD) without timezone conversion
        // Pad month and day with leading zeros
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        updateData.birthDate = `${year}-${monthStr}-${dayStr}`;
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
        
        // Toggle button states back to view mode
        const saveBtn = document.getElementById('saveProfileBtn');
        const updateBtn = document.getElementById('updateProfileBtn');
        
        if (saveBtn && updateBtn) {
          // Save button becomes secondary (inactive)
          saveBtn.classList.remove('btn-primary-custom');
          saveBtn.classList.add('btn-secondary');
          
          // Update button becomes primary (active)
          updateBtn.classList.remove('btn-secondary');
          updateBtn.classList.add('btn-primary-custom');
        }
        
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

  // ==================== ORDER TRACKING METHODS ====================

  /**
   * Load user orders
   */
  private async loadOrders(): Promise<void> {
    console.log('🔍 [loadOrders] Starting to load orders...');
    console.log('🔍 [loadOrders] currentUser:', this.currentUser);
    console.log('🔍 [loadOrders] currentUser?.id:', this.currentUser?.id);
    
    if (!this.currentUser) {
      console.error('❌ [loadOrders] No current user, cannot load orders');
      this.renderEmptyOrders('Vui lòng đăng nhập để xem đơn hàng');
      return;
    }

    try {
      const userId = this.getUserId();
      console.log(`📦 Loading orders for user ${userId}...`);
      
      this.orders = await orderTrackingService.getUserOrders(userId);
      console.log(`✅ Loaded ${this.orders.length} orders`);
      
      // Render orders
      this.renderOrders();
      
      // Setup order tab listeners
      this.setupOrderTabListeners();
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      this.renderEmptyOrders('Không thể tải danh sách đơn hàng');
    }
  }

  /**
   * Handle cancel order (called from HTML)
   */
  public async handleCancelOrder(orderId: string, orderNumber: string): Promise<void> {
    // Show cancel reason modal
    const reasons = [
      'Muốn thay đổi địa chỉ giao hàng',
      'Muốn nhập/thay đổi mã Voucher',
      'Thủ tục thanh toán quá rắc rối',
      'Tìm thấy giá rẻ hơn ở chỗ khác',
      'Đổi ý, không muốn mua nữa',
      'Khác'
    ];

    const reasonsHtml = reasons.map((reason, index) => `
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="cancelReason" id="reason${index}" value="${reason}" ${index === 0 ? 'checked' : ''}>
        <label class="form-check-label" for="reason${index}">
          ${reason}
        </label>
      </div>
    `).join('');

    // Create modal HTML
    const modalHtml = `
      <div class="modal fade" id="cancelOrderModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Chọn Lý Do Hủy</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted mb-3">Đơn hàng: <strong>${orderNumber}</strong></p>
              <div class="alert alert-warning mb-3" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i><strong>Vui lòng chọn lí do hủy đơn hàng.</strong> Lưu ý: Thao tác này sẽ hủy tất cả các sản phẩm có trong đơn hàng và không thể hoàn tác.
              </div>
              ${reasonsHtml}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">KHÔNG PHẢI BÂY GIỜ</button>
              <button type="button" class="btn btn-danger" id="confirmCancelBtn">HỦY ĐƠN HÀNG</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('cancelOrderModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modalElement = document.getElementById('cancelOrderModal');
    if (!modalElement) return;

    // Use Bootstrap's modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();

    // Handle confirm cancel
    const confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const selectedReason = document.querySelector('input[name="cancelReason"]:checked') as HTMLInputElement;
        if (!selectedReason) {
          alert('Vui lòng chọn lý do hủy');
          return;
        }

        const reason = selectedReason.value;

        try {
          // Call API to cancel order
          await orderTrackingService.cancelOrder(parseInt(orderId), reason);
          
          alert('Đã hủy đơn hàng thành công!');
          modal.hide();
          
          // Reload orders
          await this.loadOrders();
        } catch (error: any) {
          console.error('Error canceling order:', error);
          alert('Không thể hủy đơn hàng: ' + error.message);
        }
      });
    }

    // Clean up modal after hide
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
    });
  }

  /**
   * View order details in a modal (called from HTML)
   */
  public viewOrderDetails(orderId: string, orderNumber: string): void {
    // Find the order
    const order = this.orders.find(o => o.order_id.toString() === orderId);
    if (!order) {
      alert('Không tìm thấy đơn hàng');
      return;
    }

    console.log('📦 Order details:', order);
    console.log('📦 Order items:', order.items);

    // Build items HTML
    const itemsHtml = (order.items || []).map(item => {
      console.log('🎁 Item:', item);
      return `
      <div class="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom">
        ${item.image_url 
          ? `<img src="${this.escapeHtml(item.image_url)}" alt="${this.escapeHtml(item.product_name)}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #e0e0e0;">`
          : `<div style="width: 80px; height: 80px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #e0e0e0;">
               <i class="bi bi-image" style="font-size: 24px; color: #bbb;"></i>
             </div>`
        }
        <div class="flex-grow-1">
          <div class="fw-semibold">${this.escapeHtml(item.product_name)}</div>
          <div class="text-muted small mt-1">Phân loại hàng: ${this.escapeHtml(item.product_sku || 'N/A')}</div>
          <div class="text-muted small">x${item.quantity}</div>
        </div>
        <div class="text-end">
          <div class="text-decoration-line-through text-muted small" style="font-size: 0.875rem;">
            ${orderTrackingService.formatPrice(item.unit_price * 1.2)}
          </div>
          <div class="text-danger fw-semibold">
            ${orderTrackingService.formatPrice(item.total_price)}
          </div>
        </div>
      </div>
    `;}).join('');

    console.log('📝 Items HTML length:', itemsHtml.length);

    // Show message if no items
    const itemsDisplay = itemsHtml.length > 0 
      ? itemsHtml 
      : '<div class="text-center text-muted py-4">Không tìm thấy sản phẩm trong đơn hàng</div>';

    // Build discount info
    const discountHtml = order.discount_amount && order.discount_amount > 0 ? `
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">
          <i class="bi bi-ticket-perforated me-1"></i>Đã giảm
        </span>
        <span class="text-success">-${orderTrackingService.formatPrice(order.discount_amount)}</span>
      </div>
    ` : '';

    // Create modal HTML
    const modalHtml = `
      <div class="modal fade" id="orderDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-light">
              <div>
                <h5 class="modal-title mb-1">Chi Tiết Đơn Hàng</h5>
                <p class="mb-0 text-muted small">Mã đơn: <strong>${this.escapeHtml(orderNumber)}</strong></p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-4">
                <h6 class="fw-bold mb-3">Sản phẩm</h6>
                ${itemsDisplay}
              </div>
              
              <div class="border-top pt-3">
                <h6 class="fw-bold mb-3">Thông tin thanh toán</h6>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Tổng tiền hàng</span>
                  <span>${orderTrackingService.formatPrice(order.subtotal)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Phí vận chuyển</span>
                  <span>${orderTrackingService.formatPrice(order.shipping_fee)}</span>
                </div>
                ${discountHtml}
                <div class="d-flex justify-content-between mb-3 border-top pt-2">
                  <span class="fw-bold">Tổng thanh toán</span>
                  <span class="fw-bold text-danger fs-5">${orderTrackingService.formatPrice(order.total_amount)}</span>
                </div>
              </div>

              <div class="border-top pt-3">
                <h6 class="fw-bold mb-3">Thông tin giao hàng</h6>
                <div class="mb-2">
                  <strong>${this.escapeHtml(order.customer_name || '')}</strong>
                </div>
                <div class="text-muted small mb-1">
                  <i class="bi bi-telephone me-1"></i>${this.escapeHtml(order.customer_phone || '')}
                </div>
                <div class="text-muted small">
                  <i class="bi bi-geo-alt me-1"></i>${this.escapeHtml(order.shipping_address || '')}
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('orderDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modalElement = document.getElementById('orderDetailsModal');
    if (!modalElement) return;

    // Use Bootstrap's modal
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();

    // Clean up modal after hide
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
    });
  }

  /**
   * Reorder items - Add all items from this order to cart and redirect to cart page
   */
  public async reorderItems(orderId: string): Promise<void> {
    try {
      // Find the order
      const order = this.orders.find(o => o.order_id.toString() === orderId);
      if (!order || !order.items || order.items.length === 0) {
        alert('Không tìm thấy sản phẩm trong đơn hàng');
        return;
      }

      console.log('🔄 Re-ordering items from order:', order.order_number);

      // Show loading
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10000;">
          <div class="spinner-border text-primary me-3" role="status"></div>
          <span class="fw-bold">Đang thêm sản phẩm vào giỏ hàng...</span>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 9999;"></div>
      `;
      document.body.appendChild(loadingDiv);

      // Import CartService dynamically
      const { cartService } = await import('../../core/services/CartService.js');

      let successCount = 0;
      let failedItems: string[] = [];

      // Add each item to cart
      for (const item of order.items) {
        try {
          // Get product details to ensure we have all required data
          const { productService } = await import('../../core/services/ProductService.js');
          const productResult = await productService.getProductById(item.product_id.toString());

          if (!productResult.success || !productResult.product) {
            failedItems.push(item.product_name);
            continue;
          }

          const product = productResult.product;

          // Add to cart
          const result = await cartService.addToCart({
            productId: item.product_id,
            productName: item.product_name,
            productSlug: product.slug || `product-${item.product_id}`,
            imageUrl: item.image_url || product.imageUrl || '',
            price: product.price || item.unit_price,
            salePrice: product.salePrice || null,
            quantity: item.quantity,
            stockQuantity: product.stockQuantity || 100,
            minStockLevel: 0
          });

          if (result.success) {
            successCount++;
            console.log(`✅ Added ${item.product_name} to cart`);
          } else {
            failedItems.push(item.product_name);
            console.error(`❌ Failed to add ${item.product_name}:`, result.message);
          }
        } catch (error) {
          console.error(`❌ Error adding ${item.product_name}:`, error);
          failedItems.push(item.product_name);
        }
      }

      // Remove loading
      document.body.removeChild(loadingDiv);

      // Show result
      if (successCount > 0) {
        const message = failedItems.length > 0
          ? `Đã thêm ${successCount}/${order.items.length} sản phẩm vào giỏ hàng.\n\nSản phẩm không thể thêm:\n${failedItems.join('\n')}`
          : `Đã thêm ${successCount} sản phẩm vào giỏ hàng!`;
        
        alert(message);

        // Redirect to cart page
        window.location.href = './CartPage.html';
      } else {
        alert('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau.');
      }
    } catch (error: any) {
      console.error('❌ Error re-ordering items:', error);
      alert('Đã xảy ra lỗi: ' + error.message);
    }
  }

  /**
   * Setup order status tab listeners
   */
  private setupOrderTabListeners(): void {
    const orderTabs = document.querySelectorAll('.orders-tabs .nav-link');
    
    orderTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all tabs
        orderTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Get status from data attribute
        const status = (tab as HTMLElement).dataset.status || 'All';
        this.currentOrderStatus = status;
        
        // Filter and render orders
        this.renderOrders();
      });
    });
  }

  /**
   * Render orders based on current filter
   * Made public to allow re-rendering when tab is activated
   */
  public renderOrders(): void {
    console.log('🎨 [renderOrders] Starting to render orders...');
    console.log('🎨 [renderOrders] Total orders:', this.orders.length);
    console.log('🎨 [renderOrders] Current status filter:', this.currentOrderStatus);
    
    const container = document.querySelector('#order .section-body');
    
    if (!container) {
      console.error('❌ [renderOrders] Order container not found!');
      return;
    }
    
    console.log('✅ [renderOrders] Container found:', container);

    // Filter orders by status
    const filteredOrders = this.currentOrderStatus === 'All'
      ? this.orders
      : this.orders.filter(order => order.status === this.currentOrderStatus);
      
    console.log('🎨 [renderOrders] Filtered orders:', filteredOrders.length);

    if (filteredOrders.length === 0) {
      const statusText = this.currentOrderStatus === 'All' 
        ? 'Bạn chưa có đơn hàng nào'
        : `Không có đơn hàng ${orderTrackingService.getStatusText(this.currentOrderStatus).toLowerCase()}`;
      this.renderEmptyOrders(statusText);
      return;
    }

    // Render orders
    const html = filteredOrders.map(order => this.renderOrderCard(order)).join('');
    container.innerHTML = html;
  }

  /**
   * Get payable amount based on payment method and order status
   * COD: Always show full amount (except cancelled/returned orders)
   * Other payment methods: Show 0đ if not "Đang xử lý"
   * Cancelled/Returned orders: Show refunded amount
   */
  private getPayableAmount(order: Order): string {
    // For cancelled or returned orders (Đã hủy, Đã trả), show refunded amount
    if (order.status === 'Đã hủy' || order.status === 'Đã trả') {
      return orderTrackingService.formatPrice(order.total_amount);
    }
    
    // COD orders always show the full amount
    if (order.payment_method === 'COD') {
      return orderTrackingService.formatPrice(order.total_amount);
    }
    
    // For other payment methods, only show amount if status is "Đang xử lý"
    if (order.status === 'Đang xử lý') {
      return orderTrackingService.formatPrice(order.total_amount);
    }
    
    // Otherwise show 0đ
    return '0đ';
  }
  
  /**
   * Get payment label based on order status
   * Returns either "Số tiền phải trả" or "Số tiền đã hoàn"
   */
  private getPaymentLabel(order: Order): string {
    if (order.status === 'Đã hủy' || order.status === 'Đã trả') {
      return 'Số tiền đã hoàn';
    }
    return 'Số tiền phải trả';
  }

  /**
   * Render a single order card
   */
  private renderOrderCard(order: Order): string {
    const statusClass = orderTrackingService.getStatusClass(order.status);
    const statusText = orderTrackingService.getStatusText(order.status);
    const formattedDate = orderTrackingService.formatDate(order.ordered_at);

    // Render order items with images
    const itemsHtml = (order.items || []).map(item => `
      <div class="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom">
        ${item.image_url 
          ? `<img src="${this.escapeHtml(item.image_url)}" alt="${this.escapeHtml(item.product_name)}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #e0e0e0;">`
          : `<div style="width: 100px; height: 100px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #e0e0e0;">
               <i class="bi bi-image" style="font-size: 32px; color: #bbb;"></i>
             </div>`
        }
        <div class="flex-grow-1">
          <div class="fw-semibold">${this.escapeHtml(item.product_name)}</div>
          <div class="text-muted small mt-1">Phân loại hàng: ${this.escapeHtml(item.product_sku || 'N/A')}</div>
          <div class="text-muted small">x${item.quantity}</div>
        </div>
        <div class="text-end">
          <div class="text-decoration-line-through text-muted small" style="font-size: 0.875rem;">
            ${orderTrackingService.formatPrice(item.unit_price * 1.2)}
          </div>
          <div class="text-danger fw-semibold">
            ${orderTrackingService.formatPrice(item.total_price)}
          </div>
        </div>
      </div>
    `).join('');

    // Show cancel button only for "Đang xử lý" status
    const showCancelButton = order.status === 'Đang xử lý';
    
    // Show cancel reason for "Đã hủy" status
    const showCancelReason = order.status === 'Đã hủy';
    const cancelReason = order.notes || 'Không tìm thấy lý do hủy phù hợp';

    return `
      <div class="card mb-3 shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <div>
            <strong class="text-primary">Blockify</strong>
            <span class="ms-3 text-muted small">Mã đơn: ${this.escapeHtml(order.order_number)}</span>
          </div>
          <div class="${statusClass} fw-bold">${statusText}</div>
        </div>
        <div class="card-body">
          ${itemsHtml}
          
          ${showCancelReason ? `
            <div class="alert alert-danger mb-3" role="alert">
              <strong><i class="bi bi-x-circle me-2"></i>Lý do:</strong> ${this.escapeHtml(cancelReason)}
            </div>
          ` : ''}
          
          <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <div class="text-muted small">
              <div><i class="bi bi-calendar me-2"></i>Ngày đặt: ${formattedDate}</div>
              ${order.status === 'Đang giao' ? `
                <div class="mt-1 text-primary">
                  <i class="bi bi-truck me-2"></i>${orderTrackingService.getDeliveryDateText(order)}
                </div>
              ` : ''}
              <div class="mt-1"><i class="bi bi-credit-card me-2"></i>${orderTrackingService.getPaymentMethodText(order.payment_method)}</div>
            </div>
            <div class="text-end">
              <div class="text-muted small">${this.getPaymentLabel(order)}:</div>
              <div class="fs-5 fw-bold ${(order.status === 'Đã hủy' || order.status === 'Đã trả') ? 'text-success' : 'text-danger'}">${this.getPayableAmount(order)}</div>
            </div>
          </div>
        </div>
        <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
          ${showCancelButton ? `
            <button class="btn btn-outline-danger" onclick="window.accountControllerInstance.handleCancelOrder('${order.order_id}', '${this.escapeHtml(order.order_number)}')">
              <i class="bi bi-x-circle me-1"></i>Hủy Đơn Hàng
            </button>
          ` : ''}
          <button class="btn btn-outline-primary" onclick="window.accountControllerInstance.viewOrderDetails('${order.order_id}', '${this.escapeHtml(order.order_number)}')">
            <i class="bi bi-eye me-1"></i>Xem Chi Tiết
          </button>
          ${order.status === 'Đã giao' ? `
            <button class="btn btn-primary" onclick="window.accountControllerInstance.reorderItems('${order.order_id}')">
              <i class="bi bi-arrow-repeat me-1"></i>Mua Lại
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render empty orders message
   */
  private renderEmptyOrders(message: string): void {
    const container = document.querySelector('#order .section-body');
    
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-bag-x" style="font-size: 48px; color: #ccc;"></i>
        <p class="mt-3 text-muted">${this.escapeHtml(message)}</p>
        <a href="/pages/HomePage.html" class="btn btn-primary-custom mt-3">
          <i class="bi bi-house-door me-2"></i>Tiếp tục mua sắm
        </a>
      </div>
    `;
  }

  // ==================== END ORDER TRACKING METHODS ====================

  /**
   * Load wishlist items
   */
  async loadWishlist(): Promise<void> {
    try {
      console.log('📋 [loadWishlist] Starting to load wishlist...');
      console.log('📋 [loadWishlist] Current user:', this.currentUser);
      
      this.wishlistItems = await this.wishlistService.getUserWishlist();
      console.log(`✅ [loadWishlist] Loaded ${this.wishlistItems.length} wishlist items:`, this.wishlistItems);
      
      await this.renderWishlist();
    } catch (error) {
      console.error('❌ [loadWishlist] Error loading wishlist:', error);
      this.wishlistItems = [];
      await this.renderWishlist();
    }
  }

  /**
   * Render wishlist items
   */
  private async renderWishlist(): Promise<void> {
    console.log('🎨 [renderWishlist] Starting to render wishlist...');
    console.log('🎨 [renderWishlist] Wishlist items count:', this.wishlistItems.length);
    
    const container = document.getElementById('wishlist-container');
    if (!container) {
      console.error('❌ [renderWishlist] Wishlist container not found!');
      return;
    }
    
    console.log('✅ [renderWishlist] Container found:', container);

    if (this.wishlistItems.length === 0) {
      console.log('ℹ️ [renderWishlist] No wishlist items, showing empty state');
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-heart" style="font-size: 3rem; color: #ccc;"></i>
          <p class="mt-3 text-muted">Chưa có sản phẩm nào trong wishlist</p>
        </div>
      `;
      return;
    }

    console.log('📦 [renderWishlist] Rendering wishlist items with product data from backend...');
    
    // Filter items that have product data
    const validItems = this.wishlistItems.filter(item => item.product);
    
    if (validItems.length === 0) {
      console.warn('⚠️ [renderWishlist] No valid items with product data');
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #ff9800;"></i>
          <p class="mt-3 text-muted">Không thể tải thông tin sản phẩm</p>
        </div>
      `;
      return;
    }

    const htmlParts = validItems.map((wishlistItem) => {
      const product = wishlistItem.product!;
      
      console.log(`  ✓ Rendering product:`, product.name);
      console.log(`  📷 Image URL:`, product.image_url);
      console.log(`  🔗 Slug:`, product.slug);
      
      // Get proper data
      const price = product.sale_price || product.price;
      const formattedPrice = typeof price === 'number' 
        ? price.toLocaleString('vi-VN') 
        : parseFloat(price).toLocaleString('vi-VN');
      
      const age = '8+'; // Default age
      const pieces = product.piece_count || 120;
      const rating = product.rating || 4.8;
      
      // Fix image URL - ensure it's a proper URL
      let imageUrl = product.image_url || '';
      
      // If image_url is a relative path, make it absolute
      if (imageUrl && !imageUrl.startsWith('http')) {
        // Check if it's a Supabase storage path
        if (imageUrl.startsWith('/')) {
          imageUrl = imageUrl; // Keep as is for absolute paths
        } else {
          // Relative path - might need to prepend domain
          imageUrl = imageUrl;
        }
      }
      
      const fallbackImage = 'https://via.placeholder.com/200x200?text=No+Image';

      return `
        <div class="col-md-6 col-lg-3 mb-4">
          <div class="card wishlist-card position-relative shadow-sm border-0 h-100">
            <button class="btn-close position-absolute top-0 end-0 m-2 bg-white rounded-circle p-2 shadow-sm" 
                    onclick="window.accountControllerInstance.removeFromWishlist(${wishlistItem.product_id})"
                    style="z-index: 10;"
                    aria-label="Remove from wishlist"></button>
            <img src="${this.escapeHtml(imageUrl)}" 
                 alt="${this.escapeHtml(product.name)}"
                 class="card-img-top"
                 style="height: 200px; object-fit: cover;"
                 onerror="this.src='${fallbackImage}'">
            <div class="card-body d-flex flex-column">
              <h6 class="card-title fw-bold mb-2" style="min-height: 40px; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(product.name)}</h6>
              <div class="text-muted small mb-2">
                <i class="bi bi-person"></i> ${age} • 
                <i class="bi bi-box"></i> ${pieces} • 
                <i class="bi bi-star-fill text-warning"></i> ${rating}
              </div>
              <div class="fw-bold text-danger mb-3 fs-5">${formattedPrice} VNĐ</div>
              <div class="mt-auto">
                <div class="d-grid gap-2">
                  <button class="btn btn-outline-primary btn-sm" 
                          onclick="window.accountControllerInstance.viewProductDetail('${this.escapeHtml(product.slug || '')}', ${wishlistItem.product_id})">
                    <i class="bi bi-eye"></i> Xem chi tiết
                  </button>
                  <button class="btn btn-primary btn-sm" 
                          onclick="window.accountControllerInstance.addWishlistToCart(${wishlistItem.product_id})">
                    <i class="bi bi-cart-plus"></i> Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    const html = htmlParts.filter(h => h).join('');
    console.log('📝 [renderWishlist] Generated HTML length:', html.length);
    
    container.innerHTML = html;
    console.log('✅ [renderWishlist] Wishlist rendered successfully!');
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: number): Promise<void> {
    try {
      console.log(`🗑️ [removeFromWishlist] Removing product ${productId}...`);
      await this.wishlistService.removeFromWishlist(productId);
      console.log('✅ [removeFromWishlist] Product removed successfully');
      await this.loadWishlist();
    } catch (error) {
      console.error('❌ [removeFromWishlist] Error removing from wishlist:', error);
      alert('Có lỗi xảy ra khi xóa sản phẩm khỏi wishlist');
    }
  }

  /**
   * Add wishlist item to cart
   */
  async addWishlistToCart(productId: number): Promise<void> {
    try {
      console.log(`🛒 [addWishlistToCart] Adding product ${productId} to cart...`);
      
      // Find the wishlist item with product data
      const wishlistItem = this.wishlistItems.find(item => item.product_id === productId);
      
      if (!wishlistItem || !wishlistItem.product) {
        console.error('❌ [addWishlistToCart] Product data not found in wishlist');
        alert('Không thể tìm thấy thông tin sản phẩm');
        return;
      }

      const product = wishlistItem.product;
      
      await cartService.addToCart({
        productId: product.product_id,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: product.image_url,
        price: product.price,
        salePrice: product.sale_price,
        quantity: 1,
        stockQuantity: product.stock_quantity,
        minStockLevel: 0,
      });

      console.log('✅ [addWishlistToCart] Product added to cart successfully');
      alert('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) {
      console.error('❌ [addWishlistToCart] Error adding to cart:', error);
      alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ');
    }
  }

  /**
   * View product detail - navigate to ProductDetail page
   */
  viewProductDetail(slug: string, productId: number): void {
    console.log(`🔍 [viewProductDetail] Navigating to product detail - slug: ${slug}, id: ${productId}`);
    
    if (slug && slug !== 'undefined' && slug.trim() !== '') {
      window.location.href = `./ProductDetail.html?slug=${encodeURIComponent(slug)}`;
    } else {
      console.error('❌ [viewProductDetail] Invalid slug, using product ID fallback');
      alert('Không thể mở chi tiết sản phẩm - thiếu thông tin slug');
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

import { authService } from '../../core/services/AuthService.js';
import { httpClient } from '../../core/api/FetchHttpClient.js';
import { User } from '../../core/models/User.js';
import { initializeNavbarAuth } from '../../shared/components/NavbarAuth.js';

/**
 * AccountController
 * Handles user account page operations
 * Following MVC pattern - this is the Controller
 */
export class AccountController {
  private currentUser: User | null = null;

  constructor() {
    this.initializePage();
  }

  /**
   * Initialize account page
   */
  private async initializePage(): Promise<void> {
    try {
      // Initialize navbar auth first
      initializeNavbarAuth();

      // Check authentication
      const isAuth = await this.checkAuthentication();
      if (!isAuth) {
        return;
      }

      // Load user data
      await this.loadUserProfile();

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Failed to initialize account page:', error);
      this.redirectToSignIn();
    }
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuthentication(): Promise<boolean> {
    // Check if Supabase session exists
    const isSupabaseAuth = await authService.isSupabaseAuthenticated();
    
    if (!isSupabaseAuth) {
      console.warn('⚠️ No Supabase session found, redirecting to sign in');
      this.redirectToSignIn();
      return false;
    }

    // Check local auth state
    const isLocalAuth = authService.isAuthenticated();
    
    if (!isLocalAuth) {
      console.warn('⚠️ No local auth state, verifying with backend...');
      
      // Try to get current user from backend using Supabase token
      const result = await authService.getCurrentUser();
      
      if (!result.success || !result.user) {
        console.error('❌ Failed to get user profile from backend');
        this.redirectToSignIn();
        return false;
      }
      
      this.currentUser = result.user;
      return true;
    }

    this.currentUser = authService.getUser();
    return !!this.currentUser;
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

    // Update large avatar in the profile section
    const largeAvatar = document.querySelector('.large-avatar') as HTMLImageElement;
    if (largeAvatar) {
      largeAvatar.src = this.currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.getDisplayName())}&background=random`;
    }

    console.log('✅ User data populated successfully');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Find all Save/Update buttons by text content
    const buttons = document.querySelectorAll('.btn-primary-custom');
    buttons.forEach(btn => {
      const btnText = btn.textContent?.trim();
      if (btnText === 'Save' || btnText === 'Update') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSaveProfile();
        });
      }
    });

    // Logout handler is already in NavbarAuth component
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Handle save profile
   */
  private async handleSaveProfile(): Promise<void> {
    try {
      const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
      const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
      
      const genderRadio = document.querySelector('input[name="sex"]:checked') as HTMLInputElement;

      const updateData: any = {};

      if (nameInput?.value) {
        updateData.fullName = nameInput.value.trim();
      }

      if (phoneInput?.value) {
        updateData.phone = phoneInput.value.trim();
      }

      if (genderRadio?.value) {
        updateData.gender = genderRadio.value;
      }

      console.log('📤 Updating profile with data:', updateData);

      // Call backend API to update user profile
      const response = await httpClient.put<any>(`/api/users/${this.currentUser!.id}`, updateData);

      if (response.success && response.data) {
        console.log('✅ Profile updated successfully');
        
        // Update local user data
        const updatedUser = User.fromApiResponse(response.data);
        this.currentUser = updatedUser;
        
        // Update auth service state
        authService['setCurrentUser'](updatedUser);
        
        alert('Profile updated successfully!');
        
        // Refresh UI
        this.populateUserData();
      } else {
        console.error('❌ Failed to update profile:', response.message);
        alert(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      alert(error.response?.data?.message || 'An error occurred while updating profile');
    }
  }

  /**
   * Redirect to sign in page
   */
  private redirectToSignIn(): void {
    console.log('🔄 Redirecting to sign in page...');
    window.location.href = 'SigninPage.html';
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

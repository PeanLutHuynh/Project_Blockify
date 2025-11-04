import { authService } from '../../core/services/AuthService.js';
import { User } from '../../core/models/User.js';

export class ModernAuthController {
  private authService = authService;

  /**
   * Handle sign up form submission
   */
  async handleSignUp(formData: {
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    username: string;
    gender?: string;
  }): Promise<{ success: boolean; user?: User; message: string; errors?: string[] }> {
    try {
      // Client-side validation
      const validation = this.validateSignUpData(formData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Please fix the errors below',
          errors: validation.errors
        };
      }

      // Call service
      const result = await this.authService.signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        username: formData.username,
        gender: formData.gender
      });

      if (result.success) {
        // Redirect to email verification page (user must verify email before signing in)
        this.redirectToVerifyEmail(formData.email);
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Handle sign in form submission
   */
  async handleSignIn(formData: {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{ success: boolean; user?: User; message: string; errors?: string[] }> {
    try {
      // Client-side validation
      const validation = this.validateSignInData(formData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Please fix the errors below',
          errors: validation.errors
        };
      }

      // Call service
      const result = await this.authService.signIn({
        identifier: formData.identifier,
        password: formData.password
      });

      if (result.success) {
        // Handle remember me
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        // Redirect to appropriate page based on service response
        if (result.redirectTo) {
          window.location.href = result.redirectTo;
        } else {
          this.redirectAfterAuth();
        }
      }

      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Handle Google authentication
   */
  async handleGoogleAuth(): Promise<{ success: boolean; user?: User; message: string; errors?: string[] }> {
    try {
      const result = await this.authService.googleAuth();
      // Redirect happens immediately in googleAuth
      return result;
    } catch (error) {
      console.error('Google auth error:', error);
      return {
        success: false,
        message: 'Failed to initialize Google authentication'
      };
    }
  }

  /**
   * Handle Google auth callback
   */
  async handleGoogleCallback(authData: {
    email: string;
    fullName: string;
    authUid: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; user?: User; message: string; errors?: string[] }> {
    try {
      const result = await this.authService.googleCallback(authData);
      
      if (result.success) {
        this.redirectAfterAuth();
      }

      return result;
    } catch (error) {
      console.error('Google callback error:', error);
      return {
        success: false,
        message: 'Failed to complete Google authentication'
      };
    }
  }

  /**
   * Handle sign out
   */
  async handleSignOut(): Promise<void> {
    try {
      this.authService.signOut();
      
      // Clear remember me
      localStorage.removeItem('rememberMe');
      
      // Redirect to sign in page
      this.redirectToSignIn();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Check authentication status
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authService.getUser();
  }

  /**
   * Validate sign up data
   */
  private validateSignUpData(data: {
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    username: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    // Full name validation
    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    // Username validation
    if (!data.username || data.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (data.username && !/^(?=\p{L})[\p{L}0-9]+(?:[_\-.][\p{L}0-9]+)*$/u.test(data.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate sign in data
   */
  private validateSignInData(data: {
    identifier: string;
    password: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.identifier || data.identifier.trim() === '') {
      errors.push('Please enter your username or email');
    }

    if (!data.password || data.password.trim() === '') {
      errors.push('Please enter your password');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Redirect after successful authentication
   */
  private redirectAfterAuth(): void {
    // Check if redirect URL is set
    const redirectUrl = sessionStorage.getItem('redirectAfterAuth');
    sessionStorage.removeItem('redirectAfterAuth');
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }
    window.location.href = '/pages/HomePage.html';
  }

  /**
   * Redirect to sign in page
   */
  private redirectToSignIn(): void {
    window.location.href = '/pages/SigninPage.html';
  }

  /**
   * Redirect to email verification page
   */
  private redirectToVerifyEmail(email: string): void {
    window.location.href = `/pages/VerifyEmail.html?email=${encodeURIComponent(email)}&from=signup`;
  }

  /**
   * Set redirect URL for after authentication
   */
  setRedirectAfterAuth(url: string): void {
    sessionStorage.setItem('redirectAfterAuth', url);
  }

  /**
   * Display error messages in UI
   */
  displayErrors(errors: string[], containerId: string = 'error-container'): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Normalize errors to array of strings
    let normalized: string[] = [];
    if (Array.isArray(errors)) {
      normalized = errors.filter(Boolean).map(String);
    } else if (typeof errors === 'string') {
      normalized = [errors];
    } else if (errors && typeof errors === 'object') {
      // Convert object of validation errors to messages
      normalized = Object.values(errors as any).flat().map((e: any) => String(e));
    }

    container.innerHTML = '';
    
    if (normalized.length === 0) {
      container.classList.add('d-none');
      return;
    }

    container.classList.remove('d-none');
    
    const errorList = document.createElement('ul');
    errorList.className = 'list-unstyled mb-0';
    
    normalized.forEach(error => {
      const listItem = document.createElement('li');
      listItem.className = 'text-danger small';
      listItem.innerHTML = `<i class="fa fa-exclamation-circle me-1"></i>${error}`;
      errorList.appendChild(listItem);
    });
    
    container.appendChild(errorList);
  }

  /**
   * Display success message in UI
   */
  displaySuccess(message: string, containerId: string = 'success-container'): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.classList.remove('d-none');
    container.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fa fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  }

  /**
   * Show loading state
   */
  setLoadingState(isLoading: boolean, buttonId: string = 'submit-btn'): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Please wait...';
    } else {
      button.disabled = false;
      // Reset button text based on context
      const form = button.closest('form');
      if (form?.id === 'signup-form') {
        button.innerHTML = 'Sign Up';
      } else if (form?.id === 'signin-form') {
        button.innerHTML = 'Sign In';
      }
    }
  }

}

// Export singleton instance
export const modernAuthController = new ModernAuthController();
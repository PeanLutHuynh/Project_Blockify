import { supabaseService } from '../../../core/api/supabaseClient.js';
import { loadConfig } from '../../../core/config/env.js';

/**
 * ResetPasswordController
 * Handles password reset (update) functionality using Supabase
 */
class ResetPasswordController {
  private form: HTMLFormElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private newPasswordInput: HTMLInputElement | null = null;
  private confirmPasswordInput: HTMLInputElement | null = null;

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  private async initializeSupabase(): Promise<void> {
    try {
      // Load ENV first
      await loadConfig();
      console.log('✅ ENV loaded for ResetPassword');
      
      // Initialize Supabase client
      await supabaseService.initializeAsync();
      console.log('✅ Supabase initialized for ResetPassword');
      
      // Initialize form first (so error message can be displayed)
      this.initializeForm();
      
      // Check if user has valid reset token (from email link)
      const isValidSession = await this.checkResetToken();
      if (!isValidSession) {
        // Disable form while redirecting
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.newPasswordInput) this.newPasswordInput.disabled = true;
        if (this.confirmPasswordInput) this.confirmPasswordInput.disabled = true;
        return;
      }
      
      console.log('✅ Reset password form ready');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      this.showError('Không thể kết nối đến hệ thống. Vui lòng thử lại sau.');
    }
  }

  /**
   * Check if user has valid reset token
   * Supabase token có thời gian sống 1 giờ
   */
  private async checkResetToken(): Promise<boolean> {
    try {
      const { data } = await supabaseService.getSession();
      
      // User must have an active session from the reset link
      if (!data.session) {
        console.error('❌ No active session found');
        
        // Show error and redirect to forgot password page
        this.showError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.');
        setTimeout(() => {
          window.location.href = '/pages/ForgotPassword.html';
        }, 3000);
        
        return false;
      }
      
      console.log('✅ Valid reset session found');
      return true;
    } catch (error) {
      console.error('❌ Error checking reset token:', error);
      
      // Show error and redirect to forgot password page
      this.showError('Có lỗi xảy ra. Đang chuyển hướng đến trang quên mật khẩu...');
      setTimeout(() => {
        window.location.href = '/pages/ForgotPassword.html';
      }, 3000);
      
      return false;
    }
  }

  /**
   * Initialize form elements and event listeners
   */
  private initializeForm(): void {
    this.form = document.getElementById('resetForm') as HTMLFormElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    this.newPasswordInput = document.getElementById('newPassword') as HTMLInputElement;
    this.confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Setup password toggle
    this.setupPasswordToggle();
  }

  /**
   * Setup password visibility toggle
   */
  private setupPasswordToggle(): void {
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    if (togglePassword && this.newPasswordInput) {
      togglePassword.addEventListener('click', () => {
        const type = this.newPasswordInput!.type === 'password' ? 'text' : 'password';
        this.newPasswordInput!.type = type;
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
      });
    }

    if (toggleConfirmPassword && this.confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', () => {
        const type = this.confirmPasswordInput!.type === 'password' ? 'text' : 'password';
        this.confirmPasswordInput!.type = type;
        toggleConfirmPassword.classList.toggle('fa-eye');
        toggleConfirmPassword.classList.toggle('fa-eye-slash');
      });
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.newPasswordInput || !this.confirmPasswordInput || !this.submitBtn) return;

    const newPassword = this.newPasswordInput.value.trim();
    const confirmPassword = this.confirmPasswordInput.value.trim();

    // Validate passwords
    if (!this.validatePasswords(newPassword, confirmPassword)) {
      return;
    }

    try {
      // Show loading state
      this.setLoadingState(true);
      this.clearMessages();

      console.log('Updating password...');

      // Use Supabase to update password
      const { error } = await supabaseService.updatePassword(newPassword);

      if (error) {
        console.error('Update password error:', error);
        throw new Error(error.message || 'Không thể đặt lại mật khẩu');
      }

      console.log('Password updated successfully');

      // Show success message
      this.showSuccess(
        'Mật khẩu đã được đặt lại thành công! Đang chuyển hướng đến trang đăng nhập...'
      );

      // Clear form
      if (this.form) {
        this.form.reset();
      }

      // Redirect to signin after 3 seconds
      setTimeout(() => {
        window.location.href = '/SigninPage.html';
      }, 3000);

    } catch (error) {
      console.error('❌ Error:', error);
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      this.showError(message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Validate passwords
   */
  private validatePasswords(newPassword: string, confirmPassword: string): boolean {
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      this.showError('Mật khẩu xác nhận không khớp');
      return false;
    }

    // Check minimum length
    if (newPassword.length < 6) {
      this.showError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }

    // Check if contains letters and numbers
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasLetter || !hasNumber) {
      this.showError('Mật khẩu phải chứa cả chữ cái và số');
      return false;
    }

    return true;
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    const container = document.getElementById('success-container');
    if (!container) return;

    container.className = 'success-message';
    container.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>${message}
    `;
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const container = document.getElementById('error-container');
    if (!container) return;

    container.className = 'error-message';
    container.innerHTML = `
      <i class="fas fa-exclamation-circle me-2"></i>${message}
    `;
  }

  /**
   * Clear all messages
   */
  private clearMessages(): void {
    const successContainer = document.getElementById('success-container');
    const errorContainer = document.getElementById('error-container');

    if (successContainer) {
      successContainer.className = 'd-none';
      successContainer.innerHTML = '';
    }

    if (errorContainer) {
      errorContainer.className = 'd-none';
      errorContainer.innerHTML = '';
    }
  }

  /**
   * Set loading state for submit button
   */
  private setLoadingState(isLoading: boolean): void {
    if (!this.submitBtn) return;

    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = 'Đặt lại mật khẩu';
    }
  }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ResetPasswordController();
});

export { ResetPasswordController };

import { supabaseService } from '../../../core/api/supabaseClient.js';
import { loadConfig } from '../../../core/config/env.js';

/**
 * ForgotPasswordController
 * Handles password reset functionality using Supabase
 */
class ForgotPasswordController {
  private form: HTMLFormElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private emailInput: HTMLInputElement | null = null;

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
      console.log('✅ ENV loaded for ForgotPassword');
      
      // Initialize Supabase client
      await supabaseService.initializeAsync();
      console.log('✅ Supabase initialized for ForgotPassword');
      
      // Then initialize form
      this.initializeForm();
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      this.showError('Không thể kết nối đến hệ thống. Vui lòng thử lại sau.');
    }
  }

  /**
   * Initialize form elements and event listeners
   */
  private initializeForm(): void {
    this.form = document.getElementById('resetForm') as HTMLFormElement;
    this.submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    this.emailInput = document.getElementById('email') as HTMLInputElement;

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.emailInput || !this.submitBtn) return;

    const email = this.emailInput.value.trim();

    // Validate email
    if (!this.isValidEmail(email)) {
      this.showError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    try {
      // Show loading state
      this.setLoadingState(true);
      this.clearMessages();

      console.log('Sending password reset email to:', email);

      // Use Supabase to send password reset email
      const { error } = await supabaseService.resetPasswordForEmail(email);

      if (error) {
        console.error('Reset password error:', error);
        throw new Error(error.message || 'Không thể gửi email đặt lại mật khẩu');
      }

      console.log('Password reset email sent successfully');

      // Show success message
      this.showSuccess(
        'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn.'
      );

      // Clear form
      if (this.form) {
        this.form.reset();
      }

      // Redirect to signin after 5 seconds
      setTimeout(() => {
        window.location.href = '/SigninPage.html';
      }, 5000);

    } catch (error) {
      console.error('❌ Error:', error);
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      this.showError(message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
      this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang gửi...';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = 'Gửi liên kết đặt lại';
    }
  }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ForgotPasswordController();
});

export { ForgotPasswordController };

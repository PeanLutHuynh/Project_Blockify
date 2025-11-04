/**
 * EmailVerifiedController
 * Handles email verification success/error display
 * Following MVC pattern per rule.md
 */
export class EmailVerifiedController {
  private loadingState: HTMLElement | null = null;
  private successState: HTMLElement | null = null;
  private errorState: HTMLElement | null = null;
  private errorMessage: HTMLElement | null = null;
  private countdownSpan: HTMLElement | null = null;
  private signInBtn: HTMLElement | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize controller
   */
  public init(): void {
    this.initElements();
    this.verifyEmail();
  }

  /**
   * Initialize DOM elements
   */
  private initElements(): void {
    this.loadingState = document.getElementById('loadingState');
    this.successState = document.getElementById('successState');
    this.errorState = document.getElementById('errorState');
    this.errorMessage = document.getElementById('errorMessage');
    this.countdownSpan = document.getElementById('countdown');
    this.signInBtn = document.getElementById('signInBtn');
  }

  /**
   * Parse verification parameters from URL
   */
  private parseVerificationParams(): {
    error: string | null;
    errorDescription: string | null;
    accessToken: string | null;
    type: string | null;
  } {
    // Check URL hash first (Supabase confirmation redirects with #access_token...)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    
    // Check query params (Supabase might use this for errors)
    const queryParams = new URLSearchParams(window.location.search);
    
    // Check for error in either hash or query
    const error = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type') || queryParams.get('type');
    
    return { error, errorDescription, accessToken, type };
  }

  /**
   * Show success state and start countdown
   */
  private showSuccess(): void {
    if (!this.loadingState || !this.successState || !this.countdownSpan) return;

    this.loadingState.classList.add('d-none');
    this.successState.classList.remove('d-none');
    
    // Clear pending verification email
    localStorage.removeItem('pending_verification_email');
    
    // Start countdown
    let seconds = 5;
    this.countdownInterval = setInterval(() => {
      seconds--;
      if (this.countdownSpan) {
        this.countdownSpan.textContent = seconds.toString();
      }
      
      if (seconds <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        window.location.href = '/pages/SigninPage.html';
      }
    }, 1000);
    
    // Allow manual navigation
    if (this.signInBtn) {
      this.signInBtn.addEventListener('click', () => {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
      });
    }
  }

  /**
   * Show error state with message
   */
  private showError(message: string): void {
    if (!this.loadingState || !this.errorState) return;

    this.loadingState.classList.add('d-none');
    this.errorState.classList.remove('d-none');
    
    if (message && this.errorMessage) {
      this.errorMessage.textContent = message;
    }
  }

  /**
   * Main verification logic
   */
  private async verifyEmail(): Promise<void> {
    try {
      const { error, errorDescription, accessToken, type } = this.parseVerificationParams();
      
      // Handle errors from Supabase
      if (error) {
        console.error('Verification error:', error, errorDescription);
        this.showError(errorDescription || 'Verification failed. The link may be invalid or expired.');
        return;
      }
      
      // Check if this is an email confirmation
      if (type === 'signup' || type === 'email_change' || accessToken) {
        // Email verified successfully by Supabase
        // The user is now confirmed in auth.users
        this.showSuccess();
      } else {
        // No verification parameters found
        this.showError('Invalid verification link. Please use the link sent to your email.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      this.showError('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}

// Export singleton instance
export const emailVerifiedController = new EmailVerifiedController();

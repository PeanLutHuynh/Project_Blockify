import { ENV } from '../../core/config/env';

/**
 * VerifyEmailController
 * Handles email verification page logic following MVC pattern
 */
export class VerifyEmailController {
  private email: string | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private secondsRemaining: number = 0;
  private isResending: boolean = false;
  private lastClickTime: number = 0;
  private activeRequest: Promise<Response> | null = null;

  // DOM elements
  private emailDisplay: HTMLElement | null = null;
  private resendBtn: HTMLButtonElement | null = null;
  private messageContainer: HTMLElement | null = null;
  private countdownText: HTMLElement | null = null;
  private countdownSpan: HTMLElement | null = null;

  /**
   * Initialize controller
   */
  public init(): void {
    this.initElements();
    this.loadEmail();
    this.attachEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  private initElements(): void {
    this.emailDisplay = document.getElementById('userEmail');
    this.resendBtn = document.getElementById('resendBtn') as HTMLButtonElement;
    this.messageContainer = document.getElementById('messageContainer');
    this.countdownText = document.getElementById('countdownText');
    this.countdownSpan = document.getElementById('countdown');

    if (!this.resendBtn || !this.emailDisplay || !this.messageContainer) {
      console.error('Required DOM elements not found');
    }
  }

  /**
   * Load email from URL params or localStorage
   */
  private loadEmail(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.email = urlParams.get('email') || localStorage.getItem('pending_verification_email');

    if (this.email && this.emailDisplay) {
      this.emailDisplay.textContent = this.email;
      localStorage.setItem('pending_verification_email', this.email);
    } else if (this.emailDisplay) {
      this.emailDisplay.textContent = 'your registered email';
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.resendBtn) return;

    // Remove any existing listeners by cloning the button
    const newResendBtn = this.resendBtn.cloneNode(true) as HTMLButtonElement;
    this.resendBtn.parentNode?.replaceChild(newResendBtn, this.resendBtn);
    this.resendBtn = newResendBtn;

    this.resendBtn.addEventListener('click', (e) => this.handleResendClick(e));
    console.log('Event listener attached to resend button');

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Handle resend button click
   */
  private async handleResendClick(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    // Debounce: prevent clicks within 1 second
    const now = Date.now();
    if (now - this.lastClickTime < 1000) {
      console.log('Click debounced - too fast!');
      return;
    }
    this.lastClickTime = now;

    console.log('Resend button clicked, isResending:', this.isResending);

    // Prevent multiple simultaneous requests
    if (this.isResending || this.activeRequest) {
      console.log('Already resending, ignoring click. activeRequest:', !!this.activeRequest);
      return;
    }

    if (!this.email) {
      this.showMessage('Email address not found. Please try signing up again.', true);
      return;
    }

    await this.sendResendRequest();
  }

  /**
   * Send resend verification request
   */
  private async sendResendRequest(): Promise<void> {
    if (!this.resendBtn || !this.email) return;

    this.isResending = true;
    this.resendBtn.disabled = true;
    this.resendBtn.classList.add('processing');
    this.resendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    console.log('Sending resend request to:', `${ENV.API_BASE_URL}/auth/resend-verification`);

    try {
      // Store the active request promise
      this.activeRequest = fetch(`${ENV.API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: this.email }),
      });

      const response = await this.activeRequest;
      const data = await response.json();
      console.log('Resend response:', data);

      if (data.success || response.ok) {
        this.showMessage('Verification email sent! Please check your inbox.');
        this.startCountdown(60);
      } else {
        this.showMessage(data.message || 'Failed to send verification email', true);
        this.resendBtn.disabled = false;
        this.resendBtn.classList.remove('processing');
      }
    } catch (error) {
      console.error('Resend error:', error);
      this.showMessage('Network error. Please try again later.', true);
      this.resendBtn.disabled = false;
      this.resendBtn.classList.remove('processing');
    } finally {
      this.activeRequest = null;
      this.resendBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Resend Verification Email';
      this.isResending = false;
      console.log('Resend request completed, isResending reset to false');
    }
  }

  /**
   * Start countdown timer
   */
  private startCountdown(seconds: number): void {
    if (!this.resendBtn || !this.countdownText || !this.countdownSpan) return;

    this.secondsRemaining = seconds;
    this.resendBtn.disabled = true;
    this.countdownText.style.display = 'block';

    this.countdownTimer = setInterval(() => {
      this.secondsRemaining--;
      if (this.countdownSpan) {
        this.countdownSpan.textContent = this.secondsRemaining.toString();
      }

      if (this.secondsRemaining <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  /**
   * Stop countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.resendBtn) {
      this.resendBtn.disabled = false;
    }

    if (this.countdownText) {
      this.countdownText.style.display = 'none';
    }
  }

  /**
   * Show message to user
   */
  private showMessage(message: string, isError: boolean = false): void {
    if (!this.messageContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = isError ? 'error-message' : 'success-message';
    messageDiv.innerHTML = `
      <i class="bi bi-${isError ? 'exclamation-circle' : 'check-circle'} me-2"></i>
      ${message}
    `;

    this.messageContainer.innerHTML = '';
    this.messageContainer.appendChild(messageDiv);

    // Auto-hide success messages after 5 seconds
    if (!isError) {
      setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
      }, 5000);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopCountdown();
  }

  /**
   * Get current email
   */
  public getEmail(): string | null {
    return this.email;
  }
}

// Export singleton instance
export const verifyEmailController = new VerifyEmailController();

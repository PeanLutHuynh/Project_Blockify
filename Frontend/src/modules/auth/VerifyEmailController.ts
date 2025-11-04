import { ENV } from '../../core/config/env.js';

export class VerifyEmailController {
  private email: string | null = null;
  private countdownTimer: any = null;
  private resendBtn: HTMLButtonElement | null = null;
  private emailDisplay: HTMLElement | null = null;
  private countdownText: HTMLElement | null = null;
  private countdownSpan: HTMLElement | null = null;
  private messageContainer: HTMLElement | null = null;
  private activeRequest: Promise<Response> | null = null;

  public init(): void {
    this.initElements();
    this.loadEmail();
    this.attachListeners();
    this.initializeCountdown(); // Luôn bắt đầu đếm khi vào trang
  }

  private initElements(): void {
    this.emailDisplay = document.getElementById('userEmail');
    this.resendBtn = document.getElementById('resendBtn') as HTMLButtonElement;
    this.countdownText = document.getElementById('countdownText');
    this.countdownSpan = document.getElementById('countdown');
    this.messageContainer = document.getElementById('messageContainer');
  }

  private loadEmail(): void {
    const params = new URLSearchParams(window.location.search);
    this.email = params.get('email') || localStorage.getItem('pending_email');
    if (this.email) {
      this.emailDisplay!.textContent = this.email;
      localStorage.setItem('pending_email', this.email);
    } else {
      this.emailDisplay!.textContent = 'your email';
    }
  }

  private attachListeners(): void {
    this.resendBtn?.addEventListener('click', () => {
      if (this.resendBtn!.disabled) return;
      this.handleResend();
    });
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  private async handleResend(): Promise<void> {
    if (!this.email || this.activeRequest) return;

    this.setProcessing(true);
    try {
      this.activeRequest = fetch(`${ENV.API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email }),
      });

      const res = await this.activeRequest;
      const data = await res.json();

      if (res.ok && data.success) {
        this.showMessage('Verification email sent!');
        this.startCountdown(60);
      } else {
        this.showMessage(data.message || 'Failed to send', true);
      }
    } catch {
      this.showMessage('Network error', true);
    } finally {
      this.activeRequest = null;
      this.setProcessing(false);
    }
  }

  private startCountdown(seconds: number): void {
    const end = Date.now() + seconds * 1000;
    localStorage.setItem('resend_end_time', end.toString());
    this.updateCountdown();
  }

  private initializeCountdown(): void {
    // Luôn bắt đầu countdown 60s khi vào trang
    const existingEnd = parseInt(localStorage.getItem('resend_end_time') || '0');
    
    if (existingEnd > Date.now()) {
      // Nếu còn countdown cũ thì tiếp tục
      this.updateCountdown();
    } else {
      // Nếu không thì bắt đầu countdown mới 60s
      this.startCountdown(60);
    }
  }

  private updateCountdown(): void {
    const end = parseInt(localStorage.getItem('resend_end_time') || '0');
    if (!this.resendBtn || !this.countdownText || !this.countdownSpan) return;

    this.resendBtn.disabled = true;
    this.countdownText.style.display = 'block';

    // Cập nhật ngay khi load trang
    this.updateCountdownUI(end);

    this.countdownTimer = setInterval(() => {
      this.updateCountdownUI(end);
    }, 1000);
  }

  private updateCountdownUI(end: number): void {
    const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
    this.countdownSpan!.textContent = left.toString();

    if (left <= 0) this.stopCountdown();
  }

  private stopCountdown(): void {
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    // KHÔNG xóa localStorage để có thể F5 và vẫn giữ trạng thái
    // localStorage.removeItem('resend_end_time');
    if (this.resendBtn) this.resendBtn.disabled = false;
    if (this.countdownText) this.countdownText.style.display = 'none';
  }

  private setProcessing(state: boolean): void {
    if (!this.resendBtn) return;
    if (state) {
      this.resendBtn.disabled = true;
      this.resendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    } else {
      this.resendBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Resend Verification Email';
    }
  }

  private showMessage(msg: string, isError = false): void {
    if (!this.messageContainer) return;
    this.messageContainer.innerHTML = `
      <div class="${isError ? 'error' : 'success'}">
        <i class="bi bi-${isError ? 'x-circle' : 'check-circle'} me-2"></i>${msg}
      </div>
    `;
  }

  private cleanup(): void {
    clearInterval(this.countdownTimer);
  }
}

export const verifyEmailController = new VerifyEmailController();
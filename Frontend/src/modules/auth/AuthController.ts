import { authService } from '@/core/api/services';
import { authStore, toastStore } from '@/core/services';
import { validateEmail } from '@/core/utils';
import { ROUTES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/shared/constants';

/**
 * Authentication Controller
 * Handles login, registration, and auth state management
 */
export class AuthController {
  private form!: HTMLFormElement;
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private showPasswordCheckbox?: HTMLInputElement;
  private submitButton!: HTMLButtonElement;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthState();
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): void {
    this.form = document.querySelector('form') as HTMLFormElement;
    this.usernameInput = document.getElementById('username') as HTMLInputElement;
    this.passwordInput = document.getElementById('password') as HTMLInputElement;
    this.showPasswordCheckbox = document.getElementById('showPwd') as HTMLInputElement;
    this.submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (!this.form || !this.usernameInput || !this.passwordInput || !this.submitButton) {
      throw new Error('Required form elements not found');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Show/hide password
    this.showPasswordCheckbox?.addEventListener('change', this.togglePasswordVisibility.bind(this));

    // Real-time validation
    this.usernameInput.addEventListener('blur', this.validateUsername.bind(this));
    this.passwordInput.addEventListener('blur', this.validatePasswordField.bind(this));

    // Clear validation on input
    this.usernameInput.addEventListener('input', () => this.clearFieldValidation(this.usernameInput));
    this.passwordInput.addEventListener('input', () => this.clearFieldValidation(this.passwordInput));
  }

  /**
   * Check if user is already authenticated
   */
  private checkAuthState(): void {
    if (authStore.getState().isAuthenticated) {
      window.location.href = ROUTES.HOME;
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

    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    this.setLoading(true);

    try {
      // Determine if input is email or username
      const isEmail = username.includes('@');
      const loginData = {
        email: isEmail ? username : `${username}@temp.local`, // Backend expects email
        password: password
      };

      const response = await authService.login(loginData);

      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Update auth store
        authStore.setAuth(user, tokens);
        
        // Show success toast
        toastStore.success(
          SUCCESS_MESSAGES.LOGIN_SUCCESS, 
          `Chào mừng ${user.firstName || user.username}!`
        );
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = ROUTES.HOME;
        }, 1000);
      } else {
        this.showError(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        this.showError('Tên đăng nhập hoặc mật khẩu không đúng');
      } else if (error.response?.status === 429) {
        this.showError('Quá nhiều lần thử. Vui lòng thử lại sau');
      } else {
        this.showError(ERROR_MESSAGES.NETWORK_ERROR);
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Validate entire form
   */
  private validateForm(): boolean {
    const isUsernameValid = this.validateUsername();
    const isPasswordValid = this.validatePasswordField();

    return isUsernameValid && isPasswordValid;
  }

  /**
   * Validate username field
   */
  private validateUsername(): boolean {
    const username = this.usernameInput.value.trim();
    
    if (!username) {
      this.showFieldError(this.usernameInput, 'Vui lòng nhập tên đăng nhập hoặc email');
      return false;
    }

    if (username.length < 3) {
      this.showFieldError(this.usernameInput, 'Tên đăng nhập phải có ít nhất 3 ký tự');
      return false;
    }

    // If it looks like an email, validate as email
    if (username.includes('@') && !validateEmail(username)) {
      this.showFieldError(this.usernameInput, 'Định dạng email không hợp lệ');
      return false;
    }

    this.showFieldSuccess(this.usernameInput);
    return true;
  }

  /**
   * Validate password field
   */
  private validatePasswordField(): boolean {
    const password = this.passwordInput.value;
    
    if (!password) {
      this.showFieldError(this.passwordInput, 'Vui lòng nhập mật khẩu');
      return false;
    }

    if (password.length < 6) {
      this.showFieldError(this.passwordInput, 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }

    this.showFieldSuccess(this.passwordInput);
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
   * Toggle password visibility
   */
  private togglePasswordVisibility(): void {
    if (this.showPasswordCheckbox) {
      this.passwordInput.type = this.showPasswordCheckbox.checked ? 'text' : 'password';
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading;
    this.submitButton.innerHTML = loading 
      ? '<i class="fas fa-spinner fa-spin me-2"></i>Đang đăng nhập...'
      : 'Đăng nhập';
    
    // Disable form inputs
    this.usernameInput.disabled = loading;
    this.passwordInput.disabled = loading;
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    toastStore.error('Lỗi đăng nhập', message);
  }
}

/**
 * Registration Controller
 */
export class RegisterController {
  private form!: HTMLFormElement;
  private emailInput!: HTMLInputElement;
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private confirmPasswordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  private initializeElements(): void {
    this.form = document.querySelector('form') as HTMLFormElement;
    this.emailInput = document.getElementById('email') as HTMLInputElement;
    this.usernameInput = document.getElementById('username') as HTMLInputElement;
    this.passwordInput = document.getElementById('password') as HTMLInputElement;
    this.confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    this.submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Real-time validation
    this.emailInput?.addEventListener('blur', this.validateEmail.bind(this));
    this.usernameInput?.addEventListener('blur', this.validateUsername.bind(this));
    this.passwordInput?.addEventListener('blur', this.validatePassword.bind(this));
    this.confirmPasswordInput?.addEventListener('blur', this.validateConfirmPassword.bind(this));
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    const registerData = {
      email: this.emailInput.value.trim(),
      username: this.usernameInput.value.trim(),
      password: this.passwordInput.value,
      confirmPassword: this.confirmPasswordInput.value
    };

    this.setLoading(true);

    try {
      const response = await authService.register(registerData);

      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        authStore.setAuth(user, tokens);
        toastStore.success(SUCCESS_MESSAGES.REGISTER_SUCCESS);
        
        setTimeout(() => {
          window.location.href = ROUTES.HOME;
        }, 1000);
      } else {
        this.showError(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 409) {
        this.showError('Email hoặc tên đăng nhập đã tồn tại');
      } else {
        this.showError(ERROR_MESSAGES.NETWORK_ERROR);
      }
    } finally {
      this.setLoading(false);
    }
  }

  private validateForm(): boolean {
    return this.validateEmail() && 
           this.validateUsername() && 
           this.validatePassword() && 
           this.validateConfirmPassword();
  }

  private validateEmail(): boolean {
    const email = this.emailInput.value.trim();
    
    if (!email) {
      this.showFieldError(this.emailInput, 'Vui lòng nhập email');
      return false;
    }

    if (!validateEmail(email)) {
      this.showFieldError(this.emailInput, 'Định dạng email không hợp lệ');
      return false;
    }

    this.showFieldSuccess(this.emailInput);
    return true;
  }

  private validateUsername(): boolean {
    const username = this.usernameInput.value.trim();
    
    if (!username) {
      this.showFieldError(this.usernameInput, 'Vui lòng nhập tên đăng nhập');
      return false;
    }

    if (username.length < 3 || username.length > 30) {
      this.showFieldError(this.usernameInput, 'Tên đăng nhập phải từ 3-30 ký tự');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.showFieldError(this.usernameInput, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
      return false;
    }

    this.showFieldSuccess(this.usernameInput);
    return true;
  }

  private validatePassword(): boolean {
    const password = this.passwordInput.value;
    
    if (!password) {
      this.showFieldError(this.passwordInput, 'Vui lòng nhập mật khẩu');
      return false;
    }

    if (password.length < 6) {
      this.showFieldError(this.passwordInput, 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }

    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      this.showFieldError(this.passwordInput, 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số');
      return false;
    }

    this.showFieldSuccess(this.passwordInput);
    return true;
  }

  private validateConfirmPassword(): boolean {
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;
    
    if (!confirmPassword) {
      this.showFieldError(this.confirmPasswordInput, 'Vui lòng xác nhận mật khẩu');
      return false;
    }

    if (password !== confirmPassword) {
      this.showFieldError(this.confirmPasswordInput, 'Mật khẩu xác nhận không khớp');
      return false;
    }

    this.showFieldSuccess(this.confirmPasswordInput);
    return true;
  }

  private showFieldError(input: HTMLInputElement, message: string): void {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    
    const feedback = input.parentElement?.querySelector('.invalid-feedback') as HTMLElement;
    if (feedback) {
      feedback.textContent = message;
    }
  }

  private showFieldSuccess(input: HTMLInputElement): void {
    input.classList.add('is-valid');
    input.classList.remove('is-invalid');
  }

  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading;
    this.submitButton.innerHTML = loading 
      ? '<i class="fas fa-spinner fa-spin me-2"></i>Đang đăng ký...'
      : 'Đăng ký';
  }

  private showError(message: string): void {
    toastStore.error('Lỗi đăng ký', message);
  }
}

// Export for use in specific pages
export const authController = new AuthController();
export const registerController = new RegisterController();
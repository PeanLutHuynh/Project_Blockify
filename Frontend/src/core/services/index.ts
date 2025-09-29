import { User, AuthState, Toast, Modal } from '@/types';

/**
 * Authentication state management
 */
export class AuthStore {
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    tokens: null,
    loading: false,
    error: null
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize auth state from localStorage
   */
  private initializeFromStorage(): void {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.state = {
          ...this.state,
          isAuthenticated: true,
          user,
          tokens: {
            accessToken: token,
            refreshToken: localStorage.getItem('refreshToken') || '',
            expiresIn: 0
          }
        };
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        this.clearAuth();
      }
    }
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  /**
   * Set authenticated user and tokens
   */
  setAuth(user: User, tokens: any): void {
    this.state = {
      isAuthenticated: true,
      user,
      tokens,
      loading: false,
      error: null
    };
    this.notify();
  }

  /**
   * Update user profile
   */
  updateUser(user: User): void {
    this.state.user = user;
    localStorage.setItem('user', JSON.stringify(user));
    this.notify();
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.state = {
      isAuthenticated: false,
      user: null,
      tokens: null,
      loading: false,
      error: null
    };
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    this.notify();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.state.user?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}

/**
 * Toast notification store
 */
export class ToastStore {
  private toasts: Toast[] = [];
  private listeners: Set<(toasts: Toast[]) => void> = new Set();
  private idCounter = 0;

  /**
   * Get all toasts
   */
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  /**
   * Subscribe to toast changes
   */
  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.getToasts()));
  }

  /**
   * Add toast notification
   */
  addToast(toast: Omit<Toast, 'id'>): string {
    const id = `toast-${++this.idCounter}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    };

    this.toasts.push(newToast);
    this.notify();

    // Auto remove toast after duration
    if (!toast.persist && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, newToast.duration);
    }

    return id;
  }

  /**
   * Remove toast by ID
   */
  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  /**
   * Clear all toasts
   */
  clearToasts(): void {
    this.toasts = [];
    this.notify();
  }

  /**
   * Convenience methods for different toast types
   */
  success(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, persist = true): string {
    return this.addToast({ type: 'error', title, message, persist });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.addToast({ type: 'info', title, message, duration });
  }
}

/**
 * Modal management store
 */
export class ModalStore {
  private modals: Modal[] = [];
  private listeners: Set<(modals: Modal[]) => void> = new Set();

  /**
   * Get all modals
   */
  getModals(): Modal[] {
    return [...this.modals];
  }

  /**
   * Subscribe to modal changes
   */
  subscribe(listener: (modals: Modal[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.getModals()));
  }

  /**
   * Open modal
   */
  openModal(modal: Modal): void {
    this.modals.push(modal);
    this.notify();
  }

  /**
   * Close modal by ID
   */
  closeModal(id: string): void {
    this.modals = this.modals.filter(modal => modal.id !== id);
    this.notify();
  }

  /**
   * Close all modals
   */
  closeAllModals(): void {
    this.modals = [];
    this.notify();
  }

  /**
   * Check if modal is open
   */
  isModalOpen(id: string): boolean {
    return this.modals.some(modal => modal.id === id);
  }
}

/**
 * Application state store
 */
export class AppStore {
  private theme: 'light' | 'dark' = 'light';
  private language: 'en' | 'vi' = 'vi';
  private loading = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize from localStorage
   */
  private initializeFromStorage(): void {
    const theme = localStorage.getItem('theme') as 'light' | 'dark';
    const language = localStorage.getItem('language') as 'en' | 'vi';

    if (theme) this.theme = theme;
    if (language) this.language = language;
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Get theme
   */
  getTheme(): 'light' | 'dark' {
    return this.theme;
  }

  /**
   * Set theme
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.notify();
  }

  /**
   * Get language
   */
  getLanguage(): 'en' | 'vi' {
    return this.language;
  }

  /**
   * Set language
   */
  setLanguage(language: 'en' | 'vi'): void {
    this.language = language;
    localStorage.setItem('language', language);
    this.notify();
  }

  /**
   * Get loading state
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.loading = loading;
    this.notify();
  }
}

// Create and export singleton instances
export const authStore = new AuthStore();
export const toastStore = new ToastStore();
export const modalStore = new ModalStore();
export const appStore = new AppStore();

// Export AuthService
export { AuthService, authService } from './AuthService';
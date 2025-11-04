import { TOAST_TYPES } from '@/shared/constants';
import { Toast } from '@/types';

/**
 * Toast notification component
 */
export class ToastComponent {
  private container!: HTMLElement;
  private toasts: Map<string, HTMLElement> = new Map();

  constructor() {
    this.createContainer();
  }

  /**
   * Create toast container
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
    this.container.style.zIndex = '1055';
    document.body.appendChild(this.container);
  }

  /**
   * Show toast notification
   */
  show(toast: Toast): void {
    const toastElement = this.createToastElement(toast);
    this.container.appendChild(toastElement);
    this.toasts.set(toast.id, toastElement);

    // Show toast with animation
    setTimeout(() => {
      toastElement.classList.add('show');
    }, 10);

    // Auto hide if not persistent
    if (!toast.persist && toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.hide(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Hide toast notification
   */
  hide(toastId: string): void {
    const toastElement = this.toasts.get(toastId);
    if (toastElement) {
      toastElement.classList.remove('show');
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
        this.toasts.delete(toastId);
      }, 300); // Animation duration
    }
  }

  /**
   * Create toast element
   */
  private createToastElement(toast: Toast): HTMLElement {
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${this.getToastTypeClass(toast.type)}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    const iconClass = this.getIconClass(toast.type);
    const closeButton = toast.persist 
      ? `<button type="button" class="btn-close" onclick="toastManager.hide('${toast.id}')"></button>`
      : '';

    toastEl.innerHTML = `
      <div class="toast-header ${this.getHeaderClass(toast.type)}">
        <i class="${iconClass} me-2"></i>
        <strong class="me-auto">${toast.title}</strong>
        ${closeButton}
      </div>
      ${toast.message ? `<div class="toast-body">${toast.message}</div>` : ''}
    `;

    return toastEl;
  }

  /**
   * Get toast type CSS class
   */
  private getToastTypeClass(type: string): string {
    switch (type) {
      case TOAST_TYPES.SUCCESS: return 'border-success';
      case TOAST_TYPES.ERROR: return 'border-danger';
      case TOAST_TYPES.WARNING: return 'border-warning';
      case TOAST_TYPES.INFO: return 'border-info';
      default: return 'border-secondary';
    }
  }

  /**
   * Get header class for toast type
   */
  private getHeaderClass(type: string): string {
    switch (type) {
      case TOAST_TYPES.SUCCESS: return 'bg-success text-white';
      case TOAST_TYPES.ERROR: return 'bg-danger text-white';
      case TOAST_TYPES.WARNING: return 'bg-warning text-dark';
      case TOAST_TYPES.INFO: return 'bg-info text-white';
      default: return 'bg-secondary text-white';
    }
  }

  /**
   * Get icon class for toast type
   */
  private getIconClass(type: string): string {
    switch (type) {
      case TOAST_TYPES.SUCCESS: return 'fas fa-check-circle';
      case TOAST_TYPES.ERROR: return 'fas fa-exclamation-circle';
      case TOAST_TYPES.WARNING: return 'fas fa-exclamation-triangle';
      case TOAST_TYPES.INFO: return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  }
}

/**
 * Loading spinner component
 */
export class LoadingComponent {
  private overlay: HTMLElement | null = null;

  /**
   * Show loading overlay
   */
  show(message: string = 'Đang tải...'): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
    this.overlay.style.cssText = `
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      backdrop-filter: blur(3px);
    `;

    this.overlay.innerHTML = `
      <div class="text-center text-white">
        <div class="spinner-border mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div>${message}</div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide loading overlay
   */
  hide(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      document.body.style.overflow = '';
    }
  }
}

/**
 * Modal component
 */
export class ModalComponent {
  private modal: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;

  /**
   * Show modal
   */
  show(config: {
    id: string;
    title: string;
    content: string | HTMLElement;
    size?: string;
    closable?: boolean;
    actions?: Array<{
      label: string;
      action: () => void | Promise<void>;
      variant?: string;
      disabled?: boolean;
    }>;
  }): void {
    this.hide(); // Close any existing modal

    this.createBackdrop();
    this.createModal(config);
    
    document.body.appendChild(this.backdrop!);
    document.body.appendChild(this.modal!);
    document.body.style.overflow = 'hidden';

    // Show with animation
    setTimeout(() => {
      this.backdrop!.classList.add('show');
      this.modal!.classList.add('show');
    }, 10);
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.modal && this.backdrop) {
      this.backdrop.classList.remove('show');
      this.modal.classList.remove('show');

      setTimeout(() => {
        if (this.backdrop) document.body.removeChild(this.backdrop);
        if (this.modal) document.body.removeChild(this.modal);
        this.backdrop = null;
        this.modal = null;
        document.body.style.overflow = '';
      }, 300);
    }
  }

  /**
   * Create modal backdrop
   */
  private createBackdrop(): void {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop fade';
    this.backdrop.addEventListener('click', () => this.hide());
  }

  /**
   * Create modal element
   */
  private createModal(config: any): void {
    this.modal = document.createElement('div');
    this.modal.className = 'modal fade';
    this.modal.style.display = 'block';

    const sizeClass = config.size ? `modal-${config.size}` : '';
    const closeButton = config.closable !== false 
      ? '<button type="button" class="btn-close" onclick="modalManager.hide()"></button>'
      : '';

    const actionsHtml = config.actions ? config.actions.map((action: any) => {
      const variant = action.variant || 'secondary';
      const disabled = action.disabled ? 'disabled' : '';
      return `<button type="button" class="btn btn-${variant} ${disabled}" onclick="modalManager.executeAction('${action.label}')">${action.label}</button>`;
    }).join('') : '';

    this.modal.innerHTML = `
      <div class="modal-dialog ${sizeClass}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${config.title}</h5>
            ${closeButton}
          </div>
          <div class="modal-body">
            ${typeof config.content === 'string' ? config.content : ''}
          </div>
          ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
        </div>
      </div>
    `;

    // Insert content if it's an HTML element
    if (typeof config.content !== 'string') {
      const modalBody = this.modal.querySelector('.modal-body');
      if (modalBody) {
        modalBody.innerHTML = '';
        modalBody.appendChild(config.content);
      }
    }

    // Store actions for later execution
    if (config.actions) {
      (this.modal as any)._actions = config.actions;
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && config.closable !== false) {
        this.hide();
      }
    });
  }

  /**
   * Execute modal action
   */
  executeAction(actionLabel: string): void {
    if (this.modal && (this.modal as any)._actions) {
      const action = (this.modal as any)._actions.find((a: any) => a.label === actionLabel);
      if (action && action.action) {
        const result = action.action();
        if (result instanceof Promise) {
          result.then(() => this.hide()).catch(console.error);
        } else {
          this.hide();
        }
      }
    }
  }
}

/**
 * Confirmation dialog component
 */
export class ConfirmDialogComponent extends ModalComponent {
  /**
   * Show confirmation dialog
   */
  confirm(config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.show({
        id: 'confirm-dialog',
        title: config.title,
        content: `<p>${config.message}</p>`,
        size: 'sm',
        actions: [
          {
            label: config.cancelText || 'Hủy',
            action: () => resolve(false),
            variant: 'secondary'
          },
          {
            label: config.confirmText || 'Xác nhận',
            action: () => resolve(true),
            variant: config.variant || 'primary'
          }
        ]
      });
    });
  }
}

// Export singleton instances
export const toastManager = new ToastComponent();
export const loadingManager = new LoadingComponent();
export const modalManager = new ModalComponent();
export const confirmDialog = new ConfirmDialogComponent();

// Make components globally available
(window as any).toastManager = toastManager;
(window as any).loadingManager = loadingManager;
(window as any).modalManager = modalManager;
(window as any).confirmDialog = confirmDialog;
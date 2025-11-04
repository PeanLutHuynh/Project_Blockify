import { FormField, FormErrors, ValidationRule } from '@/types';

/**
 * Form validation utilities
 */
export class FormValidator {
  /**
   * Validate a single field
   */
  static validateField(field: FormField, value: any): string[] {
    const errors: string[] = [];

    if (!field.validation) return errors;

    for (const rule of field.validation) {
      const error = this.validateRule(rule, value, field.label);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Validate a single rule
   */
  private static validateRule(rule: ValidationRule, value: any, fieldLabel: string): string | null {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return rule.message || `${fieldLabel} is required`;
        }
        break;

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return rule.message || `${fieldLabel} must be a valid email address`;
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return rule.message || `${fieldLabel} must be at least ${rule.value} characters long`;
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return rule.message || `${fieldLabel} must be no more than ${rule.value} characters long`;
        }
        break;

      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          return rule.message || `${fieldLabel} format is invalid`;
        }
        break;

      case 'custom':
        if (rule.validator) {
          const result = rule.validator(value);
          if (typeof result === 'string') {
            return result;
          } else if (!result) {
            return rule.message || `${fieldLabel} is invalid`;
          }
        }
        break;
    }

    return null;
  }

  /**
   * Validate entire form
   */
  static validateForm(fields: FormField[], formData: Record<string, any>): FormErrors {
    const errors: FormErrors = {};

    fields.forEach(field => {
      const fieldErrors = this.validateField(field, formData[field.name]);
      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      }
    });

    return errors;
  }
}

/**
 * Helper functions for common validations
 */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (!/(?=.*[a-zA-Z])/.test(password)) {
      errors.push('Password must contain at least one letter');
    }
    if (!/(?=.*[0-9])/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validateUsername = (username: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 30) {
      errors.push('Username must be no more than 30 characters long');
    }
    if (!/^(?=\p{L})[\p{L}0-9]+(?:[_\-.][\p{L}0-9]+)*$/u.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validatePhone = (phone: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push('Phone number must be between 10 and 15 digits');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Format utilities
 */
export const formatPrice = (price: number, currency = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency
  }).format(price);
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Debounce function for input handlers
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait) as any;
  };
};

/**
 * Throttle function for scroll/resize handlers
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Generate unique ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get time ago string
 */
export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Check if element is in viewport
 */
export const isInViewport = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Smooth scroll to element
 */
export const scrollToElement = (element: Element | string, offset = 0): void => {
  const target = typeof element === 'string' ? document.querySelector(element) : element;
  
  if (target) {
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

/**
 * Download file from URL
 */
export const downloadFile = (url: string, filename?: string): void => {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
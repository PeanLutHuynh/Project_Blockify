import validator from 'validator';
import { ValidationErrors } from '../types/common';

/**
 * Validation utility class with common validation methods
 */
export class ValidatorUtil {
  /**
   * Validate email address
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }

    if (!validator.isEmail(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Password must be less than 128 characters' };
    }

    // Check for at least one letter and one number
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one letter and one number' };
    }

    return { isValid: true };
  }

  /**
   * Validate username
   */
  static validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username) {
      return { isValid: false, error: 'Username is required' };
    }

    if (username.length < 3 || username.length > 30) {
      return { isValid: false, error: 'Username must be between 3 and 30 characters' };
    }

    if (!/^(?=\p{L})[\p{L}0-9]+(?:[_\-.][\p{L}0-9]+)*$/u.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }

    // Check for reserved usernames
    const reservedUsernames = ['admin', 'root', 'api', 'www', 'support', 'help', 'null', 'undefined'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return { isValid: false, error: 'This username is reserved' };
    }

    return { isValid: true };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    if (!phone) {
      return { isValid: true }; // Phone is optional
    }

    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return { isValid: false, error: 'Phone number must be between 10 and 15 digits' };
    }

    if (!validator.isMobilePhone(phone, 'any')) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true };
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string): { isValid: boolean; error?: string } {
    if (!url) {
      return { isValid: true }; // URL is optional
    }

    if (!validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true 
    })) {
      return { isValid: false, error: 'Invalid URL format' };
    }

    return { isValid: true };
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid: string): { isValid: boolean; error?: string } {
    if (!uuid) {
      return { isValid: false, error: 'UUID is required' };
    }

    if (!validator.isUUID(uuid)) {
      return { isValid: false, error: 'Invalid UUID format' };
    }

    return { isValid: true };
  }

  /**
   * Validate price
   */
  static validatePrice(price: number): { isValid: boolean; error?: string } {
    if (price === undefined || price === null) {
      return { isValid: false, error: 'Price is required' };
    }

    if (typeof price !== 'number' || isNaN(price)) {
      return { isValid: false, error: 'Price must be a number' };
    }

    if (price < 0) {
      return { isValid: false, error: 'Price cannot be negative' };
    }

    if (price > 999999.99) {
      return { isValid: false, error: 'Price cannot exceed 999,999.99' };
    }

    return { isValid: true };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity: number): { isValid: boolean; error?: string } {
    if (quantity === undefined || quantity === null) {
      return { isValid: false, error: 'Quantity is required' };
    }

    if (!Number.isInteger(quantity)) {
      return { isValid: false, error: 'Quantity must be an integer' };
    }

    if (quantity < 0) {
      return { isValid: false, error: 'Quantity cannot be negative' };
    }

    if (quantity > 99999) {
      return { isValid: false, error: 'Quantity cannot exceed 99,999' };
    }

    return { isValid: true };
  }

  /**
   * Validate slug
   */
  static validateSlug(slug: string): { isValid: boolean; error?: string } {
    if (!slug) {
      return { isValid: false, error: 'Slug is required' };
    }

    if (slug.length < 2 || slug.length > 100) {
      return { isValid: false, error: 'Slug must be between 2 and 100 characters' };
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { isValid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    return { isValid: true };
  }

  /**
   * Validate array of strings
   */
  static validateStringArray(arr: any, fieldName: string = 'Array'): { isValid: boolean; error?: string } {
    if (!Array.isArray(arr)) {
      return { isValid: false, error: `${fieldName} must be an array` };
    }

    if (arr.length === 0) {
      return { isValid: true }; // Empty array is valid
    }

    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string') {
        return { isValid: false, error: `${fieldName} must contain only strings` };
      }
      if (arr[i].trim().length === 0) {
        return { isValid: false, error: `${fieldName} cannot contain empty strings` };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate date string
   */
  static validateDate(dateString: string): { isValid: boolean; error?: string } {
    if (!dateString) {
      return { isValid: false, error: 'Date is required' };
    }

    if (!validator.isISO8601(dateString)) {
      return { isValid: false, error: 'Date must be in ISO 8601 format' };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date' };
    }

    return { isValid: true };
  }

  /**
   * Validate object with multiple fields
   */
  static validateObject<T extends Record<string, any>>(
    obj: T,
    validationRules: { [K in keyof T]?: (value: T[K]) => { isValid: boolean; error?: string } }
  ): { isValid: boolean; errors: ValidationErrors } {
    const errors: ValidationErrors = {};

    Object.keys(validationRules).forEach(key => {
      const validator = validationRules[key];
      if (validator) {
        const result = validator(obj[key]);
        if (!result.isValid) {
          errors[key] = result.error || 'Invalid value';
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(str: string): string {
    if (typeof str !== 'string') return '';
    
    return validator.escape(str.trim());
  }

  /**
   * Normalize email
   */
  static normalizeEmail(email: string): string {
    return validator.normalizeEmail(email) || email.toLowerCase().trim();
  }

  /**
   * Generate slug from string
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validate file type
   */
  static validateFileType(mimetype: string, allowedTypes: string[]): { isValid: boolean; error?: string } {
    if (!allowedTypes.includes(mimetype)) {
      return { 
        isValid: false, 
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSize: number): { isValid: boolean; error?: string } {
    if (size > maxSize) {
      return { 
        isValid: false, 
        error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB` 
      };
    }

    return { isValid: true };
  }
}

// Helper functions for common validations
export const isValidEmail = (email: string): boolean => 
  ValidatorUtil.validateEmail(email).isValid;

export const isValidPassword = (password: string): boolean => 
  ValidatorUtil.validatePassword(password).isValid;

export const isValidUsername = (username: string): boolean => 
  ValidatorUtil.validateUsername(username).isValid;

export const isValidPhone = (phone: string): boolean => 
  ValidatorUtil.validatePhone(phone).isValid;

export const isValidUrl = (url: string): boolean => 
  ValidatorUtil.validateUrl(url).isValid;

export const isValidUUID = (uuid: string): boolean => 
  ValidatorUtil.validateUUID(uuid).isValid;

export const isValidPrice = (price: number): boolean => 
  ValidatorUtil.validatePrice(price).isValid;

export const isValidQuantity = (quantity: number): boolean => 
  ValidatorUtil.validateQuantity(quantity).isValid;

export const isValidSlug = (slug: string): boolean => 
  ValidatorUtil.validateSlug(slug).isValid;

export const generateSlug = (text: string): string => 
  ValidatorUtil.generateSlug(text);

export const sanitizeString = (str: string): string => 
  ValidatorUtil.sanitizeString(str);

export const normalizeEmail = (email: string): string => 
  ValidatorUtil.normalizeEmail(email);
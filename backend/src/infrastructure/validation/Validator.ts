import { HttpRequest, HttpResponse, Middleware, NextFunction } from '../http/types';
import { InputValidator } from '../security';

/**
 * Custom Validation Middleware
 */

export interface ValidationRule {
  field: string;
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    isEmail?: boolean;
    isUUID?: boolean;
    isAlphanumeric?: boolean;
    isIn?: any[];
    matches?: RegExp;
    custom?: (value: any) => boolean | string;
  };
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class Validator {
  private rules: ValidationRule[] = [];

  /**
   * Static method to create validation middleware from field validators
   */
  static validate(fields: FieldValidator[]): Middleware {
    const validator = new Validator();
    fields.forEach(field => field.build());
    
    return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
      // Collect all rules from field validators
      const allRules: ValidationRule[] = [];
      fields.forEach(field => {
        const fieldValidator = field as any;
        if (fieldValidator.currentRule) {
          allRules.push(fieldValidator.currentRule);
        }
      });

      // Create validator with all rules
      const validatorInstance = new Validator();
      allRules.forEach(rule => validatorInstance.addRule(rule));

      const errors = validatorInstance.validate(req.body);

      if (errors.length > 0) {
        res.status(400);
        res.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors: errors,
          },
        });
        return;
      }

      await next();
    };
  }

  /**
   * Static method to create field validator
   */
  static field(fieldName: string): FieldValidator {
    return new FieldValidator(fieldName, new Validator());
  }

  /**
   * Add validation rule
   */
  field(fieldName: string): FieldValidator {
    return new FieldValidator(fieldName, this);
  }

  /**
   * Add rule to validator
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Validate request body
   */
  validate(data: any): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      const value = data[rule.field];

      // Required check
      if (rule.rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} is required`,
        });
        continue;
      }

      // Skip other validations if field is empty and not required
      if (!value && !rule.rules.required) {
        continue;
      }

      // Min length
      if (rule.rules.minLength && value.length < rule.rules.minLength) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be at least ${rule.rules.minLength} characters`,
        });
      }

      // Max length
      if (rule.rules.maxLength && value.length > rule.rules.maxLength) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be at most ${rule.rules.maxLength} characters`,
        });
      }

      // Email
      if (rule.rules.isEmail && !InputValidator.isValidEmail(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be a valid email`,
        });
      }

      // UUID
      if (rule.rules.isUUID && !InputValidator.isValidUUID(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be a valid UUID`,
        });
      }

      // Alphanumeric
      if (rule.rules.isAlphanumeric && !InputValidator.isAlphanumeric(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must contain only letters and numbers`,
        });
      }

      // Is in array
      if (rule.rules.isIn && !rule.rules.isIn.includes(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be one of: ${rule.rules.isIn.join(', ')}`,
        });
      }

      // Matches regex
      if (rule.rules.matches && !rule.rules.matches.test(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} format is invalid`,
        });
      }

      // Custom validation
      if (rule.rules.custom) {
        const result = rule.rules.custom(value);
        if (result !== true) {
          errors.push({
            field: rule.field,
            message: typeof result === 'string' ? result : rule.message || `${rule.field} is invalid`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Create middleware
   */
  middleware(): Middleware {
    return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
      const errors = this.validate(req.body);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors: errors,
          },
        });
        return;
      }

      await next();
    };
  }
}

/**
 * Field validator helper
 */
export class FieldValidator {
  private fieldName: string;
  private validator: Validator;
  public currentRule: ValidationRule;

  constructor(fieldName: string, validator: Validator) {
    this.fieldName = fieldName;
    this.validator = validator;
    this.currentRule = {
      field: fieldName,
      rules: {},
    };
  }

  optional(): FieldValidator {
    // Field is optional by default, this is just for clarity
    return this;
  }

  required(message?: string): FieldValidator {
    this.currentRule.rules.required = true;
    if (message) this.currentRule.message = message;
    return this;
  }

  minLength(length: number, message?: string): FieldValidator {
    this.currentRule.rules.minLength = length;
    if (message) this.currentRule.message = message;
    return this;
  }

  maxLength(length: number, message?: string): FieldValidator {
    this.currentRule.rules.maxLength = length;
    if (message) this.currentRule.message = message;
    return this;
  }

  isEmail(message?: string): FieldValidator {
    this.currentRule.rules.isEmail = true;
    if (message) this.currentRule.message = message;
    return this;
  }

  isUUID(message?: string): FieldValidator {
    this.currentRule.rules.isUUID = true;
    if (message) this.currentRule.message = message;
    return this;
  }

  isAlphanumeric(message?: string): FieldValidator {
    this.currentRule.rules.isAlphanumeric = true;
    if (message) this.currentRule.message = message;
    return this;
  }

  isIn(values: any[], message?: string): FieldValidator {
    this.currentRule.rules.isIn = values;
    if (message) this.currentRule.message = message;
    return this;
  }

  matches(pattern: RegExp, message?: string): FieldValidator {
    this.currentRule.rules.matches = pattern;
    if (message) this.currentRule.message = message;
    return this;
  }

  custom(fn: (value: any) => boolean | string, message?: string): FieldValidator {
    this.currentRule.rules.custom = fn;
    if (message) this.currentRule.message = message;
    return this;
  }

  build(): Validator {
    this.validator.addRule(this.currentRule);
    return this.validator;
  }
}

/**
 * Create validator
 */
export function createValidator(): Validator {
  return new Validator();
}

/**
 * Validate request helper
 */
export function validateRequest(rules: ValidationRule[]): Middleware {
  const validator = new Validator();
  rules.forEach((rule) => validator.addRule(rule));
  return validator.middleware();
}

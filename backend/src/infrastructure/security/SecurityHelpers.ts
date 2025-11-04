import * as crypto from 'crypto';

/**
 * Custom CSRF Protection - No external libraries
 */
export class CSRF {
  private tokens: Map<string, { token: string; expires: number }> = new Map();
  private secret: string;
  private tokenLifetime: number;

  constructor(secret: string, tokenLifetime: number = 3600000) {
    // 1 hour default
    this.secret = secret;
    this.tokenLifetime = tokenLifetime;
  }

  /**
   * Generate CSRF token for a session
   */
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + this.tokenLifetime;

    this.tokens.set(sessionId, { token, expires });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Verify CSRF token
   */
  verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);

    if (!stored) return false;
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }

    return stored.token === token;
  }

  /**
   * Remove token for session
   */
  removeToken(sessionId: string): void {
    this.tokens.delete(sessionId);
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, { expires }] of this.tokens.entries()) {
      if (now > expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * Rate Limiter - Custom implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests
    let requests = this.requests.get(identifier) || [];

    // Filter out old requests
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = (this.requests.get(identifier) || []).filter(
      (timestamp) => timestamp > windowStart
    );

    return Math.max(0, this.maxRequests - requests.length);
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((t) => t > windowStart);

      if (validTimestamps.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validTimestamps);
      }
    }
  }
}

/**
 * XSS Protection - Sanitize input
 */
export class XSSProtection {
  /**
   * Escape HTML entities
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  /**
   * Remove dangerous tags and attributes
   */
  static sanitize(html: string): string {
    // Remove script tags
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    clean = clean.replace(/javascript:/gi, '');

    // Remove data: protocol (except images)
    clean = clean.replace(/(<(?!img)[^>]+)data:/gi, '$1');

    return clean;
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url: string): string {
    // Check for dangerous protocols
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'about:',
    ];

    const lowerUrl = url.toLowerCase().trim();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '';
      }
    }

    return url;
  }
}

/**
 * SQL Injection Protection
 */
export class SQLInjectionProtection {
  private static readonly SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\*\/|\/\*)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
    /['"]\s*(OR|AND)\s+['"]\s*['"]/gi,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
  ];

  /**
   * Check if input contains SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    for (const pattern of this.SQL_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Sanitize input by escaping special SQL characters
   */
  static sanitize(input: string): string {
    // Basic escaping for SQL special characters
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0');
  }

  /**
   * Validate identifier (table/column names)
   */
  static isValidIdentifier(identifier: string): boolean {
    // Only allow alphanumeric, underscore, and hyphen
    return /^[a-zA-Z0-9_-]+$/.test(identifier);
  }
}

/**
 * Input Validation Helper
 */
export class InputValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate string length
   */
  static isValidLength(
    str: string,
    min: number = 0,
    max: number = Infinity
  ): boolean {
    return str.length >= min && str.length <= max;
  }

  /**
   * Validate numeric range
   */
  static isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  }

  /**
   * Validate alphanumeric
   */
  static isAlphanumeric(str: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(str);
  }
}

import * as crypto from 'crypto';

/**
 * Custom JWT implementation using Node.js crypto module
 * No external libraries - pure native implementation
 */

export interface JwtHeader {
  alg: 'HS256' | 'HS384' | 'HS512';
  typ: 'JWT';
}

export interface JwtPayload {
  [key: string]: any;
  iat?: number;  // Issued at
  exp?: number;  // Expiration time
  nbf?: number;  // Not before
  iss?: string;  // Issuer
  sub?: string;  // Subject
  aud?: string;  // Audience
  jti?: string;  // JWT ID
}

export interface JwtVerifyResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

export class JWT {
  private secret: string;
  private algorithm: 'HS256' | 'HS384' | 'HS512';
  
  constructor(secret: string, algorithm: 'HS256' | 'HS384' | 'HS512' = 'HS256') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }
    
    this.secret = secret;
    this.algorithm = algorithm;
  }

  /**
   * Sign a JWT token
   */
  sign(payload: JwtPayload, expiresIn?: number): string {
    const header: JwtHeader = {
      alg: this.algorithm,
      typ: 'JWT'
    };

    // Add timestamps
    const now = Math.floor(Date.now() / 1000);
    const completePayload: JwtPayload = {
      ...payload,
      iat: now
    };

    if (expiresIn) {
      completePayload.exp = now + expiresIn;
    }

    // Encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(completePayload));

    // Create signature
    const signature = this.createSignature(encodedHeader, encodedPayload);

    // Return complete token
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode a JWT token
   */
  verify(token: string): JwtVerifyResult {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token format'
        };
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify signature
      const expectedSignature = this.createSignature(encodedHeader, encodedPayload);
      
      if (signature !== expectedSignature) {
        return {
          valid: false,
          error: 'Invalid signature'
        };
      }

      // Decode payload
      const payload: JwtPayload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // Check expiration
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (now > payload.exp) {
          return {
            valid: false,
            error: 'Token expired'
          };
        }
      }

      // Check not before
      if (payload.nbf) {
        const now = Math.floor(Date.now() / 1000);
        if (now < payload.nbf) {
          return {
            valid: false,
            error: 'Token not yet valid'
          };
        }
      }

      return {
        valid: true,
        payload
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid token'
      };
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decode(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      return JSON.parse(this.base64UrlDecode(parts[1]));
    } catch {
      return null;
    }
  }

  /**
   * Create HMAC signature
   */
  private createSignature(encodedHeader: string, encodedPayload: string): string {
    const data = `${encodedHeader}.${encodedPayload}`;
    
    // Determine hash algorithm
    const hashAlgorithm = this.algorithm.replace('HS', 'sha');
    
    // Create HMAC
    const hmac = crypto.createHmac(hashAlgorithm, this.secret);
    hmac.update(data);
    
    // Return base64url encoded signature
    return this.base64UrlEncode(hmac.digest());
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(data: string | Buffer): string {
    const base64 = Buffer.from(data).toString('base64');
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(data: string): string {
    // Pad with = to make it valid base64
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Generate random JWT ID
   */
  static generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Helper function to create JWT instance
 */
export function createJWT(secret: string, algorithm?: 'HS256' | 'HS384' | 'HS512'): JWT {
  return new JWT(secret, algorithm);
}

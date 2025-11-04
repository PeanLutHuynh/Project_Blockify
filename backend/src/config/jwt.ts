import { JWT } from '../infrastructure/security/JWT';
import dotenv from 'dotenv';

dotenv.config();

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

export class JWTConfig {
  private static jwt: JWT;
  private static refreshJwt: JWT;
  private static readonly expiresIn: number = parseInt(process.env.JWT_EXPIRES_IN || '86400', 10); // 24 hours default
  private static readonly refreshExpiresIn: number = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10); // 7 days default

  private static initialize() {
    if (!this.jwt) {
      const secret = process.env.JWT_SECRET || '';
      const algorithm = (process.env.JWT_ALGORITHM as 'HS256' | 'HS384' | 'HS512') || 'HS256';
      this.jwt = new JWT(secret, algorithm);

      const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;
      this.refreshJwt = new JWT(refreshSecret, algorithm);
    }
  }

  static generateAccessToken(payload: JwtPayload): string {
    this.initialize();
    return this.jwt.sign(payload, this.expiresIn);
  }

  static generateRefreshToken(payload: JwtPayload): string {
    this.initialize();
    return this.refreshJwt.sign(payload, this.refreshExpiresIn);
  }

  static verifyAccessToken(token: string): JwtPayload | null {
    this.initialize();
    const result = this.jwt.verify(token);
    return result && result.valid ? (result.payload as JwtPayload) : null;
  }

  static verifyRefreshToken(token: string): JwtPayload | null {
    this.initialize();
    const result = this.refreshJwt.verify(token);
    return result && result.valid ? (result.payload as JwtPayload) : null;
  }

  static decodeToken(token: string): JwtPayload | null {
    this.initialize();
    const result = this.jwt.decode(token);
    return result && result.valid ? (result.payload as JwtPayload) : null;
  }
}
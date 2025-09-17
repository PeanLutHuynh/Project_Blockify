import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

export class JWTConfig {
  private static readonly secret = process.env.JWT_SECRET!;
  private static readonly refreshSecret = process.env.JWT_REFRESH_SECRET!;
  private static readonly expiresIn: SignOptions["expiresIn"] =
    (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";
  private static readonly refreshExpiresIn: SignOptions["expiresIn"] =
    (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";

  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
    });
  }

  static verifyAccessToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as JwtPayload;
    } catch {
      return null;
    }
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
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
  private static readonly expiresIn: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";
  private static readonly refreshExpiresIn: SignOptions["expiresIn"] = (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";

  static generateAccessToken(payload: JwtPayload): string {
    const options: SignOptions = { expiresIn: this.expiresIn };
    return jwt.sign(payload, this.secret, options);
  }

  static generateRefreshToken(payload: JwtPayload): string {
    const options: SignOptions = { expiresIn: this.refreshExpiresIn };
    return jwt.sign(payload, this.refreshSecret, options);
  }

  static verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload | string;
      return typeof decoded === "string" ? null : decoded;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as | JwtPayload | string;
      return typeof decoded === "string" ? null : decoded;
    } catch {
      return null;
    }
  }
}

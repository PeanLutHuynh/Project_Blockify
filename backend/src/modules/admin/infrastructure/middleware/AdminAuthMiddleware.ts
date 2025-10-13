import { AdminRepository } from "../repositories/AdminRepository";
import { HttpRequest, HttpResponse, NextFunction } from "../../../../infrastructure/http/types";
import { JWTConfig } from "../../../../config/jwt";

export interface AdminRequest extends HttpRequest {
  admin?: {
    adminId: number;
    authUid: string;
    email: string;
    fullName: string;
    role: string;
  };
}

/**
 * Middleware to verify Admin authentication
 * Checks if JWT token has admin role
 * and validates against admin_users table
 */
export async function requireAdmin(
  req: AdminRequest,
  res: HttpResponse,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify backend JWT token
    const payload = JWTConfig.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Check if token has admin role
    if (payload.role !== "admin") {
      res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
      return;
    }

    // Verify admin exists in admin_users table
    const adminRepo = new AdminRepository();
    const admin = await adminRepo.findByEmail(payload.email);

    if (!admin) {
      res.status(403).json({
        error: "Admin record not found in database",
      });
      return;
    }

    // Check if admin is active
    if (!admin.isActive) {
      res.status(403).json({
        error: "Admin account is inactive",
      });
      return;
    }

    // Attach admin info to request
    req.admin = {
      adminId: admin.adminId,
      authUid: admin.authUid || '',
      email: admin.email,
      fullName: admin.fullName,
      role: "admin",
    };

    await next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({ error: "Internal authentication error" });
  }
}

/**
 * Middleware to optionally check admin (doesn't block if not admin)
 */
export async function optionalAdmin(
  req: AdminRequest,
  res: HttpResponse,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await next();
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = JWTConfig.verifyAccessToken(token);

    if (payload && payload.role === "admin") {
      const adminRepo = new AdminRepository();
      const admin = await adminRepo.findByEmail(payload.email);

      if (admin && admin.isActive) {
        req.admin = {
          adminId: admin.adminId,
          authUid: admin.authUid || '',
          email: admin.email,
          fullName: admin.fullName,
          role: "admin",
        };
      }
    }

    await next();
  } catch (error) {
    console.error("Optional admin check error:", error);
    await next();
  }
}

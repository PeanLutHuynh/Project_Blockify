import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminService } from "../application/AdminService";
import { AdminRequest } from "../infrastructure/middleware/AdminAuthMiddleware";

/**
 * Admin Controller - Presentation Layer
 * Handles HTTP requests related to Admin operations
 */
export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * Helper: Parse JSON body from request
   */
  private async parseBody(req: HttpRequest): Promise<any> {
    return req.body || {};
  }

  /**
   * Helper: Send JSON response
   */
  private sendSuccess(res: HttpResponse, data: any): void {
    res.json({ success: true, ...data });
  }

  private sendError(res: HttpResponse, code: number, message: string): void {
    res.status(code).json({ success: false, error: message });
  }

  /**
   * POST /api/admin/check
   * Check if user is admin and get admin info
   */
  async checkAdmin(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const body = await this.parseBody(req);
      const { auth_uid } = body;

      if (!auth_uid) {
        this.sendError(res, 400, "auth_uid is required");
        return;
      }

      const result = await this.adminService.checkAdmin({ authUid: auth_uid });

      if (!result.isAdmin) {
        this.sendError(res, 403, "User is not an admin");
        return;
      }

      this.sendSuccess(res, result);
    } catch (error: any) {
      console.error("Check admin error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * POST /api/admin/login-audit
   * Log admin login event
   */
  async logLogin(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const ip = req.raw.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      await this.adminService.logAdminLogin({
        adminId: req.admin.adminId,
        ip,
        userAgent,
        method: "google", // or detect from request
      });

      this.sendSuccess(res, { message: "Login logged successfully" });
    } catch (error: any) {
      console.error("Log login error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * POST /api/admin/link-auth
   * Link auth account to existing admin by email
   */
  async linkAuthAccount(
    req: AdminRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      const body = await this.parseBody(req);
      const { email, auth_uid } = body;

      if (!email || !auth_uid) {
        this.sendError(res, 400, "email and auth_uid are required");
        return;
      }

      await this.adminService.linkAuthAccount({ email, authUid: auth_uid });

      this.sendSuccess(res, {
        message: "Auth account linked successfully",
      });
    } catch (error: any) {
      console.error("Link auth account error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * GET /api/admin/audit-logs
   * Get audit logs for current admin
   */
  async getAuditLogs(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const limit = parseInt(req.query.limit as string || "50");

      const logs = await this.adminService.getAdminAuditLogs(
        req.admin.adminId,
        limit
      );

      this.sendSuccess(res, {
        logs: logs.map((log) => log.toJSON()),
      });
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * GET /api/admin/me
   * Get current admin info
   */
  async getCurrentAdmin(
    req: AdminRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      this.sendSuccess(res, {
        admin: {
          adminId: req.admin.adminId,
          email: req.admin.email,
          fullName: req.admin.fullName,
          role: req.admin.role,
        },
      });
    } catch (error: any) {
      console.error("Get current admin error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * GET /api/admin/all
   * Get all admins (super admin only)
   */
  async getAllAdmins(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const admins = await this.adminService.getAllAdmins();

      this.sendSuccess(res, {
        admins: admins.map((admin) => admin.toJSON()),
      });
    } catch (error: any) {
      console.error("Get all admins error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * POST /api/admin/create
   * Create new admin manually
   */
  async createAdmin(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const body = await this.parseBody(req);
      const { email, full_name, auth_uid } = body;

      if (!email || !full_name) {
        this.sendError(res, 400, "email and full_name are required");
        return;
      }

      const admin = await this.adminService.createAdmin({
        email,
        fullName: full_name,
        authUid: auth_uid,
      });

      // Log the creation
      await this.adminService.logAdminAction({
        adminId: req.admin.adminId,
        action: "CREATE",
        targetType: "admin",
        targetId: admin.adminId.toString(),
        payload: {
          email,
          full_name,
        },
      });

      this.sendSuccess(res, {
        message: "Admin created successfully",
        admin: admin.toJSON(),
      });
    } catch (error: any) {
      console.error("Create admin error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }

  /**
   * POST /api/admin/deactivate/:id
   * Deactivate an admin
   */
  async deactivateAdmin(
    req: AdminRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      if (!req.admin) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const adminId = parseInt(req.params.id);

      if (!adminId) {
        this.sendError(res, 400, "Invalid admin ID");
        return;
      }

      await this.adminService.deactivateAdmin(adminId, req.admin.adminId);

      this.sendSuccess(res, {
        message: "Admin deactivated successfully",
      });
    } catch (error: any) {
      console.error("Deactivate admin error:", error);
      this.sendError(res, 500, error.message || "Internal server error");
    }
  }
}

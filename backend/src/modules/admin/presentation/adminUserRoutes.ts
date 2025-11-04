import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminUserController } from "./AdminUserController";
import { authenticateToken } from "../../../infrastructure/auth";

/**
 * Admin User Routes Configuration
 * Registers all admin user management endpoints
 */
export function registerAdminUserRoutes(router: any): void {
  const adminUserController = new AdminUserController();

  // Get all users (with filters and search)
  router.get("/api/admin/users", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminUserController.getUsers(req, res);
  });

  // Get user statistics
  router.get("/api/admin/users/statistics", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminUserController.getUserStatistics(req, res);
  });

  // Get user by ID
  router.get("/api/admin/users/:userId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const userId = urlParts[urlParts.length - 1].split("?")[0] || "";
    req.params = { userId };
    await adminUserController.getUserById(req, res);
  });

  // Update user status (activate/deactivate)
  router.patch("/api/admin/users/:userId/status", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const userId = urlParts[urlParts.length - 2] || "";
    req.params = { userId };
    await adminUserController.toggleUserStatus(req, res);
  });

  // Update user information
  router.put("/api/admin/users/:userId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const userId = urlParts[urlParts.length - 1].split("?")[0] || "";
    req.params = { userId };
    await adminUserController.updateUser(req, res);
  });
}

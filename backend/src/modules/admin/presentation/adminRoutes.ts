import { Router } from "../../../infrastructure/http/Router";
import { AdminController } from "./AdminController";
import { requireAdmin } from "../infrastructure/middleware/AdminAuthMiddleware";

/**
 * Admin Routes
 * All routes require admin authentication
 */
export function setupAdminRoutes(router: Router): void {
  const adminController = new AdminController();

  // Public route: Check if user is admin (no auth required)
  router.post("/api/admin/check", adminController.checkAdmin.bind(adminController));

  // Protected routes: Require admin authentication
  router.post(
    "/api/admin/login-audit",
    requireAdmin,
    adminController.logLogin.bind(adminController)
  );

  router.post(
    "/api/admin/link-auth",
    requireAdmin,
    adminController.linkAuthAccount.bind(adminController)
  );

  router.get(
    "/api/admin/audit-logs",
    requireAdmin,
    adminController.getAuditLogs.bind(adminController)
  );

  router.get(
    "/api/admin/me",
    requireAdmin,
    adminController.getCurrentAdmin.bind(adminController)
  );

  router.get(
    "/api/admin/all",
    requireAdmin,
    adminController.getAllAdmins.bind(adminController)
  );

  router.post(
    "/api/admin/create",
    requireAdmin,
    adminController.createAdmin.bind(adminController)
  );

  router.post(
    "/api/admin/deactivate/:id",
    requireAdmin,
    adminController.deactivateAdmin.bind(adminController)
  );
}

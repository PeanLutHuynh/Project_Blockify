import { Router } from "../../../infrastructure/http/Router";
import { AdminController } from "./AdminController";
import { requireAdmin } from "../infrastructure/middleware/AdminAuthMiddleware";
import { createAdminUserRouter } from "../../user/presentation/adminUserRoutes";

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

  // Admin User Management Routes (with admin auth middleware)
  const adminUserRouter = createAdminUserRouter();
  const adminUserRoutes = adminUserRouter.getRoutes();
  
  adminUserRoutes.forEach(route => {
    // Wrap handler with admin middleware
    const wrappedHandler = async (req: any, res: any) => {
      // Check admin first
      const adminMiddlewareResult = await requireAdmin(req, res, () => {});
      if (adminMiddlewareResult !== undefined) {
        return; // Middleware blocked the request
      }
      // Call original handler
      return route.handler(req, res);
    };
    
    router.addRoute(
      route.method,
      `/api/v1/admin/users${route.path}`,
      wrappedHandler
    );
  });
}

import { Router } from "../../../infrastructure/http/Router";
import { AdminController } from "./AdminController";
// import { AdminProductController } from "./AdminProductController";
import { requireAdmin } from "../infrastructure/middleware/AdminAuthMiddleware";
import { registerAdminUserRoutes } from "./adminUserRoutes";
import { registerAdminDashboardRoutes } from "./adminDashboardRoutes";

/**
 * Admin Routes
 * All routes require admin authentication
 */
export function setupAdminRoutes(router: Router): void {
  const adminController = new AdminController();
  // const productController = new AdminProductController();

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

  // ========================================
  // Admin Product Management Routes
  // NOTE: Temporarily commented out - will be moved to adminProductRoutes.ts
  // ========================================
  
  // // Search products
  // router.get(
  //   "/api/admin/products/search",
  //   requireAdmin,
  //   productController.searchProducts.bind(productController)
  // );

  // // Get products needing restock
  // router.get(
  //   "/api/admin/products/restock/needed",
  //   requireAdmin,
  //   productController.getProductsNeedingRestock.bind(productController)
  // );

  // // Get all products with pagination
  // router.get(
  //   "/api/admin/products",
  //   requireAdmin,
  //   productController.getAllProducts.bind(productController)
  // );

  // // Get product by ID
  // router.get(
  //   "/api/admin/products/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.getProductById(req, res, req.params.id);
  //   }
  // );

  // // Create product
  // router.post(
  //   "/api/admin/products",
  //   requireAdmin,
  //   productController.createProduct.bind(productController)
  // );

  // // Update product
  // router.put(
  //   "/api/admin/products/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.updateProduct(req, res, req.params.id);
  //   }
  // );

  // // Delete product
  // router.delete(
  //   "/api/admin/products/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.deleteProduct(req, res, req.params.id);
  //   }
  // );

  // // Update product stock
  // router.patch(
  //   "/api/admin/products/:id/stock",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.updateStock(req, res, req.params.id);
  //   }
  // );

  // // Update product status
  // router.patch(
  //   "/api/admin/products/:id/status",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.updateStatus(req, res, req.params.id);
  //   }
  // );

  // // Add images to product
  // router.post(
  //   "/api/admin/products/:id/images",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.addProductImages(req, res, req.params.id);
  //   }
  // );

  // // Delete product image
  // router.delete(
  //   "/api/admin/products/images/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.deleteProductImage(req, res, req.params.id);
  //   }
  // );

  // // ========================================
  // // Admin Category Management Routes
  // // ========================================

  // // Get all categories
  // router.get(
  //   "/api/admin/categories",
  //   requireAdmin,
  //   productController.getAllCategories.bind(productController)
  // );

  // // Get active categories
  // router.get(
  //   "/api/admin/categories/active",
  //   requireAdmin,
  //   productController.getActiveCategories.bind(productController)
  // );

  // // Create category
  // router.post(
  //   "/api/admin/categories",
  //   requireAdmin,
  //   productController.createCategory.bind(productController)
  // );

  // // Update category
  // router.put(
  //   "/api/admin/categories/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.updateCategory(req, res, req.params.id);
  //   }
  // );

  // // Delete category
  // router.delete(
  //   "/api/admin/categories/:id",
  //   requireAdmin,
  //   (req: any, res: any) => {
  //     productController.deleteCategory(req, res, req.params.id);
  //   }
  // );

  // Admin User Management Routes
  registerAdminUserRoutes(router);

  // Admin Dashboard Routes
  registerAdminDashboardRoutes(router);
}

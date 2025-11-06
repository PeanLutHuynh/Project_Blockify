import { Router } from '../../../infrastructure/http/Router';
import { AdminDashboardController } from './AdminDashboardController';
import { requireAdmin } from '../infrastructure/middleware/AdminAuthMiddleware';

/**
 * Admin Dashboard Routes
 * All routes require admin authentication
 */
export function registerAdminDashboardRoutes(router: Router): void {
  const dashboardController = new AdminDashboardController();

  /**
   * GET /api/admin/dashboard/revenue
   * Get revenue report grouped by day or month
   * Query params:
   * - startDate: YYYY-MM-DD (required)
   * - endDate: YYYY-MM-DD (required)
   * - groupBy: 'day' | 'month' (default: 'day')
   */
  router.get(
    '/api/admin/dashboard/revenue',
    requireAdmin,
    dashboardController.getRevenueReport
  );

  /**
   * GET /api/admin/dashboard/order-stats
   * Get order success/failure statistics
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  router.get(
    '/api/admin/dashboard/order-stats',
    requireAdmin,
    dashboardController.getOrderStats
  );

  /**
   * GET /api/admin/dashboard/conversion-rate
   * Get customer conversion rate
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  router.get(
    '/api/admin/dashboard/conversion-rate',
    requireAdmin,
    dashboardController.getConversionRate
  );

  /**
   * GET /api/admin/dashboard/popular-categories
   * Get popular product categories
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - limit: number (default: 10)
   */
  router.get(
    '/api/admin/dashboard/popular-categories',
    requireAdmin,
    dashboardController.getPopularCategories
  );

  /**
   * GET /api/admin/dashboard/overview
   * Get dashboard overview (all stats combined)
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  router.get(
    '/api/admin/dashboard/overview',
    requireAdmin,
    dashboardController.getDashboardOverview
  );
}

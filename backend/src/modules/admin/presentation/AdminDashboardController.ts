import { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';
import adminDashboardService from '../application/AdminDashboardService';
import { logger } from '../../../config/logger';

/**
 * AdminDashboardController
 * Presentation Layer - Handles HTTP requests for Admin Dashboard
 */
export class AdminDashboardController {
  /**
   * GET /api/admin/dashboard/revenue
   * Get revenue report by day or month
   * Query params:
   * - startDate: YYYY-MM-DD
   * - endDate: YYYY-MM-DD
   * - groupBy: 'day' | 'month'
   */
  getRevenueReport = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const groupBy = (req.query.groupBy as 'day' | 'month') || 'day';

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      const data = await adminDashboardService.getRevenueReport(startDate, endDate, groupBy);

      res.json({
        success: true,
        data,
        message: `Revenue report from ${startDate} to ${endDate}`
      });
    } catch (error) {
      logger.error('Error in getRevenueReport:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/admin/dashboard/order-stats
   * Get order success/failure statistics
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  getOrderStats = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const data = await adminDashboardService.getOrderStatusStats(startDate, endDate);

      res.json({
        success: true,
        data,
        message: 'Order statistics fetched successfully'
      });
    } catch (error) {
      logger.error('Error in getOrderStats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/admin/dashboard/conversion-rate
   * Get customer conversion rate
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  getConversionRate = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const data = await adminDashboardService.getConversionRate(startDate, endDate);

      res.json({
        success: true,
        data,
        message: 'Conversion rate fetched successfully'
      });
    } catch (error) {
      logger.error('Error in getConversionRate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversion rate',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/admin/dashboard/popular-categories
   * Get popular product categories
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   * - limit: number (default: 10)
   */
  getPopularCategories = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const data = await adminDashboardService.getPopularCategories(startDate, endDate, limit);

      res.json({
        success: true,
        data,
        message: 'Popular categories fetched successfully'
      });
    } catch (error) {
      logger.error('Error in getPopularCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular categories',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/admin/dashboard/overview
   * Get dashboard overview (all stats combined)
   * Query params:
   * - startDate: YYYY-MM-DD (optional)
   * - endDate: YYYY-MM-DD (optional)
   */
  getDashboardOverview = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const data = await adminDashboardService.getDashboardOverview(startDate, endDate);

      res.json({
        success: true,
        data,
        message: 'Dashboard overview fetched successfully'
      });
    } catch (error) {
      logger.error('Error in getDashboardOverview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard overview',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

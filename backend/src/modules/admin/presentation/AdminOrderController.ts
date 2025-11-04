import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminOrderService } from "../application/AdminOrderService";
import { logger } from "../../../config/logger";

/**
 * Admin Order Controller - Presentation Layer
 * Handles HTTP requests for admin order management
 */
export class AdminOrderController {
  constructor(private adminOrderService: AdminOrderService) {}

  /**
   * Send JSON response
   */
  private sendResponse(res: HttpResponse, statusCode: number, data: any): void {
    res.status(statusCode).json(data);
  }

  /**
   * Success response helper
   */
  private success(message: string, data?: any): any {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Error response helper
   */
  private error(message: string, details?: any): any {
    return {
      success: false,
      message,
      error: details,
    };
  }

  /**
   * GET /api/admin/orders
   * Get all orders with filters
   */
  async getAllOrders(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const query = req.url?.split("?")[1];
      const params = new URLSearchParams(query);

      const filters = {
        status: params.get("status") || undefined,
        paymentStatus: params.get("paymentStatus") || undefined,
        search: params.get("search") || undefined,
        limit: params.get("limit") ? parseInt(params.get("limit")!) : 50,
        offset: params.get("offset") ? parseInt(params.get("offset")!) : 0,
      };

      const orders = await this.adminOrderService.getAllOrders(filters);

      this.sendResponse(
        res,
        200,
        this.success("Orders retrieved successfully", orders)
      );
    } catch (err: any) {
      logger.error("Get all orders error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * GET /api/admin/orders/:orderId
   * Get order by ID with full details
   */
  async getOrderById(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const order = await this.adminOrderService.getOrderById(orderIdNum);

      this.sendResponse(
        res,
        200,
        this.success("Order retrieved successfully", order)
      );
    } catch (err: any) {
      logger.error("Get order by ID error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * PATCH /api/admin/orders/:orderId/status
   * Update order status
   */
  async updateOrderStatus(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const body = req.body as {
        status: string;
        note?: string;
      };

      if (!body.status) {
        this.sendResponse(res, 400, this.error("Missing status field"));
        return;
      }

      // Get admin ID from request (set by auth middleware)
      const user = (req as any).user;
      const authUid = user?.id || user?.userId || user?.user_id;
      
      if (!authUid) {
        logger.error("Unauthorized - No auth UID found in request. User object:", user);
        this.sendResponse(res, 401, this.error("Unauthorized - Auth UID not found"));
        return;
      }

      // Get admin_id from auth_uid
      const { data: adminData, error: adminError } = await (await import("../../../config/database")).supabaseAdmin
        .from("admin_users")
        .select("admin_id")
        .eq("auth_uid", authUid)
        .single();

      if (adminError || !adminData) {
        logger.error("Failed to get admin_id from auth_uid:", adminError);
        this.sendResponse(res, 401, this.error("Unauthorized - Admin not found"));
        return;
      }

      const adminId = adminData.admin_id;

      await this.adminOrderService.updateOrderStatus(
        orderIdNum,
        body.status,
        adminId,
        body.note
      );

      this.sendResponse(
        res,
        200,
        this.success("Order status updated successfully")
      );
    } catch (err: any) {
      logger.error("Update order status error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * PATCH /api/admin/orders/:orderId/payment-status
   * Update payment status
   */
  async updatePaymentStatus(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const body = req.body as {
        paymentStatus: "paid" | "failed" | "refunded";
        proofId?: number;
        proofStatus?: "accepted" | "rejected";
      };

      if (!body.paymentStatus) {
        this.sendResponse(res, 400, this.error("Missing paymentStatus field"));
        return;
      }

      // Get admin ID from request
      const user = (req as any).user;
      const authUid = user?.id || user?.userId || user?.user_id;
      
      if (!authUid) {
        logger.error("Unauthorized - No auth UID found in request. User object:", user);
        this.sendResponse(res, 401, this.error("Unauthorized - Auth UID not found"));
        return;
      }

      logger.info(`Admin auth_uid ${authUid} updating payment status for order ${orderIdNum}`);

      // Get admin_id from auth_uid
      const { data: adminData, error: adminError } = await (await import("../../../config/database")).supabaseAdmin
        .from("admin_users")
        .select("admin_id")
        .eq("auth_uid", authUid)
        .single();

      if (adminError || !adminData) {
        logger.error("Failed to get admin_id from auth_uid:", adminError);
        this.sendResponse(res, 401, this.error("Unauthorized - Admin not found"));
        return;
      }

      const adminId = adminData.admin_id;
      logger.info(`Resolved admin_id: ${adminId}`);

      await this.adminOrderService.updatePaymentStatus(
        orderIdNum,
        body.paymentStatus,
        adminId,
        body.proofId,
        body.proofStatus
      );

      this.sendResponse(
        res,
        200,
        this.success("Payment status updated successfully")
      );
    } catch (err: any) {
      logger.error("Update payment status error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * POST /api/admin/orders/:orderId/cancel
   * Cancel order
   */
  async cancelOrder(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const body = req.body as {
        reason?: string;
      };

      // Get admin ID from request
      const user = (req as any).user;
      const authUid = user?.id || user?.userId || user?.user_id;
      
      if (!authUid) {
        this.sendResponse(res, 401, this.error("Unauthorized - Auth UID not found"));
        return;
      }

      // Get admin_id from auth_uid
      const { data: adminData, error: adminError } = await (await import("../../../config/database")).supabaseAdmin
        .from("admin_users")
        .select("admin_id")
        .eq("auth_uid", authUid)
        .single();

      if (adminError || !adminData) {
        logger.error("Failed to get admin_id from auth_uid:", adminError);
        this.sendResponse(res, 401, this.error("Unauthorized - Admin not found"));
        return;
      }

      const adminId = adminData.admin_id;

      await this.adminOrderService.cancelOrder(
        orderIdNum,
        adminId,
        body.reason
      );

      this.sendResponse(res, 200, this.success("Order cancelled successfully"));
    } catch (err: any) {
      logger.error("Cancel order error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * POST /api/admin/orders/:orderId/refund
   * Process refund
   */
  async processRefund(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      const body = req.body as {
        reason?: string;
      };

      // Get admin ID from request
      const user = (req as any).user;
      const authUid = user?.id || user?.userId || user?.user_id;
      
      if (!authUid) {
        this.sendResponse(res, 401, this.error("Unauthorized - Auth UID not found"));
        return;
      }

      // Get admin_id from auth_uid
      const { data: adminData, error: adminError } = await (await import("../../../config/database")).supabaseAdmin
        .from("admin_users")
        .select("admin_id")
        .eq("auth_uid", authUid)
        .single();

      if (adminError || !adminData) {
        logger.error("Failed to get admin_id from auth_uid:", adminError);
        this.sendResponse(res, 401, this.error("Unauthorized - Admin not found"));
        return;
      }

      const adminId = adminData.admin_id;

      await this.adminOrderService.processRefund(
        orderIdNum,
        adminId,
        body.reason
      );

      this.sendResponse(res, 200, this.success("Refund processed successfully"));
    } catch (err: any) {
      logger.error("Process refund error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }
}

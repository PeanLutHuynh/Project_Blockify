import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { CheckoutService } from "../application/CheckoutService";
import { CreateOrderDTO } from "../application/dto/OrderDTO";
import { GeneratePaymentQRUseCase } from "../application/GeneratePaymentQRUseCase";
import { logger } from "../../../config/logger";

/**
 * Order Controller - Presentation Layer
 * Handles HTTP requests for order operations
 */
export class OrderController {
  constructor(
    private checkoutService: CheckoutService,
    private generatePaymentQRUseCase: GeneratePaymentQRUseCase
  ) {}

  /**
   * Send JSON response
   */
  private sendResponse(
    res: HttpResponse,
    statusCode: number,
    data: any
  ): void {
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
   * POST /api/orders/checkout
   * Create a new order
   */
  async checkout(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const body = req.body as CreateOrderDTO;

      // Validate required fields
      if (!body.user_id || !body.address_id || !body.payment_method) {
        this.sendResponse(
          res,
          400,
          this.error("Missing required fields", {
            required: ["user_id", "address_id", "payment_method"],
          })
        );
        return;
      }

      const order = await this.checkoutService.checkout(body);

      this.sendResponse(
        res,
        201,
        this.success("Order created successfully", order)
      );
    } catch (err: any) {
      logger.error("Checkout error:", err);
      this.sendResponse(res, 400, this.error(err.message));
    }
  }

  /**
   * GET /api/orders/user/:userId
   * Get all orders for a user
   */
  async getUserOrders(
    req: HttpRequest,
    res: HttpResponse,
    userId: string
  ): Promise<void> {
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid user ID"));
        return;
      }

      const orders = await this.checkoutService.getUserOrders(userIdNum);

      this.sendResponse(
        res,
        200,
        this.success("Orders retrieved successfully", orders)
      );
    } catch (err: any) {
      logger.error("Get user orders error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * GET /api/orders/:orderNumber
   * Get order by order number
   */
  async getOrderByNumber(
    req: HttpRequest,
    res: HttpResponse,
    orderNumber: string
  ): Promise<void> {
    try {
      const order = await this.checkoutService.getOrderByNumber(orderNumber);

      if (!order) {
        this.sendResponse(res, 404, this.error("Order not found"));
        return;
      }

      this.sendResponse(
        res,
        200,
        this.success("Order retrieved successfully", order)
      );
    } catch (err: any) {
      logger.error("Get order error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * PATCH /api/orders/:orderId/payment-status
   * Update payment status
   */
  async updatePaymentStatus(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const body = req.body as { payment_status: string };
      const orderIdNum = parseInt(orderId);

      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      if (!body.payment_status) {
        this.sendResponse(res, 400, this.error("Missing payment_status"));
        return;
      }

      await this.checkoutService.updatePaymentStatus(
        orderIdNum,
        body.payment_status
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
   * PATCH /api/orders/:orderId/cancel
   * Cancel an order
   */
  async cancelOrder(
    req: HttpRequest,
    res: HttpResponse,
    orderId: string
  ): Promise<void> {
    try {
      const body = req.body as { reason?: string };
      const orderIdNum = parseInt(orderId);

      if (isNaN(orderIdNum)) {
        this.sendResponse(res, 400, this.error("Invalid order ID"));
        return;
      }

      await this.checkoutService.cancelOrder(orderIdNum, body.reason);

      this.sendResponse(
        res,
        200,
        this.success("Order canceled successfully")
      );
    } catch (err: any) {
      logger.error("Cancel order error:", err);
      this.sendResponse(res, 500, this.error(err.message));
    }
  }

  /**
   * GET /api/orders/:orderId/payment-qr
   * Get VietQR payment code for an order
   */
  async getPaymentQR(
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

      const paymentQR = await this.generatePaymentQRUseCase.execute(orderIdNum);

      this.sendResponse(
        res,
        200,
        this.success("Payment QR generated successfully", paymentQR.toJSON())
      );
    } catch (err: any) {
      logger.error("Generate payment QR error:", err);
      this.sendResponse(res, 400, this.error(err.message));
    }
  }

  /**
   * GET /api/orders/number/:orderNumber/payment-qr
   * Get VietQR payment code by order number
   */
  async getPaymentQRByOrderNumber(
    req: HttpRequest,
    res: HttpResponse,
    orderNumber: string
  ): Promise<void> {
    try {
      const paymentQR = await this.generatePaymentQRUseCase.executeByOrderNumber(
        orderNumber
      );

      this.sendResponse(
        res,
        200,
        this.success("Payment QR generated successfully", paymentQR.toJSON())
      );
    } catch (err: any) {
      logger.error("Generate payment QR by order number error:", err);
      this.sendResponse(res, 400, this.error(err.message));
    }
  }
}


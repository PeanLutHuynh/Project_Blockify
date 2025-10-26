import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { OrderController } from "./OrderController";
import { CheckoutService } from "../application/CheckoutService";
import { OrderRepository } from "../infrastructure/OrderRepository";
import { authenticateToken } from "../../../infrastructure/auth";

/**
 * Order Routes Configuration
 * Registers all order-related endpoints
 */
export function registerOrderRoutes(router: any): void {
  // Initialize dependencies
  const orderRepository = new OrderRepository();
  const checkoutService = new CheckoutService(orderRepository);
  const orderController = new OrderController(checkoutService);

  // Protected routes - require authentication
  router.post("/api/orders/checkout", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await orderController.checkout(req, res);
  });

  router.get("/api/orders/user/:userId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const userId = req.url?.split("/").pop() || "";
    await orderController.getUserOrders(req, res, userId);
  });

  router.get("/api/orders/:orderNumber", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const orderNumber = req.url?.split("/").pop() || "";
    await orderController.getOrderByNumber(req, res, orderNumber);
  });

  router.patch("/api/orders/:orderId/payment-status", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await orderController.updatePaymentStatus(req, res, orderId);
  });

  router.patch("/api/orders/:orderId/cancel", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await orderController.cancelOrder(req, res, orderId);
  });
}

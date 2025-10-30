import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminOrderController } from "./AdminOrderController";
import { AdminOrderService } from "../application/AdminOrderService";
import { OrderRepository } from "../../order/infrastructure/OrderRepository";
import { AdminAuditLogRepository } from "../infrastructure/repositories/AdminRepository";
import { authenticateToken } from "../../../infrastructure/auth";

/**
 * Admin Order Routes Configuration
 * Registers all admin order management endpoints
 */
export function registerAdminOrderRoutes(router: any): void {
  // Initialize dependencies
  const orderRepository = new OrderRepository();
  const auditLogRepository = new AdminAuditLogRepository("admin_audit_logs");
  const adminOrderService = new AdminOrderService(orderRepository, auditLogRepository);
  const adminOrderController = new AdminOrderController(adminOrderService);

  // Get all orders (with filters)
  router.get("/api/admin/orders", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    await adminOrderController.getAllOrders(req, res);
  });

  // Get order by ID
  router.get("/api/admin/orders/:orderId", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 1].split("?")[0] || "";
    await adminOrderController.getOrderById(req, res, orderId);
  });

  // Update order status
  router.patch("/api/admin/orders/:orderId/status", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await adminOrderController.updateOrderStatus(req, res, orderId);
  });

  // Update payment status
  router.patch("/api/admin/orders/:orderId/payment-status", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await adminOrderController.updatePaymentStatus(req, res, orderId);
  });

  // Cancel order
  router.post("/api/admin/orders/:orderId/cancel", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await adminOrderController.cancelOrder(req, res, orderId);
  });

  // Process refund
  router.post("/api/admin/orders/:orderId/refund", authenticateToken, async (req: HttpRequest, res: HttpResponse) => {
    const urlParts = req.url?.split("/") || [];
    const orderId = urlParts[urlParts.length - 2] || "";
    await adminOrderController.processRefund(req, res, orderId);
  });
}

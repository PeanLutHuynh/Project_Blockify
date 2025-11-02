import { Router } from "../../../infrastructure/http/Router";
import { PaymentWebhookController } from "./PaymentWebhookController";
import { ProcessPaymentWebhookUseCase } from "../application/ProcessPaymentWebhookUseCase";
import { CheckPaymentStatusUseCase } from "../application/CheckPaymentStatusUseCase";
import { CheckoutService } from "../application/CheckoutService";
import { SepayClient } from "../../../infrastructure/payment/SepayClient";
import { OrderRepository } from "../infrastructure/OrderRepository";
import { ENV } from "../../../config/env";
import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";

/**
 * Payment Webhook Routes
 * Note: Webhook endpoint should NOT require authentication
 */

// Initialize dependencies
const orderRepository = new OrderRepository();
const checkoutService = new CheckoutService(orderRepository); // For clearing cart after payment
const sepayClient = new SepayClient(ENV.SEPAY_API_KEY);

const processPaymentUseCase = new ProcessPaymentWebhookUseCase(
  orderRepository,
  ENV.PAYMENT_ACCOUNT_NO,
  checkoutService // Inject checkout service for cart clearing
);

const checkPaymentUseCase = new CheckPaymentStatusUseCase(
  sepayClient,
  processPaymentUseCase,
  orderRepository,
  ENV.PAYMENT_ACCOUNT_NO
);

const webhookController = new PaymentWebhookController(
  processPaymentUseCase,
  checkPaymentUseCase,
  sepayClient,
  ENV.SEPAY_WEBHOOK_SECRET
);

export const setupPaymentWebhookRoutes = (router: Router): void => {
  // Webhook endpoint (NO AUTH - Sepay needs to access this)
  router.post(
    "/api/payment/webhook",
    async (req: HttpRequest, res: HttpResponse) => await webhookController.handleWebhook(req, res)
  );

  // Check payment status (with auth - for frontend polling)
  router.get(
    "/api/payment/check/:orderNumber",
    async (req: HttpRequest, res: HttpResponse) => await webhookController.checkPaymentStatus(req, res)
  );

  // Test webhook (development only)
  router.post(
    "/api/payment/webhook/test",
    async (req: HttpRequest, res: HttpResponse) => await webhookController.testWebhook(req, res)
  );
};

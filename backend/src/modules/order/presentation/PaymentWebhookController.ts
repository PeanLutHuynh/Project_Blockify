import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { ProcessPaymentWebhookUseCase } from "../application/ProcessPaymentWebhookUseCase";
import { CheckPaymentStatusUseCase } from "../application/CheckPaymentStatusUseCase";
import { BankTransaction } from "../domain/value-objects/BankTransaction";
import { SepayClient } from "../../../infrastructure/payment/SepayClient";
import { logger } from "../../../config/logger";
import { sendSuccess, sendError, sendBadRequest, sendForbidden } from "../../../utils/response.util";
import { isDevelopment } from "../../../config/env";

/**
 * Payment Webhook Controller
 * Handles Sepay webhook callbacks and payment status checks
 */
export class PaymentWebhookController {
  constructor(
    private processPaymentUseCase: ProcessPaymentWebhookUseCase,
    private checkPaymentUseCase: CheckPaymentStatusUseCase,
    private sepayClient: SepayClient,
    private webhookSecret: string
  ) {}

  /**
   * Handle Sepay webhook callback
   * POST /api/payment/webhook
   */
  async handleWebhook(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      // 1. Get raw body and signature
      const rawBody = req.body; // Should be raw string
      const signature = req.headers["x-sepay-signature"] as string;

      if (!signature) {
        logger.warn("❌ Missing webhook signature");
        sendBadRequest(res, "Missing signature");
        return;
      }

      // 2. Verify webhook signature
      const isValid = this.sepayClient.verifyWebhookSignature(
        JSON.stringify(rawBody),
        signature,
        this.webhookSecret
      );

      if (!isValid) {
        logger.warn("❌ Invalid webhook signature");
        sendError(res, "Invalid signature", 401);
        return;
      }

      // 3. Parse webhook data
      const webhookData = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      
      logger.info("📥 Received Sepay webhook", {
        transactionId: webhookData.id,
        amount: webhookData.amount_in,
        content: webhookData.transaction_content,
      });

      // 4. Convert to BankTransaction
      const transaction = BankTransaction.fromSepayTransaction(webhookData);

      // 5. Process payment
      await this.processPaymentUseCase.execute(transaction);

      // 6. Return success response (required by Sepay)
      sendSuccess(res, null, "Webhook processed successfully");
    } catch (error) {
      logger.error("❌ Error processing webhook", error);
      sendError(res, "Internal server error", 500);
    }
  }

  /**
   * Check payment status for an order (polling fallback)
   * GET /api/payment/check/:orderNumber
   */
  async checkPaymentStatus(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { orderNumber } = req.params;

      if (!orderNumber) {
        sendBadRequest(res, "Order number is required");
        return;
      }

      const result = await this.checkPaymentUseCase.execute(orderNumber);

      sendSuccess(res, result);
    } catch (error) {
      logger.error("❌ Error checking payment status", error);
      sendError(res, "Failed to check payment status", 500);
    }
  }

  /**
   * Test webhook endpoint (development only)
   * POST /api/payment/webhook/test
   */
  async testWebhook(req: HttpRequest, res: HttpResponse): Promise<void> {
    if (!isDevelopment) {
      sendForbidden(res, "Test endpoint only available in development");
      return;
    }

    try {
      const testData = req.body;
      
      logger.info("🧪 Testing webhook with data", testData);

      const transaction = BankTransaction.fromSepayTransaction(testData);
      await this.processPaymentUseCase.execute(transaction);

      sendSuccess(res, null, "Test webhook processed successfully");
    } catch (error) {
      logger.error("❌ Error processing test webhook", error);
      sendError(
        res,
        error instanceof Error ? error.message : "Internal server error",
        500
      );
    }
  }
}

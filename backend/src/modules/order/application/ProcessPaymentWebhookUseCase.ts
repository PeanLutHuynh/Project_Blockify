import { BankTransaction } from "../domain/value-objects/BankTransaction";
import { IOrderRepository } from "../domain/IOrderRepository";
import { CheckoutService } from "./CheckoutService";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../../config/env";
import { logger } from "../../../config/logger";

/**
 * Process Payment Webhook Use Case
 * Automatically verifies payment from Sepay webhook and updates order status
 */
export class ProcessPaymentWebhookUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private expectedAccountNumber: string,
    private checkoutService: CheckoutService // Required for updatePaymentStatus (which clears cart)
  ) {}

  async execute(transaction: BankTransaction): Promise<void> {
    try {
      // 1. Validate transaction
      if (!transaction.isValid(this.expectedAccountNumber)) {
        logger.warn("❌ Invalid transaction received", {
          transaction: transaction.toLogString(),
        });
        return;
      }

      // 2. Extract order number from transaction content
      const orderNumber = transaction.extractOrderNumber();
      if (!orderNumber) {
        logger.warn("⚠️ No order number found in transaction", {
          content: transaction.description,
        });
        return;
      }

      logger.info("📦 Processing payment for order", { orderNumber });

      // 3. Find order in database
      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        logger.warn("❌ Order not found", { orderNumber });
        return;
      }

      // 4. Check if already paid
      if (order.paymentStatus === "paid") {
        logger.info("✅ Order already paid", { orderNumber });
        return;
      }

      // 5. Validate amount matches
      if (!transaction.matchesAmount(order.totalAmount)) {
        logger.warn("❌ Amount mismatch", {
          orderNumber,
          expected: order.totalAmount,
          received: transaction.amount,
        });
        return;
      }

      // 6. Update payment status to 'paid'
      // ✅ This will automatically clear cart items via CheckoutService.updatePaymentStatus
      if (order.orderId) {
        await this.checkoutService.updatePaymentStatus(order.orderId, "paid");
      }

      // 7. Create payment proof with auto-generated log
      const paymentProofUrl = await this.createPaymentProof(
        orderNumber,
        transaction
      );

      logger.info("✅ Payment verified successfully", {
        orderNumber,
        amount: transaction.amount,
        proofUrl: paymentProofUrl,
      });
    } catch (error) {
      logger.error("❌ Error processing payment webhook", error);
      throw error;
    }
  }

  /**
   * Create payment proof record with transaction log
   */
  private async createPaymentProof(
    orderNumber: string,
    transaction: BankTransaction
  ): Promise<string> {
    const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get order details to retrieve order_id and user_id
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("order_id, user_id")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !orderData) {
      logger.error("❌ Failed to fetch order details", { orderNumber, error: orderError });
      throw new Error("Order not found");
    }

    const orderId = orderData.order_id;
    const userId = orderData.user_id;

    // 2. Generate transaction log as JSON
    const logData = this.generateTransactionLogJSON(orderNumber, transaction);
    const logJSON = JSON.stringify(logData, null, 2);

    // 3. Upload JSON log to Supabase Storage
    const fileName = `payment_log_${orderNumber}_${Date.now()}.json`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment_proofs")
      .upload(fileName, logJSON, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      logger.error("❌ Failed to upload payment log", uploadError);
      throw uploadError;
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from("payment_proofs")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // 5. Insert payment proof record with correct column names
    const { error: insertError } = await supabase.from("payment_proofs").insert({
      order_id: orderId,
      user_id: userId,
      file_url: fileUrl,
      file_type: "application/json",
      note: `Tự động tạo từ webhook Sepay - Giao dịch #${transaction.transactionId}`,
      status: "accepted", // Auto-accepted for webhook payments
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      logger.error("❌ Failed to create payment proof record", insertError);
      throw insertError;
    }

    logger.info("✅ Payment proof created successfully", {
      orderNumber,
      orderId,
      fileUrl,
    });

    return fileUrl;
  }

  /**
   * Generate formatted transaction log as JSON
   */
  private generateTransactionLogJSON(
    orderNumber: string,
    transaction: BankTransaction
  ): any {
    const timestamp = new Date().toISOString();
    const timestampVN = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    return {
      payment_proof_type: "automatic_webhook",
      verification_method: "Sepay Webhook",
      order_information: {
        order_number: orderNumber,
        verification_timestamp: timestamp,
        verification_timestamp_vn: timestampVN,
      },
      transaction_details: {
        transaction_id: transaction.transactionId,
        transaction_date: transaction.transactionDate.toISOString(),
        transaction_date_vn: transaction.transactionDate.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        }),
        amount: transaction.amount,
        amount_formatted: `${transaction.amount.toLocaleString("vi-VN")} VND`,
        account_number: transaction.accountNumber,
        bank_code: transaction.bankCode,
        description: transaction.description,
        reference_number: transaction.referenceNumber || null,
        bank_brand_name: transaction.bankBrandName || null,
      },
      verification_status: {
        status: "verified",
        verified_at: timestamp,
        verification_method: "automatic",
        payment_gateway: "Sepay",
        notes: [
          "Thanh toán đã được xác nhận tự động qua hệ thống Sepay",
          "Đơn hàng đã được cập nhật trạng thái 'Đã thanh toán'",
          "Minh chứng này được tạo tự động từ webhook notification",
        ],
      },
      metadata: {
        created_by: "system",
        proof_format: "json",
        webhook_version: "1.0",
        system_timestamp: timestamp,
      },
    };
  }
}

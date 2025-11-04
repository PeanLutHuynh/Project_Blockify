import { SepayClient, SepayTransaction } from "../../../infrastructure/payment/SepayClient";
import { BankTransaction } from "../domain/value-objects/BankTransaction";
import { ProcessPaymentWebhookUseCase } from "./ProcessPaymentWebhookUseCase";
import { IOrderRepository } from "../domain/IOrderRepository";
import { logger } from "../../../config/logger";

/**
 * Check Payment Status Use Case
 * Fallback mechanism: manually polls Sepay API to check if payment was made
 * Used when webhook fails or for frontend polling
 */
export class CheckPaymentStatusUseCase {
  constructor(
    private sepayClient: SepayClient,
    private processPaymentUseCase: ProcessPaymentWebhookUseCase,
    private orderRepository: IOrderRepository,
    private accountNumber: string
  ) {}

  async execute(orderNumber: string): Promise<{
    paid: boolean;
    transaction?: BankTransaction;
    message: string;
  }> {
    try {
      logger.info("🔍 Checking payment status", { orderNumber });

      // 1. Check if order exists and current status
      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        return {
          paid: false,
          message: "Không tìm thấy đơn hàng",
        };
      }

      // 2. If already paid, return immediately
      if (order.paymentStatus === "paid") {
        return {
          paid: true,
          message: "Đơn hàng đã được thanh toán",
        };
      }

      // 3. Fetch recent transactions from Sepay
      const transactions = await this.sepayClient.getTransactions(
        this.accountNumber,
        100 // Check last 100 transactions
      );

      // 4. Look for matching transaction
      const matchingTransaction = this.findMatchingTransaction(
        transactions,
        orderNumber,
        order.totalAmount
      );

      if (!matchingTransaction) {
        return {
          paid: false,
          message: "Chưa nhận được thanh toán. Vui lòng kiểm tra lại sau.",
        };
      }

      // 5. Convert to BankTransaction VO
      const bankTransaction = BankTransaction.fromSepayTransaction(
        matchingTransaction
      );

      // 6. Process payment (same logic as webhook)
      await this.processPaymentUseCase.execute(bankTransaction);

      return {
        paid: true,
        transaction: bankTransaction,
        message: "Thanh toán đã được xác nhận!",
      };
    } catch (error) {
      logger.error("❌ Error checking payment status", error);
      throw error;
    }
  }

  /**
   * Find transaction matching order number and amount
   */
  private findMatchingTransaction(
    transactions: SepayTransaction[],
    orderNumber: string,
    expectedAmount: number
  ): SepayTransaction | null {
    // Sort by date descending (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
    });

    for (const txn of sortedTransactions) {
      // Check if transaction content contains order number
      const content = txn.transaction_content.toUpperCase();
      if (!content.includes(orderNumber.toUpperCase())) {
        continue;
      }

      // Check if amount matches (with tolerance)
      const amountMatches =
        Math.abs(txn.amount_in - expectedAmount) <= 1000;

      if (amountMatches && txn.amount_in > 0) {
        return txn;
      }
    }

    return null;
  }
}

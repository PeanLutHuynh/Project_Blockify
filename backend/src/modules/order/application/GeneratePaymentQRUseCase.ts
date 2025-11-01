import { PaymentQR } from "../domain/value-objects/PaymentQR";
import { PaymentQRGenerator } from "../domain/services/PaymentQRGenerator";
import { IOrderRepository } from "../domain/IOrderRepository";
import { paymentConfig } from "../../../config/payment";

/**
 * Generate Payment QR Use Case - Application Layer
 * Business logic for generating VietQR payment codes
 */
export class GeneratePaymentQRUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  /**
   * Generate QR code for order payment
   * @param orderId - Order ID
   * @returns PaymentQR with QR URL and payment details
   */
  async execute(orderId: number): Promise<PaymentQR> {
    // 1. Fetch order from repository
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // 2. Validate order can accept payment
    if (order.paymentStatus === "paid") {
      throw new Error("Order is already paid");
    }

    if (order.status === "Đã hủy") {
      throw new Error("Cannot generate payment for cancelled order");
    }

    // 3. Validate payment method supports QR
    const qrSupportedMethods = ["bank_transfer", "momo", "zalopay", "vnpay"];
    if (!qrSupportedMethods.includes(order.paymentMethod)) {
      throw new Error(
        `Payment method ${order.paymentMethod} does not support QR payment`
      );
    }

    // 4. Get bank account configuration
    const bankAccount = paymentConfig.bankAccount;

    // 5. Generate QR code using domain service
    const paymentQR = PaymentQRGenerator.generate(
      bankAccount,
      order.totalAmount,
      order.orderNumber
    );

    return paymentQR;
  }

  /**
   * Generate QR code by order number
   * @param orderNumber - Order number
   * @returns PaymentQR with QR URL and payment details
   */
  async executeByOrderNumber(orderNumber: string): Promise<PaymentQR> {
    // 1. Fetch order from repository
    const order = await this.orderRepository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new Error("Order not found");
    }

    // Use the main execute method with order ID
    return this.execute(order.orderId!);
  }
}

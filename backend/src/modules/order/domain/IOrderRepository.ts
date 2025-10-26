import { Order } from "./entities/Order";
import { OrderItem } from "./entities/OrderItem";

/**
 * Order Repository Interface - Domain Layer
 * Defines contract for order persistence operations
 */
export interface IOrderRepository {
  /**
   * Create a new order with its items
   * @param order Order aggregate root
   * @param items Order items
   * @returns Created order with ID
   */
  createOrder(order: Order, items: OrderItem[]): Promise<Order>;

  /**
   * Find order by order number
   * @param orderNumber Unique order number
   * @returns Order or null
   */
  findByOrderNumber(orderNumber: string): Promise<Order | null>;

  /**
   * Find all orders for a user
   * @param userId User ID
   * @returns Array of orders
   */
  findByUserId(userId: number): Promise<Order[]>;

  /**
   * Update order status
   * @param orderId Order ID
   * @param status New status
   */
  updateStatus(orderId: number, status: string): Promise<void>;

  /**
   * Update payment status
   * @param orderId Order ID
   * @param paymentStatus New payment status
   */
  updatePaymentStatus(orderId: number, paymentStatus: string): Promise<void>;

  /**
   * Get order items
   * @param orderId Order ID
   * @returns Array of order items
   */
  getOrderItems(orderId: number): Promise<OrderItem[]>;

  /**
   * Create order status history entry
   * @param data Status history data
   */
  createStatusHistory(data: {
    orderId: number;
    oldStatus: string | null;
    newStatus: string;
    changedByUser?: number;
    changedByAdmin?: number;
    note?: string;
  }): Promise<void>;
}

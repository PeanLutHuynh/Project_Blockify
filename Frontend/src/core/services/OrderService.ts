import { FetchHttpClient } from "../api/FetchHttpClient.js";
import { Order } from "../models/Order.js";
import { ENV } from "../config/env.js";

/**
 * Order Service - Frontend
 * Handles all order-related API calls using custom Fetch wrapper
 */
export class OrderService {
  private httpClient: FetchHttpClient;
  private baseUrl: string = "/api/orders";

  constructor() {
    this.httpClient = new FetchHttpClient(ENV.API_BASE_URL);
  }

  /**
   * Create a new order (Checkout)
   */
  async checkout(data: {
    user_id: number;
    address_id: number;
    payment_method: string;
    shipping_method?: "standard" | "fast";
    shipping_fee?: number;
    subtotal?: number;
    total?: number;
    notes?: string;
    items: Array<{
      product_id: number;
      quantity: number;
      price: number;
    }>;
  }): Promise<Order> {
    try {
      const response = await this.httpClient.post(`${this.baseUrl}/checkout`, data);

      if (!response.success) {
        throw new Error(response.message || "Checkout failed");
      }

      return new Order(response.data);
    } catch (error: any) {
      console.error("Checkout error:", error);
      throw new Error(error.message || "Failed to create order");
    }
  }

  /**
   * Get all orders for current user
   */
  async getUserOrders(userId: number): Promise<Order[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/user/${userId}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get orders");
      }

      return response.data.map((order: any) => new Order(order));
    } catch (error: any) {
      console.error("Get orders error:", error);
      throw new Error(error.message || "Failed to retrieve orders");
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/${orderNumber}`
      );

      if (!response.success) {
        throw new Error(response.message || "Order not found");
      }

      return new Order(response.data);
    } catch (error: any) {
      console.error("Get order error:", error);
      throw new Error(error.message || "Failed to retrieve order");
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: string
  ): Promise<void> {
    try {
      const response = await this.httpClient.patch(
        `${this.baseUrl}/${orderId}/payment-status`,
        { payment_status: paymentStatus }
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to update payment status");
      }
    } catch (error: any) {
      console.error("Update payment status error:", error);
      throw new Error(error.message || "Failed to update payment status");
    }
  }

  /**
   * Upload payment proof image
   * (This will be implemented later with file upload functionality)
   */
  async uploadPaymentProof(orderId: number, file: File): Promise<string> {
    // TODO: Implement file upload
    console.log("Upload payment proof:", orderId, file);
    throw new Error("Not implemented yet");
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: number): Promise<any[]> {
    try {
      const response = await this.httpClient.get(
        `/api/v1/users/${userId}/addresses`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get addresses");
      }

      return response.data || [];
    } catch (error: any) {
      console.error("Get addresses error:", error);
      throw new Error(error.message || "Failed to retrieve addresses");
    }
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: number): Promise<any> {
    try {
      const response = await this.httpClient.get(
        `/api/v1/users/${userId}`
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to get user info");
      }

      return response.data;
    } catch (error: any) {
      console.error("Get user info error:", error);
      throw new Error(error.message || "Failed to retrieve user information");
    }
  }
}

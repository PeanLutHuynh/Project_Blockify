import { httpClient } from '../../core/api/FetchHttpClient.js';

/**
 * OrderTrackingService
 * Handles order tracking related API calls
 * Following Clean Architecture - Application Service Layer
 */

export interface OrderItem {
  order_item_id: number;
  product_id: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

export interface Order {
  order_id: number;
  order_number: string;
  user_id: number;
  status: 'Đang xử lý' | 'Đang giao' | 'Đã giao' | 'Đã hủy' | 'Đã trả';
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  payment_method: string;
  shipping_method?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  notes?: string;
  ordered_at: string;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface OrderTrackingResponse {
  success: boolean;
  message: string;
  data?: any; // Can be Order[] or single Order
  error?: string;
}

class OrderTrackingService {
  private readonly API_BASE = '/api/orders';

  /**
   * Get all orders for current user
   */
  async getUserOrders(userId: number): Promise<Order[]> {
    try {
      console.log(`📦 Fetching orders for user ${userId}...`);
      
      const response = await httpClient.get<OrderTrackingResponse>(
        `${this.API_BASE}/user/${userId}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load orders');
      }

      const orders = response.data as unknown as Order[];
      console.log(`✅ Loaded ${orders.length} orders`);
      console.log(`📊 First order items:`, orders[0]?.items);
      return orders;
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      throw error;
    }
  }

  /**
   * Get orders filtered by status
   */
  async getOrdersByStatus(
    userId: number,
    status: string
  ): Promise<Order[]> {
    try {
      const allOrders = await this.getUserOrders(userId);
      
      if (status === 'All') {
        return allOrders;
      }

      return allOrders.filter(order => order.status === status);
    } catch (error) {
      console.error('❌ Error filtering orders:', error);
      throw error;
    }
  }

  /**
   * Get order details by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
      console.log(`📦 Fetching order ${orderNumber}...`);
      
      interface OrderResponse {
        success: boolean;
        message: string;
        data?: Order;
        error?: string;
      }
      
      const result = await httpClient.get<OrderResponse>(
        `${this.API_BASE}/${orderNumber}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Order not found');
      }

      console.log(`✅ Loaded order details`);
      const order = result.data as unknown as Order;
      return order ?? null;
    } catch (error) {
      console.error('❌ Error loading order details:', error);
      return null;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number, reason: string): Promise<void> {
    try {
      console.log(`🚫 Canceling order ${orderId}...`);
      
      interface CancelResponse {
        success: boolean;
        message: string;
        error?: string;
      }
      
      const result = await httpClient.patch<CancelResponse>(
        `${this.API_BASE}/${orderId}/cancel`,
        { reason }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel order');
      }

      console.log(`✅ Order canceled successfully`);
    } catch (error) {
      console.error('❌ Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Format date to Vietnamese format
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format price to VND
   */
  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + ' VND';
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'Đang xử lý': 'text-info',
      'Đang giao': 'text-primary',
      'Đã giao': 'status-delivered',
      'Đã hủy': 'text-danger',
      'Đã trả': 'text-secondary'
    };
    return statusClasses[status] || '';
  }

  /**
   * Get status display text in Vietnamese
   */
  getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      'Đang xử lý': 'Đang xử lý',
      'Đang giao': 'Đang giao',
      'Đã giao': 'Đã giao',
      'Đã hủy': 'Đã hủy',
      'Đã trả': 'Đã trả'
    };
    return statusTexts[status] || status;
  }

  /**
   * Get payment method display text
   */
  getPaymentMethodText(method: string): string {
    const methodTexts: Record<string, string> = {
      'cod': 'Thanh toán khi nhận hàng',
      'bank_transfer': 'Chuyển khoản ngân hàng',
      'momo': 'Ví MoMo',
      'zalopay': 'ZaloPay',
      'vnpay': 'VNPay'
    };
    return methodTexts[method] || method;
  }
}

// Export singleton instance
export default new OrderTrackingService();

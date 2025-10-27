import { IOrderRepository } from "../domain/IOrderRepository";
import { Order } from "../domain/entities/Order";
import { OrderItem } from "../domain/entities/OrderItem";
import { PaymentMethod } from "../domain/entities/Order";
import { CreateOrderDTO } from "./dto/OrderDTO";
import { OrderResponseDTO } from "./dto/OrderResponseDTO";
import { logger } from "../../../config/logger";
import { supabaseAdmin } from "../../../config/database";

/**
 * Checkout Service - Application Layer
 * Use case: Handle order checkout process
 */
export class CheckoutService {
  constructor(private orderRepository: IOrderRepository) {}

  /**
   * Process checkout and create order
   */
  async checkout(dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    try {
      // 1. Get user address
      const address = await this.getUserAddress(dto.address_id, dto.user_id);
      if (!address) {
        throw new Error("Address not found");
      }

      // 2. Get user info
      const user = await this.getUserInfo(dto.user_id);
      if (!user) {
        throw new Error("User not found");
      }

      // 3. Check if items are provided in DTO (from frontend)
      let orderItems: OrderItem[] = [];
      let subtotal = 0; // Tổng sale_price
      let originalTotal = 0; // Tổng price gốc

      if (dto.items && dto.items.length > 0) {
        // Use items from DTO (selected items from cart page)
        for (const item of dto.items) {
          const product = await this.getProduct(item.product_id);
          if (!product) {
            throw new Error(`Product ${item.product_id} not found`);
          }

          // Check stock availability
          if (product.stock_quantity < item.quantity) {
            throw new Error(`Product "${product.product_name}" không đủ hàng. Còn lại: ${product.stock_quantity}`);
          }

          // Calculate prices
          const salePrice = product.sale_price ? parseFloat(product.sale_price) : parseFloat(product.price);
          const originalPrice = parseFloat(product.price);

          // Generate SKU if not exists (products table doesn't have sku field)
          const productSku = product.sku || `SKU-${product.product_id}`;

          const orderItem = new OrderItem({
            productId: product.product_id,
            productName: product.product_name,
            productSku: productSku,
            quantity: item.quantity,
            unitPrice: salePrice, // unit_price = sale_price
          });

          orderItems.push(orderItem);
          subtotal += salePrice * item.quantity; // Tổng sale_price
          originalTotal += originalPrice * item.quantity; // Tổng price gốc
        }
      } else {
        // Fallback: Get all cart items
        const cartItems = await this.getCartItems(dto.user_id);
        if (cartItems.length === 0) {
          throw new Error("Cart is empty");
        }

        for (const cartItem of cartItems) {
          const product = await this.getProduct(cartItem.product_id);
          if (!product) {
            throw new Error(`Product ${cartItem.product_id} not found`);
          }

          // Check stock
          if (product.stock_quantity < cartItem.quantity) {
            throw new Error(`Product "${product.product_name}" không đủ hàng`);
          }

          // Use sale price if available, otherwise regular price
          const salePrice = product.sale_price ? parseFloat(product.sale_price) : parseFloat(product.price);
          const originalPrice = parseFloat(product.price);

          // Generate SKU if not exists (products table doesn't have sku field)
          const productSku = product.sku || `SKU-${product.product_id}`;

          const orderItem = new OrderItem({
            productId: product.product_id,
            productName: product.product_name,
            productSku: productSku,
            quantity: cartItem.quantity,
            unitPrice: salePrice, // unit_price = sale_price
          });

          orderItems.push(orderItem);
          subtotal += salePrice * cartItem.quantity;
          originalTotal += originalPrice * cartItem.quantity;
        }
      }

      // 4. Calculate totals
      // subtotal = tổng sale_price
      // discount_amount = tổng price gốc - tổng sale_price
      // total_amount = subtotal + shipping_fee
      const shippingFee = dto.shipping_fee || (dto.shipping_method === "fast" ? 30000 : 15000);
      const discountAmount = originalTotal - subtotal;
      const totalAmount = subtotal + shippingFee;

      // 5. Generate order number
      const orderNumber = await this.generateOrderNumber();

      // 6. Validate required user info
      if (!user.phone || user.phone.trim().length === 0) {
        throw new Error("Vui lòng cập nhật số điện thoại trong tài khoản trước khi đặt hàng");
      }

      // 7. Create order entity with items
      const order = new Order({
        orderNumber,
        userId: dto.user_id,
        customerName: user.full_name,
        customerEmail: user.email,
        customerPhone: user.phone, // Đổi từ phone_number → phone
        shippingAddress: address.full_address,
        shippingCity: address.city,
        subtotal, // Tổng sale_price
        shippingFee,
        discountAmount, // Tổng price gốc - tổng sale_price
        totalAmount, // subtotal + shipping_fee
        paymentMethod: dto.payment_method,
        notes: dto.notes,
        orderedAt: new Date(), // ✅ Set current timestamp
        items: orderItems, // ✅ Pass items to constructor
      });

      // 8. Create order (repository will validate)
      const createdOrder = await this.orderRepository.createOrder(
        order,
        orderItems
      );

      // 9. Clear cart items after successful checkout
      if (dto.items && dto.items.length > 0) {
        // Clear specific items that were checked out
        await this.clearCartItems(dto.user_id, dto.items.map(item => item.product_id));
      } else {
        // Clear all cart items
        await this.clearAllCartItems(dto.user_id);
      }

      // 10. Return response
      return this.mapOrderToResponse(createdOrder);
    } catch (error: any) {
      logger.error("Checkout error:", error);
      throw new Error(`Checkout failed: ${error.message}`);
    }
  }

  /**
   * Get user address
   */
  private async getUserAddress(
    addressId: number,
    userId: number
  ): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .select("*")
      .eq("address_id", addressId)
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.error("Error getting address:", error);
      return null;
    }

    return data;
  }

  /**
   * Get user info
   */
  private async getUserInfo(userId: number): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.error("Error getting user:", error);
      return null;
    }

    return data;
  }

  /**
   * Get cart items for user
   */
  private async getCartItems(userId: number): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      logger.error("Error getting cart items:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get product details
   */
  private async getProduct(productId: number): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .single();

    if (error) {
      logger.error("Error getting product:", error);
      return null;
    }

    return data;
  }

  /**
   * Generate unique order number
   * Format: ORD + YYYYMMDD + sequence (001, 002, ...)
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    // Get count of orders today
    const { count } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .like("order_number", `ORD${dateStr}%`);

    const sequence = ((count || 0) + 1).toString().padStart(3, "0");
    return `ORD${dateStr}${sequence}`;
  }

  /**
   * Map Order entity to response DTO
   */
  private mapOrderToResponse(order: Order): OrderResponseDTO {
    return {
      order_id: order.orderId!,
      order_number: order.orderNumber,
      user_id: order.userId,
      status: order.status,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      shipping_address: order.shippingAddress,
      shipping_city: order.shippingCity,
      subtotal: order.subtotal,
      shipping_fee: order.shippingFee,
      tax_amount: order.taxAmount,
      discount_amount: order.discountAmount,
      total_amount: order.totalAmount,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      notes: order.notes,
      ordered_at: order.orderedAt?.toISOString() || new Date().toISOString(),
      items: order.items.map((item: OrderItem) => ({
        order_item_id: item.orderItemId!,
        product_id: item.productId,
        product_name: item.productName,
        product_sku: item.productSku,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        image_url: (item as any).imageUrl, // Include image_url from products
      })),
    };
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: number): Promise<OrderResponseDTO[]> {
    const orders = await this.orderRepository.findByUserId(userId);
    return orders.map((order: Order) => this.mapOrderToResponse(order));
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderResponseDTO | null> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      return null;
    }
    return this.mapOrderToResponse(order);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: string
  ): Promise<void> {
    await this.orderRepository.updatePaymentStatus(orderId, paymentStatus);

    // If paid, update order status to "Đang giao"
    if (paymentStatus === "paid") {
      await this.orderRepository.updateStatus(orderId, "Đang giao");
      await this.orderRepository.createStatusHistory({
        orderId,
        oldStatus: "Đang xử lý",
        newStatus: "Đang giao",
        note: "Thanh toán thành công, đơn hàng đang được giao",
      });
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number, reason?: string): Promise<void> {
    // Get order details first
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Only allow canceling orders with "Đang xử lý" (Processing) status
    if (order.status !== "Đang xử lý") {
      throw new Error(`Cannot cancel order with status "${order.status}". Only "Đang xử lý" orders can be canceled.`);
    }

    // Update order status to "Đã hủy" (Canceled)
    await this.orderRepository.updateStatus(orderId, "Đã hủy");

    // Update notes with cancel reason
    if (reason) {
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ notes: reason })
        .eq("order_id", orderId);

      if (error) {
        logger.error("Error updating cancel reason:", error);
      }
    }

    // Create status history
    await this.orderRepository.createStatusHistory({
      orderId,
      oldStatus: "Đang xử lý",
      newStatus: "Đã hủy",
      note: reason || "Đơn hàng đã bị hủy",
    });

    logger.info(`Order ${orderId} canceled. Reason: ${reason || "No reason provided"}`);
  }

  /**
   * Clear specific cart items (used when checking out selected items)
   */
  private async clearCartItems(userId: number, productIds: number[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .in("product_id", productIds);

      if (error) {
        logger.error("Error clearing cart items:", error);
        // Don't throw error - cart clearing failure shouldn't fail checkout
      } else {
        logger.info(`Cleared ${productIds.length} items from cart for user ${userId}`);
      }
    } catch (error: any) {
      logger.error("Exception clearing cart items:", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Clear all cart items (used when checking out entire cart)
   */
  private async clearAllCartItems(userId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) {
        logger.error("Error clearing all cart items:", error);
        // Don't throw error - cart clearing failure shouldn't fail checkout
      } else {
        logger.info(`Cleared all cart items for user ${userId}`);
      }
    } catch (error: any) {
      logger.error("Exception clearing all cart items:", error);
      // Don't throw - this is not critical
    }
  }
}

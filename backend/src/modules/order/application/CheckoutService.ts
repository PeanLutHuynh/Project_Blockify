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
      // 🔍 DEBUG: Log incoming DTO
      logger.info(`📥 [CheckoutService] Received checkout request:`, {
        user_id: dto.user_id,
        payment_method: dto.payment_method,
        items_count: dto.items?.length || 0,
        items: dto.items?.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      });

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

      // 3. Validate items from frontend
      if (!dto.items || dto.items.length === 0) {
        throw new Error("Không có sản phẩm nào được chọn để đặt hàng");
      }

      let orderItems: OrderItem[] = [];
      let subtotal = 0; // Tổng sale_price
      let originalTotal = 0; // Tổng price gốc

      // Process ONLY items from frontend DTO (selected items)
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

      logger.info(`📦 Processing ${orderItems.length} selected items for checkout`, {
        user_id: dto.user_id,
        product_ids: orderItems.map(item => item.productId)
      });

      // 4. Calculate totals
      // subtotal = tổng sale_price
      // discount_amount = tổng price gốc - tổng sale_price
      // total_amount = subtotal + shipping_fee
      // Free ship cho đơn từ 500k trở lên
      let shippingFee = 0;
      if (subtotal >= 500000) {
        shippingFee = 0; // Miễn phí ship cho đơn >= 500k
        logger.info(`Free shipping applied for order >= 500,000 VND`, { subtotal });
      } else {
        shippingFee = dto.shipping_fee || (dto.shipping_method === "fast" ? 30000 : 15000);
      }
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

      // 🔍 CRITICAL DEBUG: Log order creation result
      logger.info(`✅ [CheckoutService] Order created successfully:`, {
        order_number: createdOrder.orderNumber,
        order_id: createdOrder.orderId,
        user_id: dto.user_id,
        payment_method: dto.payment_method,
        total_items_in_order: orderItems.length,
        order_items_details: orderItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity
        }))
      });

      // 9. Clear cart items after successful checkout
      logger.info(`🔍 [CheckoutService] Checking cart clearing logic:`, {
        payment_method: dto.payment_method,
        order_number: createdOrder.orderNumber,
        should_clear_now: dto.payment_method === 'cod',
        items_in_order: orderItems.length
      });

      if (dto.payment_method === 'cod') {
        const productIdsToRemove = orderItems.map(item => item.productId);
        
        // 🔍 CRITICAL: Log what we're about to remove
        logger.info(`🗑️ [COD] PREPARING TO DELETE cart items:`, {
          user_id: dto.user_id,
          order_number: createdOrder.orderNumber,
          order_items_count: orderItems.length,
          product_ids_from_order_items: productIdsToRemove,
          product_ids_count: productIdsToRemove.length,
          product_ids_types: productIdsToRemove.map(id => typeof id)
        });
        
        // 🔍 DEBUG: Get current cart items BEFORE deletion
        const currentCartItems = await this.getCartItems(dto.user_id);
        logger.info(`📊 [COD] Cart state BEFORE deletion:`, {
          user_id: dto.user_id,
          total_cart_items: currentCartItems.length,
          cart_items_details: currentCartItems.map((item: any) => ({
            cart_id: item.cart_id,
            product_id: item.product_id,
            quantity: item.quantity,
            product_id_type: typeof item.product_id
          })),
          items_to_remove: productIdsToRemove,
          items_to_remove_count: productIdsToRemove.length
        });
        
        if (productIdsToRemove.length > 0) {
          await this.clearCartItems(dto.user_id, productIdsToRemove);
          
          // 🔍 DEBUG: Verify cart items AFTER deletion
          const remainingCartItems = await this.getCartItems(dto.user_id);
          logger.info(`📊 [COD] Cart state AFTER deletion:`, {
            user_id: dto.user_id,
            remaining_items: remainingCartItems.length,
            remaining_product_ids: remainingCartItems.map((item: any) => item.product_id),
            expected_remaining: currentCartItems.length - productIdsToRemove.length,
            actual_remaining: remainingCartItems.length,
            match: remainingCartItems.length === (currentCartItems.length - productIdsToRemove.length)
          });
          
          logger.info(`✅ [COD] Cleared ${productIdsToRemove.length} items from cart`, {
            order_number: createdOrder.orderNumber,
            removed_product_ids: productIdsToRemove
          });
        }
      } else {
        // ⏳ Non-COD: KHÔNG xóa cart items ở đây
        // Sẽ xóa sau khi thanh toán thành công (payment_status = 'paid')
        logger.info(`⏳ [${dto.payment_method.toUpperCase()}] Cart items NOT cleared yet`, {
          order_number: createdOrder.orderNumber,
          reason: 'Waiting for payment confirmation (payment_status = paid)'
        });
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
      shipping_start_date: (order as any).shippingStartDate?.toISOString(),
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
   * Xóa cart items khi payment_status = 'paid' cho non-COD orders
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: string
  ): Promise<void> {
    // Get order details first to check payment method and get items
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Update payment status
    await this.orderRepository.updatePaymentStatus(orderId, paymentStatus);

    // If paid, clear cart items but KEEP status as "Đang xử lý" (wait for admin confirmation)
    if (paymentStatus === "paid") {
      // Admin must manually confirm order after payment is verified
      logger.info(`✅ [updatePaymentStatus] Payment confirmed, order remains "Đang xử lý" for admin approval:`, {
        order_id: orderId,
        order_number: order.orderNumber,
        payment_method: order.paymentMethod,
        payment_status: paymentStatus,
        current_status: order.status
      });

      // ✅ Clear cart items for non-COD orders after payment confirmed
      if (order.paymentMethod !== 'cod') {
        logger.info(`🔍 [updatePaymentStatus] Payment confirmed for non-COD order:`, {
          order_id: orderId,
          order_number: order.orderNumber,
          payment_method: order.paymentMethod,
          user_id: order.userId
        });

        // Get order items to know which products to remove from cart
        const orderItems = await this.orderRepository.getOrderItems(orderId);
        const productIds = orderItems.map(item => item.productId);

        if (productIds.length > 0) {
          // 🔍 DEBUG: Get current cart items BEFORE deletion
          const currentCartItems = await this.getCartItems(order.userId);
          logger.info(`📊 [${order.paymentMethod.toUpperCase()}] Cart state BEFORE deletion:`, {
            user_id: order.userId,
            total_cart_items: currentCartItems.length,
            cart_product_ids: currentCartItems.map((item: any) => item.product_id),
            items_to_remove: productIds,
            items_to_remove_count: productIds.length
          });

          await this.clearCartItems(order.userId, productIds);

          // 🔍 DEBUG: Verify cart items AFTER deletion
          const remainingCartItems = await this.getCartItems(order.userId);
          logger.info(`📊 [${order.paymentMethod.toUpperCase()}] Cart state AFTER deletion:`, {
            user_id: order.userId,
            remaining_items: remainingCartItems.length,
            remaining_product_ids: remainingCartItems.map((item: any) => item.product_id),
            expected_remaining: currentCartItems.length - productIds.length,
            actual_remaining: remainingCartItems.length,
            match: remainingCartItems.length === (currentCartItems.length - productIds.length)
          });

          logger.info(`✅ [${order.paymentMethod.toUpperCase()}] Cleared ${productIds.length} items from cart after payment`, {
            order_number: order.orderNumber,
            removed_product_ids: productIds
          });
        }
      }
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
      logger.info(`🗑️ [clearCartItems] Attempting to delete cart items:`, {
        user_id: userId,
        user_id_type: typeof userId,
        product_ids: productIds,
        product_ids_types: productIds.map(id => typeof id),
        count: productIds.length
      });

      // 🔍 CRITICAL: Log exact DELETE query
      logger.info(`📝 [clearCartItems] DELETE QUERY:`, {
        table: 'cart_items',
        conditions: {
          user_id: `= ${userId}`,
          product_id: `IN [${productIds.join(', ')}]`
        },
        sql_equivalent: `DELETE FROM cart_items WHERE user_id = ${userId} AND product_id IN (${productIds.join(', ')})`
      });

      const { data, error, count } = await supabaseAdmin
        .from("cart_items")
        .delete({ count: 'exact' })
        .eq("user_id", userId)
        .in("product_id", productIds)
        .select();

      if (error) {
        logger.error("❌ [clearCartItems] Error clearing cart items:", {
          error: error,
          error_message: error.message,
          error_details: error.details,
          error_hint: error.hint
        });
        // Don't throw error - cart clearing failure shouldn't fail checkout
      } else {
        logger.info(`✅ [clearCartItems] Successfully deleted cart items:`, {
          user_id: userId,
          deleted_count: count,
          deleted_rows: data,
          expected_count: productIds.length,
          match: count === productIds.length
        });
      }
    } catch (error: any) {
      logger.error("❌ [clearCartItems] Exception clearing cart items:", error);
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

import { Order } from "../domain/entities/Order";
import { OrderItem } from "../domain/entities/OrderItem";
import { IOrderRepository } from "../domain/IOrderRepository";
import { logger } from "../../../config/logger";
import { supabaseAdmin } from "../../../config/database";

/**
 * Order Repository Implementation - Infrastructure Layer
 * Handles all order persistence using Supabase SDK
 */
export class OrderRepository implements IOrderRepository {
  /**
   * Map database row to Order entity
   */
  private mapToEntity(data: any): Order {
    return new Order({
      orderId: data.order_id,
      orderNumber: data.order_number,
      userId: data.user_id,
      status: data.status,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      shippingAddress: data.shipping_address,
      shippingCity: data.shipping_city,
      subtotal: parseFloat(data.subtotal),
      shippingFee: parseFloat(data.shipping_fee || 0),
      taxAmount: parseFloat(data.tax_amount || 0),
      discountAmount: parseFloat(data.discount_amount || 0),
      totalAmount: parseFloat(data.total_amount),
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      notes: data.notes,
      orderedAt: data.ordered_at ? new Date(data.ordered_at) : undefined,
    });
  }

  /**
   * Create a new order with its items in a transaction
   */
  async createOrder(order: Order, items: OrderItem[]): Promise<Order> {
    try {
      // Validate order
      order.validate();
      items.forEach((item) => item.validate());

      // Fix: Ensure sequence is synced before insert
      await this.syncOrderSequence();

      // 1. Insert order
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert([order.toObject()])
        .select()
        .single();

      if (orderError) {
        logger.error("Error creating order:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      const orderId = orderData.order_id;

      // 2. Insert order items
      const orderItemsData = items.map((item) => {
        item.setOrderId(orderId);
        return item.toObject();
      });

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(orderItemsData);

      if (itemsError) {
        logger.error("Error creating order items:", itemsError);
        // Rollback order creation
        await supabaseAdmin.from("orders").delete().eq("order_id", orderId);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // 3. Create status history
      await this.createStatusHistory({
        orderId,
        oldStatus: null,
        newStatus: order.status,
        changedByUser: order.userId,
        note: "Đơn hàng được tạo",
      });

      // 4. Delete cart items
      const { error: deleteCartError } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", order.userId);

      if (deleteCartError) {
        logger.warn("Failed to clear cart:", deleteCartError);
      }

      // Return created order with items
      const createdOrder = new Order({
        orderId: orderData.order_id,
        orderNumber: orderData.order_number,
        userId: orderData.user_id,
        status: orderData.status,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone,
        shippingAddress: orderData.shipping_address,
        shippingCity: orderData.shipping_city,
        subtotal: parseFloat(orderData.subtotal),
        shippingFee: parseFloat(orderData.shipping_fee),
        taxAmount: parseFloat(orderData.tax_amount),
        discountAmount: parseFloat(orderData.discount_amount),
        totalAmount: parseFloat(orderData.total_amount),
        paymentMethod: orderData.payment_method,
        paymentStatus: orderData.payment_status,
        notes: orderData.notes,
        orderedAt: new Date(orderData.ordered_at),
        items,
      });

      return createdOrder;
    } catch (error) {
      logger.error("Error in createOrder:", error);
      throw error;
    }
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (error || !data) {
      return null;
    }

    const items = await this.getOrderItems(data.order_id);
    const order = this.mapToEntity(data);
    order.setItems(items);

    return order;
  }

  /**
   * Find order by ID
   */
  async findById(orderId: number): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error || !data) {
      return null;
    }

    const items = await this.getOrderItems(data.order_id);
    const order = this.mapToEntity(data);
    order.setItems(items);

    return order;
  }

  /**
   * Find all orders for a user
   */
  async findByUserId(userId: number): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("ordered_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    const orders = await Promise.all(
      data.map(async (orderData: any) => {
        const items = await this.getOrderItems(orderData.order_id);
        const order = this.mapToEntity(orderData);
        order.setItems(items);
        return order;
      })
    );

    return orders;
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: number, status: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("order_id", orderId);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("order_id", orderId);

    if (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  /**
   * Get order items with product images
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    console.log(`🔍 Getting items for order ${orderId}...`);
    
    // Join with products and product_images tables (nested select like Cart)
    const { data, error } = await supabaseAdmin
      .from("order_items")
      .select(`
        *,
        products:product_id (
          product_id,
          product_name,
          product_images (
            image_url,
            is_primary
          )
        )
      `)
      .eq("order_id", orderId);

    if (error || !data) {
      console.error(`❌ Error getting order items for ${orderId}:`, error);
      return [];
    }

    console.log(`✅ Found ${data.length} items for order ${orderId}`);

    return data.map((item: any) => {
      const orderItem = new OrderItem({
        orderItemId: item.order_item_id,
        orderId: item.order_id,
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
      });
      
      // Get image from product_images array (same as Cart)
      let imageUrl = '';
      const product = item.products;
      
      if (product?.product_images && Array.isArray(product.product_images)) {
        // Try to find primary image first
        const primaryImage = product.product_images.find((img: any) => img.is_primary);
        if (primaryImage?.image_url) {
          imageUrl = primaryImage.image_url;
        } else if (product.product_images.length > 0 && product.product_images[0]?.image_url) {
          // Fallback to first image
          imageUrl = product.product_images[0].image_url;
        }
      }
      
      if (imageUrl) {
        (orderItem as any).imageUrl = imageUrl;
        console.log(`  ✅ Product ${item.product_id}: ${imageUrl}`);
      } else {
        console.log(`  ⚠️ Product ${item.product_id}: No image found`);
      }
      
      return orderItem;
    });
  }

  /**
   * Create order status history entry
   */
  async createStatusHistory(data: {
    orderId: number;
    oldStatus: string | null;
    newStatus: string;
    changedByUser?: number;
    changedByAdmin?: number;
    note?: string;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from("order_status_history")
      .insert([
        {
          order_id: data.orderId,
          old_status: data.oldStatus,
          new_status: data.newStatus,
          changed_by_user: data.changedByUser,
          changed_by_admin: data.changedByAdmin,
          note: data.note,
        },
      ]);

    if (error) {
      logger.error("Error creating status history:", error);
      // Don't throw - status history is not critical
    }
  }

  /**
   * Sync order_id sequence to prevent duplicate key errors
   * This fixes issues when data is imported with explicit IDs
   */
  private async syncOrderSequence(): Promise<void> {
    try {
      const { error } = await supabaseAdmin.rpc('sync_order_sequence');
      
      if (error) {
        logger.warn("Could not sync order sequence (function may not exist):", error.message);
        // Don't throw - we'll try to insert anyway and let DB handle it
      }
    } catch (error: any) {
      logger.warn("Error syncing order sequence:", error.message);
      // Non-critical - continue with insert
    }
  }
}

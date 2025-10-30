import { OrderRepository } from "../../order/infrastructure/OrderRepository";
import { AdminAuditLogRepository } from "../infrastructure/repositories/AdminRepository";
import { AdminAuditLog, AdminAction } from "../domain/entities/AdminAuditLog";
import { supabaseAdmin } from "../../../config/database";
import { logger } from "../../../config/logger";

/**
 * Admin Order Service - Application Layer
 * Handles admin operations on orders
 */
export class AdminOrderService {
  constructor(
    private orderRepository: OrderRepository,
    private auditLogRepository: AdminAuditLogRepository
  ) {}

  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(filters?: {
    status?: string;
    paymentStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      let query = supabaseAdmin
        .from("orders")
        .select(
          `
          *,
          order_items(*),
          payment_proofs(*),
          users(user_id, full_name, email, phone)
        `
        )
        .order("ordered_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.paymentStatus) {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Error fetching orders:", error);
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      logger.error("Service error fetching orders:", error);
      throw error;
    }
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: number): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(
          `
          *,
          order_items(*),
          payment_proofs(*),
          order_status_history(*),
          users(user_id, full_name, email, phone)
        `
        )
        .eq("order_id", orderId)
        .single();

      if (error) {
        logger.error("Error fetching order:", error);
        throw new Error(`Failed to fetch order: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      logger.error("Service error fetching order:", error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: number,
    newStatus: string,
    adminId: number,
    note?: string
  ): Promise<void> {
    try {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("status")
        .eq("order_id", orderId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch order: ${fetchError.message}`);
      }

      const oldStatus = currentOrder.status;

      // Update order status
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: newStatus,
        })
        .eq("order_id", orderId);

      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      // Log status change in order_status_history
      const { error: historyError } = await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by_admin: adminId,
          note: note,
        });

      if (historyError) {
        logger.error("Error logging status history:", historyError);
      }

      // Log admin action
      await this.logAdminAction(adminId, AdminAction.UPDATE_ORDER_STATUS, orderId.toString(), "orders", {
        orderId,
        oldStatus,
        newStatus,
        note,
      });

      logger.info(`Order ${orderId} status updated from ${oldStatus} to ${newStatus} by admin ${adminId}`);
    } catch (error: any) {
      logger.error("Service error updating order status:", error);
      throw error;
    }
  }

  /**
   * Update payment status and payment proof status
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: "paid" | "failed" | "refunded",
    adminId: number,
    proofId?: number,
    proofStatus?: "accepted" | "rejected"
  ): Promise<void> {
    try {
      // Update order payment status
      const { error: orderError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: paymentStatus,
        })
        .eq("order_id", orderId);

      if (orderError) {
        throw new Error(`Failed to update payment status: ${orderError.message}`);
      }

      // Update payment proof status if provided
      if (proofId && proofStatus) {
        logger.info(`Updating payment proof ${proofId} with status ${proofStatus} by admin ${adminId}`);
        
        const { data: proofData, error: proofError } = await supabaseAdmin
          .from("payment_proofs")
          .update({
            status: proofStatus,
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("proof_id", proofId)
          .select();

        if (proofError) {
          logger.error("Error updating payment proof:", proofError);
          throw new Error(`Failed to update payment proof: ${proofError.message}`);
        }

        logger.info(`Payment proof ${proofId} updated successfully:`, proofData);
      }

      // Log admin action
      await this.logAdminAction(adminId, AdminAction.UPDATE_PAYMENT_STATUS, orderId.toString(), "orders", {
        orderId,
        paymentStatus,
        proofId,
        proofStatus,
      });

      logger.info(`Order ${orderId} payment status updated to ${paymentStatus} by admin ${adminId}`);
    } catch (error: any) {
      logger.error("Service error updating payment status:", error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number, adminId: number, reason?: string): Promise<void> {
    try {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("status")
        .eq("order_id", orderId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch order: ${fetchError.message}`);
      }

      const oldStatus = currentOrder.status;

      // Update order to cancelled
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "Đã hủy",
        })
        .eq("order_id", orderId);

      if (updateError) {
        throw new Error(`Failed to cancel order: ${updateError.message}`);
      }

      // Log status change
      const { error: historyError } = await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: "Đã hủy",
          changed_by_admin: adminId,
          note: reason || "Admin cancelled order",
        });

      if (historyError) {
        logger.error("Error logging cancel history:", historyError);
      }

      // Log admin action
      await this.logAdminAction(adminId, AdminAction.CANCEL_ORDER, orderId.toString(), "orders", {
        orderId,
        reason,
      });

      logger.info(`Order ${orderId} cancelled by admin ${adminId}`);
    } catch (error: any) {
      logger.error("Service error cancelling order:", error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: number, adminId: number, reason?: string): Promise<void> {
    try {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("status, payment_status")
        .eq("order_id", orderId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch order: ${fetchError.message}`);
      }

      const oldStatus = currentOrder.status;

      // Update order to refunded
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "Đã trả",
          payment_status: "refunded",
        })
        .eq("order_id", orderId);

      if (updateError) {
        throw new Error(`Failed to process refund: ${updateError.message}`);
      }

      // Log status change
      const { error: historyError } = await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: "Đã trả",
          changed_by_admin: adminId,
          note: reason || "Admin processed refund",
        });

      if (historyError) {
        logger.error("Error logging refund history:", historyError);
      }

      // Log admin action
      await this.logAdminAction(adminId, AdminAction.PROCESS_REFUND, orderId.toString(), "orders", {
        orderId,
        reason,
      });

      logger.info(`Order ${orderId} refunded by admin ${adminId}`);
    } catch (error: any) {
      logger.error("Service error processing refund:", error);
      throw error;
    }
  }

  /**
   * Log admin action
   */
  private async logAdminAction(
    adminId: number,
    action: AdminAction,
    targetId: string,
    targetType: string,
    payload?: any
  ): Promise<void> {
    try {
      const auditLog = new AdminAuditLog({
        logId: 0, // Will be auto-generated
        adminId,
        action,
        targetId,
        targetType,
        payload: payload || null,
        createdAt: new Date(),
      });

      await this.auditLogRepository.logAction(auditLog);
    } catch (error: any) {
      logger.error("Error logging admin action:", error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }
}

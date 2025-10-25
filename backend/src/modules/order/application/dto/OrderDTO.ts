import { PaymentMethod } from "../../domain/entities/Order";

/**
 * DTO for creating a new order
 */
export interface CreateOrderDTO {
  user_id: number;
  address_id: number;
  payment_method: PaymentMethod;
  shipping_method?: "standard" | "fast";
  shipping_fee?: number;
  subtotal?: number;
  total?: number;
  notes?: string;
  items?: OrderItemDTO[];
}

/**
 * DTO for order item (with price from frontend)
 */
export interface OrderItemDTO {
  product_id: number;
  quantity: number;
  price: number; // Price at time of order (includes sale price)
}

/**
 * DTO for cart item from frontend
 */
export interface CartItemDTO {
  product_id: number;
  quantity: number;
}

/**
 * DTO for updating order status
 */
export interface UpdateOrderStatusDTO {
  order_id: number;
  status: string;
  note?: string;
}

/**
 * DTO for updating payment status
 */
export interface UpdatePaymentStatusDTO {
  order_id: number;
  payment_status: string;
}

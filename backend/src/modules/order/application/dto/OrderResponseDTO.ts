/**
 * Response DTO for order operations
 */
export interface OrderResponseDTO {
  order_id: number;
  order_number: string;
  user_id: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  ordered_at: string;
  shipping_start_date?: string;
  items: OrderItemResponseDTO[];
}

/**
 * Response DTO for order items
 */
export interface OrderItemResponseDTO {
  order_item_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

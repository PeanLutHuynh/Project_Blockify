export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  total_amount: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  shipping_address: ShippingAddress;
  billing_address?: ShippingAddress;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  user?: User;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  shipping_address: ShippingAddress;
  billing_address?: ShippingAddress;
  payment_method: string;
  notes?: string;
}

export interface CreateOrderItemRequest {
  product_id: string;
  quantity: number;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded';

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  total_amount: number;
  total_items: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface AddToCartRequest {
  product_id: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  item_id: string;
  quantity: number;
}
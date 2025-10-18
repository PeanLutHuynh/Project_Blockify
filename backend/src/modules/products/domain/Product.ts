/**
 * Product Domain Entity
 * Represents a Lego product in the system
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  product_url?: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  query: string;
  limit?: number;
  category?: string;
}

/**
 * Product search result
 */
export interface ProductSearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  product_url?: string;
  category: string;
}

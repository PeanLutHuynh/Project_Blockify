/**
 * Admin Product DTOs - Application Layer
 * Data Transfer Objects for Product Management
 */

/**
 * Create Product DTO
 */
export interface CreateProductDTO {
  product_name: string;
  category_id: number;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  piece_count?: number;
  difficulty_level?: string;
  dimensions?: string;
  weight?: number;
  status?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  images?: CreateProductImageDTO[];
}

/**
 * Update Product DTO
 */
export interface UpdateProductDTO {
  product_name?: string;
  category_id?: number;
  description?: string;
  short_description?: string;
  price?: number;
  sale_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  piece_count?: number;
  difficulty_level?: string;
  dimensions?: string;
  weight?: number;
  status?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  images?: CreateProductImageDTO[]; // Add support for updating images
}

/**
 * Product Search Query DTO
 */
export interface ProductSearchQueryDTO {
  query?: string;
  category_id?: number;
  status?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  stock_filter?: 'in_stock' | 'out_of_stock' | 'low_stock'; // New: stock filtering
  difficulty_level?: string; // New: difficulty filter
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  sortBy?: 'price' | 'stock_quantity' | 'created_at'; // New: sort field
  sortOrder?: 'asc' | 'desc'; // New: sort direction
  page?: number;
  limit?: number;
}

/**
 * Create Product Image DTO
 */
export interface CreateProductImageDTO {
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
  alt_img1?: string;
  alt_img2?: string;
  alt_img3?: string;
}

/**
 * Update Product Image DTO
 */
export interface UpdateProductImageDTO {
  image_id: number;
  image_url?: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

/**
 * Product Stock Update DTO
 */
export interface UpdateProductStockDTO {
  product_id: number;
  stock_quantity: number;
  reason?: string;
}

/**
 * Product Status Update DTO
 */
export interface UpdateProductStatusDTO {
  product_id: number;
  status: string; // 'active', 'inactive', 'out_of_stock', 'draft'
  reason?: string;
}

/**
 * Create Category DTO
 */
export interface CreateCategoryDTO {
  category_name: string;
  description?: string;
  image_url?: string;
  parent_category_id?: number;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Update Category DTO
 */
export interface UpdateCategoryDTO {
  category_name?: string;
  description?: string;
  image_url?: string;
  parent_category_id?: number;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Product Response DTO
 */
export interface ProductResponseDTO {
  product_id: number;
  product_name: string;
  product_slug: string;
  category_id: number;
  category_name?: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  piece_count?: number;
  difficulty_level?: string;
  dimensions?: string;
  weight?: number;
  status?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  rating_average?: number;
  rating_count?: number;
  sold_count?: number;
  images?: ProductImageResponseDTO[];
  created_at?: string;
  updated_at?: string;
  needs_restock?: boolean;
  has_active_orders?: boolean;
}

/**
 * Product Image Response DTO
 */
export interface ProductImageResponseDTO {
  image_id: number;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

/**
 * Category Response DTO
 */
export interface CategoryResponseDTO {
  category_id: number;
  category_name: string;
  category_slug: string;
  description?: string;
  image_url?: string;
  parent_category_id?: number;
  sort_order?: number;
  is_active?: boolean;
  product_count?: number;
  created_at?: string;
}

/**
 * Paginated Products Response DTO
 */
export interface PaginatedProductsResponseDTO {
  products: ProductResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

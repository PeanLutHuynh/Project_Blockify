export interface Product {
  id: string;
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
  category_id: string;
  images: string[];
  specifications: ProductSpecifications;
  age_range?: string;
  piece_count?: number;
  difficulty_level?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  reviews?: ProductReview[];
  average_rating?: number;
}

export interface ProductSpecifications {
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight?: {
    value: number;
    unit: string;
  };
  material?: string;
  theme?: string;
  series?: string;
  [key: string]: any;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  sku: string;
  stock_quantity: number;
  min_stock_level?: number;
  category_id: string;
  specifications?: ProductSpecifications;
  age_range?: string;
  piece_count?: number;
  difficulty_level?: string;
  is_featured?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  short_description?: string;
  price?: number;
  sale_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  category_id?: string;
  specifications?: ProductSpecifications;
  age_range?: string;
  piece_count?: number;
  difficulty_level?: string;
  is_featured?: boolean;
  is_active?: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  ageRange?: string;
  difficulty?: string;
  inStock?: boolean;
  featured?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  image_url?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
  parent?: Category;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}
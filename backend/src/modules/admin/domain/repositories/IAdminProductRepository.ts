import { IRepository } from '../../../../shared/domain/IRepository';
import { AdminProduct, ProductImage, Category } from '../entities/AdminProduct';

/**
 * Admin Product Repository Interface
 * Domain Layer - Clean Architecture
 */
export interface IAdminProductRepository extends IRepository<AdminProduct> {
  /**
   * Search products by name, description, or category
   */
  searchProducts(query: string, filters?: ProductSearchFilters): Promise<AdminProduct[]>;

  /**
   * Get product by slug
   */
  findBySlug(slug: string): Promise<AdminProduct | null>;

  /**
   * Get products by category
   */
  findByCategory(categoryId: number, page?: number, limit?: number): Promise<{
    products: AdminProduct[];
    total: number;
  }>;

  /**
   * Get products by status
   */
  findByStatus(status: string): Promise<AdminProduct[]>;

  /**
   * Get products that need restock
   */
  findNeedingRestock(): Promise<AdminProduct[]>;

  /**
   * Update product stock
   */
  updateStock(productId: number, quantity: number): Promise<void>;

  /**
   * Update product status
   */
  updateStatus(productId: number, status: string): Promise<void>;

  /**
   * Get all products with pagination
   */
  findAllPaginated(page: number, limit: number, filters?: ProductSearchFilters): Promise<{
    products: AdminProduct[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Check if product has active orders
   */
  hasActiveOrders(productId: number): Promise<boolean>;

  /**
   * Get product with full details (images, category)
   */
  findByIdWithDetails(productId: number): Promise<AdminProduct | null>;
}

/**
 * Product Image Repository Interface
 */
export interface IProductImageRepository extends IRepository<ProductImage> {
  /**
   * Find images by product ID
   */
  findByProductId(productId: number): Promise<ProductImage[]>;

  /**
   * Delete images by product ID
   */
  deleteByProductId(productId: number): Promise<void>;

  /**
   * Update image sort order
   */
  updateSortOrder(imageId: number, sortOrder: number): Promise<void>;

  /**
   * Set primary image
   */
  setPrimaryImage(productId: number, imageId: number): Promise<void>;
}

/**
 * Category Repository Interface
 */
export interface ICategoryRepository extends IRepository<Category> {
  /**
   * Find category by slug
   */
  findBySlug(slug: string): Promise<Category | null>;

  /**
   * Find active categories
   */
  findActive(): Promise<Category[]>;

  /**
   * Find subcategories
   */
  findSubcategories(parentId: number): Promise<Category[]>;

  /**
   * Check if category has products
   */
  hasProducts(categoryId: number): Promise<boolean>;
}

/**
 * Product search filters
 */
export interface ProductSearchFilters {
  categoryId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
}

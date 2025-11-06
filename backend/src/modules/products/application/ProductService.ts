import { logger } from '../../../config/logger';
import { Product, SearchQuery, ProductSearchResult } from '../domain/Product';
import { ProductQueryService } from './ProductQueryService';
import { ProductSearchService } from './ProductSearchService';
import { ProductRecommendationService } from './ProductRecommendationService';

/**
 * Product Service - Facade pattern for backward compatibility
 * Delegates to specialized services following Clean Architecture
 * 
 * @deprecated Use specific services instead:
 * - ProductQueryService for queries
 * - ProductSearchService for search
 * - ProductRecommendationService for recommendations
 */
export class ProductService {
  private queryService: ProductQueryService;
  private searchService: ProductSearchService;
  private recommendationService: ProductRecommendationService;

  constructor() {
    this.queryService = new ProductQueryService();
    this.searchService = new ProductSearchService();
    this.recommendationService = new ProductRecommendationService();
  }
  /**
   * UC3 - Thanh tìm kiếm
   * @deprecated Use ProductSearchService.searchProducts() instead
   */
  async searchProducts(searchQuery: SearchQuery): Promise<ProductSearchResult[]> {
    return this.searchService.searchProducts(searchQuery);
  }

  /**
   * Get suggestions for autocomplete (limited results)
   * @deprecated Use ProductSearchService.getSuggestions() instead
   */
  async getSuggestions(query: string, limit: number = 5): Promise<ProductSearchResult[]> {
    return this.searchService.getSuggestions(query, limit);
  }

  /**
   * Get all products (for admin)
   * @deprecated Use ProductQueryService.getAllProducts() instead
   */
  async getAllProducts(): Promise<Product[]> {
    return this.queryService.getAllProducts();
  }

  /**
   * Get product by ID
   * @deprecated Use ProductQueryService.getProductById() instead
   */
  async getProductById(id: string): Promise<Product | null> {
    return this.queryService.getProductById(id);
  }

  /**
   * Get multiple products by IDs
   * Used for cart stock validation
   */
  async getProductsByIds(ids: number[]): Promise<Product[]> {
    return this.queryService.getProductsByIds(ids);
  }

  /**
   * Get product by slug (for product detail page)
   * @deprecated Use ProductQueryService.getProductBySlug() instead
   */
  async getProductBySlug(slug: string): Promise<any | null> {
    return this.queryService.getProductBySlug(slug);
  }

  /**
   * Get products by category
   * @deprecated Use ProductQueryService.getProductsByCategory() instead
   */
  async getProductsByCategory(category: string): Promise<ProductSearchResult[]> {
    return this.queryService.getProductsByCategory(category);
  }

  /**
   * Get featured products for home page
   * @deprecated Use ProductQueryService.getFeaturedProducts() instead
   */
  async getFeaturedProducts(limit: number = 10, onlyFeatured: boolean = false): Promise<ProductSearchResult[]> {
    return this.queryService.getFeaturedProducts(limit, onlyFeatured);
  }

  /**
   * Get best-selling products (most purchased from delivered orders)
   * @deprecated Use ProductRecommendationService.getBestSellingProducts() instead
   */
  async getBestSellingProducts(limit: number = 8): Promise<ProductSearchResult[]> {
    return this.recommendationService.getBestSellingProducts(limit);
  }

  /**
   * Get products with pagination and optional filters
   * @deprecated Use ProductQueryService.getProducts() instead
   */
  async getProducts(
    categoryId?: number, 
    page: number = 1, 
    limit: number = 12,
    filters?: {
      difficultyLevel?: string;
      priceRange?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: ProductSearchResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.queryService.getProducts(categoryId, page, limit, filters);
  }

  /**
   * Get recommended products based on user's purchase history
   * @deprecated Use ProductRecommendationService.getRecommendedProductsForUser() instead
   */
  async getRecommendedProductsForUser(userId: number, limit: number = 8): Promise<ProductSearchResult[]> {
    return this.recommendationService.getRecommendedProductsForUser(userId, limit);
  }

  /**
   * Get recommended products based on current product (same category)
   * @deprecated Use ProductRecommendationService.getRecommendedProductsByCategory() instead
   */
  async getRecommendedProductsByCategory(productId: number, limit: number = 6): Promise<ProductSearchResult[]> {
    return this.recommendationService.getRecommendedProductsByCategory(productId, limit);
  }

  /**
   * Get new products (is_new = true)
   * @deprecated Use ProductQueryService.getNewProducts() instead
   */
  async getNewProducts(limit: number = 12): Promise<ProductSearchResult[]> {
    return this.queryService.getNewProducts(limit);
  }

  /**
   * Get bestseller products (is_bestseller = true)
   * @deprecated Use ProductQueryService.getBestsellerProducts() instead
   */
  async getBestsellerProducts(limit: number = 12): Promise<ProductSearchResult[]> {
    return this.queryService.getBestsellerProducts(limit);
  }
}

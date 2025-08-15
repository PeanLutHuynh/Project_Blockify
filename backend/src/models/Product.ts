import { BaseModel } from './BaseModel';
import { Product, CreateProductRequest, UpdateProductRequest, ProductFilters } from '../types/Product';
import { PaginationParams } from '../types/API';

export class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(
    filters: ProductFilters = {},
    pagination?: PaginationParams
  ): Promise<{ data: Product[]; pagination?: any }> {
    let query = this.supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug
        ),
        product_reviews (
          rating
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.priceRange?.min) {
      query = query.gte('price', filters.priceRange.min);
    }

    if (filters.priceRange?.max) {
      query = query.lte('price', filters.priceRange.max);
    }

    if (filters.ageRange) {
      query = query.eq('age_range', filters.ageRange);
    }

    if (filters.difficulty) {
      query = query.eq('difficulty_level', filters.difficulty);
    }

    if (filters.inStock) {
      query = query.gt('stock_quantity', 0);
    }

    if (filters.featured) {
      query = query.eq('is_featured', true);
    }

    // Only show active products by default
    query = query.eq('is_active', true);

    // Apply pagination
    if (pagination) {
      const { page = 1, limit = 12 } = pagination;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }

    const products = (data || []).map(this.transformProduct);

    const result: { data: Product[]; pagination?: any } = { data: products };

    if (pagination && count !== null) {
      const { page = 1, limit = 12 } = pagination;
      const totalPages = Math.ceil(count / limit);
      
      result.pagination = {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    }

    return result;
  }

  /**
   * Get product by ID with related data
   */
  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug
        ),
        product_reviews (
          id,
          rating,
          title,
          comment,
          is_approved,
          created_at,
          user_profiles:user_id (
            full_name
          )
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }

    return this.transformProduct(data);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug
        )
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching featured products: ${error.message}`);
    }

    return (data || []).map(this.transformProduct);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string, pagination?: PaginationParams): Promise<{ data: Product[]; pagination?: any }> {
    return this.getProducts({ category: categoryId }, pagination);
  }

  /**
   * Search products
   */
  async searchProducts(query: string, pagination?: PaginationParams): Promise<{ data: Product[]; pagination?: any }> {
    return this.getProducts({ search: query }, pagination);
  }

  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const product = await this.create({
      ...productData,
      images: [],
      is_active: true
    });

    return this.transformProduct(product);
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, newStock: number): Promise<void> {
    await this.update(productId, { stock_quantity: newStock });
  }

  /**
   * Check if product is in stock
   */
  async isInStock(productId: string, quantity: number = 1): Promise<boolean> {
    const product = await this.findById(productId, 'stock_quantity');
    return product && product.stock_quantity >= quantity;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .lte('stock_quantity', 'min_stock_level')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (error) {
      throw new Error(`Error fetching low stock products: ${error.message}`);
    }

    return (data || []).map(this.transformProduct);
  }

  /**
   * Transform database product to API product
   */
  private transformProduct(product: any): Product {
    let average_rating = 0;
    if (product.product_reviews && product.product_reviews.length > 0) {
      const approvedReviews = product.product_reviews.filter((r: any) => r.is_approved);
      if (approvedReviews.length > 0) {
        average_rating = approvedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / approvedReviews.length;
      }
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      price: parseFloat(product.price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
      sku: product.sku,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      category_id: product.category_id,
      images: product.images || [],
      specifications: product.specifications || {},
      age_range: product.age_range,
      piece_count: product.piece_count,
      difficulty_level: product.difficulty_level,
      is_featured: product.is_featured,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      category: product.categories,
      reviews: product.product_reviews,
      average_rating
    };
  }
}
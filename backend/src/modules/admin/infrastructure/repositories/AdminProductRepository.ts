import { BaseRepository } from '../../../../shared/infrastructure/BaseRepository';
import { AdminProduct, ProductImage, Category } from '../../domain/entities/AdminProduct';
import {
  IAdminProductRepository,
  IProductImageRepository,
  ICategoryRepository,
  ProductSearchFilters,
} from '../../domain/repositories/IAdminProductRepository';
import { supabaseAdmin } from '../../../../config/database';
import { logger } from '../../../../config/logger';

/**
 * Admin Product Repository Implementation
 * Infrastructure Layer - Clean Architecture
 */
export class AdminProductRepository
  extends BaseRepository<AdminProduct>
  implements IAdminProductRepository
{
  protected tableName = 'products';

  constructor() {
    super('products');
  }

  /**
   * Search products by name, description, or category
   */
  async searchProducts(
    query: string,
    filters?: ProductSearchFilters
  ): Promise<AdminProduct[]> {
    try {
      let queryBuilder = supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `);

      // Search by name or description
      if (query && query.trim().length > 0) {
        queryBuilder = queryBuilder.or(
          `product_name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`
        );
      }

      // Apply filters
      if (filters) {
        if (filters.categoryId) {
          queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
        }
        if (filters.status) {
          queryBuilder = queryBuilder.eq('status', filters.status);
        }
        if (filters.minPrice) {
          queryBuilder = queryBuilder.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
          queryBuilder = queryBuilder.lte('price', filters.maxPrice);
        }
        if (filters.inStock !== undefined) {
          if (filters.inStock) {
            queryBuilder = queryBuilder.gt('stock_quantity', 0);
          } else {
            queryBuilder = queryBuilder.eq('stock_quantity', 0);
          }
        }
        if (filters.isFeatured !== undefined) {
          queryBuilder = queryBuilder.eq('is_featured', filters.isFeatured);
        }
        if (filters.isNew !== undefined) {
          queryBuilder = queryBuilder.eq('is_new', filters.isNew);
        }
        if (filters.isBestseller !== undefined) {
          queryBuilder = queryBuilder.eq('is_bestseller', filters.isBestseller);
        }
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */
  async findBySlug(slug: string): Promise<AdminProduct | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `)
        .eq('product_slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      logger.error('Error finding product by slug:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async findByCategory(
    categoryId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: AdminProduct[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count } = await supabaseAdmin
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      // Get products
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        products: data ? data.map((item) => this.mapToEntity(item)) : [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error finding products by category:', error);
      throw error;
    }
  }

  /**
   * Get products by status
   */
  async findByStatus(status: string): Promise<AdminProduct[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding products by status:', error);
      throw error;
    }
  }

  /**
   * Get products that need restock
   */
  async findNeedingRestock(): Promise<AdminProduct[]> {
    try {
      // Find products where stock_quantity <= min_stock_level
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `)
        .not('min_stock_level', 'is', null)
        .filter('stock_quantity', 'lte', 'min_stock_level')
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding products needing restock:', error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId: number, quantity: number): Promise<void> {
    try {
      const updateData: any = {
        stock_quantity: quantity,
        updated_at: new Date().toISOString(),
      };

      // Update status based on quantity
      if (quantity === 0) {
        updateData.status = 'out_of_stock';
      } else {
        // Check if current status is out_of_stock, then change to active
        const { data: currentProduct } = await supabaseAdmin
          .from(this.tableName)
          .select('status')
          .eq('product_id', productId)
          .single();

        if (currentProduct?.status === 'out_of_stock') {
          updateData.status = 'active';
        }
      }

      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update(updateData)
        .eq('product_id', productId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * Update product status
   */
  async updateStatus(productId: number, status: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', productId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating product status:', error);
      throw error;
    }
  }

  /**
   * Get all products with pagination
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
    filters?: ProductSearchFilters
  ): Promise<{
    products: AdminProduct[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      let queryBuilder = supabaseAdmin
        .from(this.tableName)
        .select(
          `
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          )
        `,
          { count: 'exact' }
        );

      // Apply filters
      if (filters) {
        if (filters.categoryId) {
          queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
        }
        if (filters.status) {
          queryBuilder = queryBuilder.eq('status', filters.status);
        }
        if (filters.minPrice) {
          queryBuilder = queryBuilder.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
          queryBuilder = queryBuilder.lte('price', filters.maxPrice);
        }
        if (filters.inStock !== undefined) {
          if (filters.inStock) {
            queryBuilder = queryBuilder.gt('stock_quantity', 0);
          } else {
            queryBuilder = queryBuilder.eq('stock_quantity', 0);
          }
        }
        if (filters.isFeatured !== undefined) {
          queryBuilder = queryBuilder.eq('is_featured', filters.isFeatured);
        }
        if (filters.isNew !== undefined) {
          queryBuilder = queryBuilder.eq('is_new', filters.isNew);
        }
        if (filters.isBestseller !== undefined) {
          queryBuilder = queryBuilder.eq('is_bestseller', filters.isBestseller);
        }
      }

      const { data, error, count } = await queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        products: data ? data.map((item) => this.mapToEntity(item)) : [],
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding all products paginated:', error);
      throw error;
    }
  }

  /**
   * Check if product has active orders
   */
  async hasActiveOrders(productId: number): Promise<boolean> {
    try {
      // Check if product is in any order with status not 'Đã giao', 'Đã hủy', or 'Đã trả'
      const { data, error } = await supabaseAdmin
        .from('order_items')
        .select(`
          order_id,
          orders!inner (
            status
          )
        `)
        .eq('product_id', productId)
        .not('orders.status', 'in', '("Đã giao","Đã hủy","Đã trả")')
        .limit(1);

      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch (error) {
      logger.error('Error checking if product has active orders:', error);
      return false;
    }
  }

  /**
   * Get product with full details
   */
  async findByIdWithDetails(productId: number): Promise<AdminProduct | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          categories:category_id (
            category_id,
            category_name,
            category_slug,
            description,
            image_url
          ),
          product_images (
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order,
            alt_img1,
            alt_img2,
            alt_img3
          )
        `)
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      logger.error('Error finding product by ID with details:', error);
      throw error;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<AdminProduct | null> {
    return this.findByIdWithDetails(parseInt(id));
  }

  /**
   * Find all
   */
  async findAll(): Promise<AdminProduct[]> {
    const result = await this.findAllPaginated(1, 1000);
    return result.products;
  }

  /**
   * Create product
   */
  async create(entity: AdminProduct): Promise<AdminProduct> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert([this.mapFromEntity(entity)])
        .select()
        .single();

      if (error) throw error;

      // Insert images if provided
      if (entity.images && entity.images.length > 0) {
        const productId = data.product_id;
        const imageRepo = new ProductImageRepository();
        
        for (const image of entity.images) {
          image.productId = productId;
          await imageRepo.create(image);
        }
      }

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(id: string, entity: Partial<AdminProduct>): Promise<AdminProduct> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update({
          ...this.mapFromEntity(entity),
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if product has active orders
      const hasOrders = await this.hasActiveOrders(parseInt(id));
      if (hasOrders) {
        throw new Error(
          'Không thể xóa sản phẩm đang có trong đơn hàng chưa hoàn thành. Vui lòng xử lý các đơn hàng trước.'
        );
      }

      // Delete product images first
      const imageRepo = new ProductImageRepository();
      await imageRepo.deleteByProductId(parseInt(id));

      // Delete product
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq('product_id', parseInt(id));

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Map database row to entity
   */
  protected mapToEntity(data: any): AdminProduct {
    return new AdminProduct({
      productId: data.product_id,
      productName: data.product_name,
      productSlug: data.product_slug,
      categoryId: data.category_id,
      description: data.description,
      shortDescription: data.short_description,
      price: data.price,
      salePrice: data.sale_price,
      stockQuantity: data.stock_quantity,
      minStockLevel: data.min_stock_level,
      pieceCount: data.piece_count,
      difficultyLevel: data.difficulty_level,
      dimensions: data.dimensions,
      weight: data.weight,
      status: data.status,
      isFeatured: data.is_featured,
      isNew: data.is_new,
      isBestseller: data.is_bestseller,
      ratingAverage: data.rating_average,
      ratingCount: data.rating_count,
      soldCount: data.sold_count,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      images: data.product_images
        ? data.product_images.map((img: any) => new ProductImage({
            imageId: img.image_id,
            productId: data.product_id,
            imageUrl: img.image_url,
            altText: img.alt_text,
            isPrimary: img.is_primary,
            sortOrder: img.sort_order,
            altImg1: img.alt_img1,
            altImg2: img.alt_img2,
            altImg3: img.alt_img3,
          }))
        : [],
      category: data.categories
        ? new Category({
            categoryId: data.categories.category_id,
            categoryName: data.categories.category_name,
            categorySlug: data.categories.category_slug,
            description: data.categories.description,
            imageUrl: data.categories.image_url,
          })
        : undefined,
    });
  }

  /**
   * Map entity to database row
   */
  protected mapFromEntity(entity: AdminProduct | Partial<AdminProduct>): any {
    const mapped: any = {};

    if (entity.productName !== undefined)
      mapped.product_name = entity.productName;
    if (entity.productSlug !== undefined)
      mapped.product_slug = entity.productSlug;
    if (entity.categoryId !== undefined) mapped.category_id = entity.categoryId;
    if (entity.description !== undefined)
      mapped.description = entity.description;
    if (entity.shortDescription !== undefined)
      mapped.short_description = entity.shortDescription;
    if (entity.price !== undefined) mapped.price = entity.price;
    if (entity.salePrice !== undefined) mapped.sale_price = entity.salePrice;
    if (entity.stockQuantity !== undefined)
      mapped.stock_quantity = entity.stockQuantity;
    if (entity.minStockLevel !== undefined)
      mapped.min_stock_level = entity.minStockLevel;
    if (entity.pieceCount !== undefined)
      mapped.piece_count = entity.pieceCount;
    if (entity.difficultyLevel !== undefined)
      mapped.difficulty_level = entity.difficultyLevel;
    if (entity.dimensions !== undefined) mapped.dimensions = entity.dimensions;
    if (entity.weight !== undefined) mapped.weight = entity.weight;
    if (entity.status !== undefined) mapped.status = entity.status;
    if (entity.isFeatured !== undefined)
      mapped.is_featured = entity.isFeatured;
    if (entity.isNew !== undefined) mapped.is_new = entity.isNew;
    if (entity.isBestseller !== undefined)
      mapped.is_bestseller = entity.isBestseller;

    return mapped;
  }
}

/**
 * Product Image Repository Implementation
 */
export class ProductImageRepository
  extends BaseRepository<ProductImage>
  implements IProductImageRepository
{
  protected tableName = 'product_images';

  constructor() {
    super('product_images');
  }

  /**
   * Find images by product ID
   */
  async findByProductId(productId: number): Promise<ProductImage[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding images by product ID:', error);
      throw error;
    }
  }

  /**
   * Delete images by product ID
   */
  async deleteByProductId(productId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq('product_id', productId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting images by product ID:', error);
      throw error;
    }
  }

  /**
   * Update image sort order
   */
  async updateSortOrder(imageId: number, sortOrder: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update({ sort_order: sortOrder })
        .eq('image_id', imageId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating image sort order:', error);
      throw error;
    }
  }

  /**
   * Set primary image
   */
  async setPrimaryImage(productId: number, imageId: number): Promise<void> {
    try {
      // First, set all images for this product to non-primary
      await supabaseAdmin
        .from(this.tableName)
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Then set the specified image as primary
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .update({ is_primary: true })
        .eq('image_id', imageId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error setting primary image:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ProductImage | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('image_id', parseInt(id))
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      logger.error('Error finding image by ID:', error);
      throw error;
    }
  }

  async findAll(): Promise<ProductImage[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding all images:', error);
      throw error;
    }
  }

  async create(entity: ProductImage): Promise<ProductImage> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert([this.mapFromEntity(entity)])
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error creating image:', error);
      throw error;
    }
  }

  async update(id: string, entity: Partial<ProductImage>): Promise<ProductImage> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update(this.mapFromEntity(entity))
        .eq('image_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error updating image:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq('image_id', parseInt(id));

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw error;
    }
  }

  protected mapToEntity(data: any): ProductImage {
    return new ProductImage({
      imageId: data.image_id,
      productId: data.product_id,
      imageUrl: data.image_url,
      altText: data.alt_text,
      isPrimary: data.is_primary,
      sortOrder: data.sort_order,
      altImg1: data.alt_img1,
      altImg2: data.alt_img2,
      altImg3: data.alt_img3,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
    });
  }

  protected mapFromEntity(entity: ProductImage | Partial<ProductImage>): any {
    const mapped: any = {};

    // CRITICAL: NEVER include image_id in insert/update
    // It's auto-generated by database sequence
    // Including it causes duplicate key violations
    
    if (entity.productId !== undefined) mapped.product_id = entity.productId;
    if (entity.imageUrl !== undefined) mapped.image_url = entity.imageUrl;
    if (entity.altText !== undefined) mapped.alt_text = entity.altText;
    if (entity.isPrimary !== undefined) mapped.is_primary = entity.isPrimary;
    if (entity.sortOrder !== undefined) mapped.sort_order = entity.sortOrder;
    if (entity.altImg1 !== undefined) mapped.alt_img1 = entity.altImg1;
    if (entity.altImg2 !== undefined) mapped.alt_img2 = entity.altImg2;
    if (entity.altImg3 !== undefined) mapped.alt_img3 = entity.altImg3;

    return mapped;
  }
}

/**
 * Category Repository Implementation
 */
export class CategoryRepository
  extends BaseRepository<Category>
  implements ICategoryRepository
{
  protected tableName = 'categories';

  constructor() {
    super('categories');
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('category_slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      logger.error('Error finding category by slug:', error);
      throw error;
    }
  }

  /**
   * Find active categories
   */
  async findActive(): Promise<Category[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding active categories:', error);
      throw error;
    }
  }

  /**
   * Find subcategories
   */
  async findSubcategories(parentId: number): Promise<Category[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('parent_category_id', parentId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding subcategories:', error);
      throw error;
    }
  }

  /**
   * Check if category has products
   */
  async hasProducts(categoryId: number): Promise<boolean> {
    try {
      const { count, error } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;

      return (count || 0) > 0;
    } catch (error) {
      logger.error('Error checking if category has products:', error);
      return false;
    }
  }

  async findById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('category_id', parseInt(id))
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      logger.error('Error finding category by ID:', error);
      throw error;
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      logger.error('Error finding all categories:', error);
      throw error;
    }
  }

  async create(entity: Category): Promise<Category> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .insert([this.mapFromEntity(entity)])
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  async update(id: string, entity: Partial<Category>): Promise<Category> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update(this.mapFromEntity(entity))
        .eq('category_id', parseInt(id))
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Check if category has products
      const hasProds = await this.hasProducts(parseInt(id));
      if (hasProds) {
        throw new Error(
          'Không thể xóa danh mục đang có sản phẩm. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.'
        );
      }

      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq('category_id', parseInt(id));

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  protected mapToEntity(data: any): Category {
    return new Category({
      categoryId: data.category_id,
      categoryName: data.category_name,
      categorySlug: data.category_slug,
      description: data.description,
      imageUrl: data.image_url,
      parentCategoryId: data.parent_category_id,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
    });
  }

  protected mapFromEntity(entity: Category | Partial<Category>): any {
    const mapped: any = {};

    if (entity.categoryName !== undefined)
      mapped.category_name = entity.categoryName;
    if (entity.categorySlug !== undefined)
      mapped.category_slug = entity.categorySlug;
    if (entity.description !== undefined)
      mapped.description = entity.description;
    if (entity.imageUrl !== undefined) mapped.image_url = entity.imageUrl;
    if (entity.parentCategoryId !== undefined)
      mapped.parent_category_id = entity.parentCategoryId;
    if (entity.sortOrder !== undefined) mapped.sort_order = entity.sortOrder;
    if (entity.isActive !== undefined) mapped.is_active = entity.isActive;

    return mapped;
  }
}

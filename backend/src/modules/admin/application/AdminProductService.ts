import { AdminProduct, ProductImage, Category } from '../domain/entities/AdminProduct';
import {
  AdminProductRepository,
  ProductImageRepository,
  CategoryRepository,
} from '../infrastructure/repositories/AdminProductRepository';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductSearchQueryDTO,
  UpdateProductStockDTO,
  UpdateProductStatusDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  ProductResponseDTO,
  PaginatedProductsResponseDTO,
  CategoryResponseDTO,
} from './dto/AdminProductDTO';
import { logger } from '../../../config/logger';
import { AdminAuditLog, AdminAction } from '../domain/entities/AdminAuditLog';
import { supabaseAdmin } from '../../../config/database';

/**
 * Admin Product Service - Application Layer
 * Handles business logic for product management
 */
export class AdminProductService {
  private productRepo: AdminProductRepository;
  private imageRepo: ProductImageRepository;
  private categoryRepo: CategoryRepository;

  constructor() {
    this.productRepo = new AdminProductRepository();
    this.imageRepo = new ProductImageRepository();
    this.categoryRepo = new CategoryRepository();
  }

  /**
   * Helper: Flatten product images from database structure
   * Each row has: image_url (main) + alt_img1, alt_img2, alt_img3
   */
  private flattenProductImages(productImagesRows: any[]): any[] {
    const allImages: any[] = [];
    // Cache-busting timestamp - force browser reload on image changes
    const cacheBreaker = Date.now();
    
    (productImagesRows || []).forEach((imgRow: any, rowIndex: number) => {
      // Main image (image_url)
      if (imgRow.image_url) {
        allImages.push({
          image_id: imgRow.image_id,
          image_url: this.addCacheBuster(imgRow.image_url, cacheBreaker),
          is_primary: imgRow.is_primary || rowIndex === 0,
          sort_order: imgRow.sort_order || (rowIndex * 4),
        });
      }
      
      // Alternative images
      if (imgRow.alt_img1) {
        allImages.push({
          image_id: `${imgRow.image_id}_alt1`,
          image_url: this.addCacheBuster(imgRow.alt_img1, cacheBreaker),
          is_primary: false,
          sort_order: imgRow.sort_order || (rowIndex * 4 + 1),
        });
      }
      if (imgRow.alt_img2) {
        allImages.push({
          image_id: `${imgRow.image_id}_alt2`,
          image_url: this.addCacheBuster(imgRow.alt_img2, cacheBreaker),
          is_primary: false,
          sort_order: imgRow.sort_order || (rowIndex * 4 + 2),
        });
      }
      if (imgRow.alt_img3) {
        allImages.push({
          image_id: `${imgRow.image_id}_alt3`,
          image_url: this.addCacheBuster(imgRow.alt_img3, cacheBreaker),
          is_primary: false,
          sort_order: imgRow.sort_order || (rowIndex * 4 + 3),
        });
      }
    });

    return allImages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  /**
   * Search products - Direct Supabase query
   */
  async searchProducts(
    query: ProductSearchQueryDTO
  ): Promise<ProductResponseDTO[]> {
    try {
      logger.info('🔍 AdminProductService.searchProducts - Query:', query);

      const searchQuery = query.query || '';
      
      // Build Supabase query
      let supabaseQuery = supabaseAdmin
        .from('products')
        .select(`
          *,
          categories(category_id, category_name, category_slug),
          product_images(image_id, image_url, alt_img1, alt_img2, alt_img3, is_primary, sort_order)
        `);

      // Apply search on product_name
      if (searchQuery && searchQuery.trim().length > 0) {
        supabaseQuery = supabaseQuery.ilike('product_name', `%${searchQuery.trim()}%`);
      }

      // Apply filters
      if (query.category_id) {
        supabaseQuery = supabaseQuery.eq('category_id', query.category_id);
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }
      if (query.in_stock) {
        supabaseQuery = supabaseQuery.gt('stock_quantity', 0);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        logger.error('❌ Supabase search error:', error);
        throw error;
      }

      logger.info(`✅ Search found ${data?.length || 0} products`);

      // Calculate sold_count for search results
      const productIds = (data || []).map((item: any) => item.product_id);
      const soldCounts = await this.calculateSoldCounts(productIds);

      const products = (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        category_id: item.category_id,
        category_name: item.categories?.category_name || 'N/A',
        description: item.description,
        short_description: item.short_description,
        price: item.price,
        sale_price: item.sale_price,
        stock_quantity: item.stock_quantity,
        piece_count: item.piece_count,
        difficulty_level: item.difficulty_level,
        status: item.status,
        sold_count: soldCounts[item.product_id] || 0,
        images: this.flattenProductImages(item.product_images || []),
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      return products;
    } catch (error) {
      logger.error('❌ Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get all products with pagination
   * Simple query like AdminOrderService - directly use Supabase
   */
  async getAllProducts(
    query: ProductSearchQueryDTO
  ): Promise<PaginatedProductsResponseDTO> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      logger.info('📦 AdminProductService.getAllProducts - Query:', { 
        page, limit, offset, 
        search: query.query,
        stock_filter: query.stock_filter,
        category_id: query.category_id,
        difficulty_level: query.difficulty_level
      });

      // Query products - categories is LEFT JOIN by default in Supabase
      // If category_id is null or invalid, categories will be null
      let supabaseQuery = supabaseAdmin
        .from('products')
        .select(`
          *,
          categories!left(category_id, category_name, category_slug),
          product_images!left(image_id, image_url, alt_img1, alt_img2, alt_img3, is_primary, sort_order)
        `, { count: 'exact' });

      // Apply search filter
      if (query.query && query.query.trim().length > 0) {
        supabaseQuery = supabaseQuery.ilike('product_name', `%${query.query.trim()}%`);
      }

      // Apply filters if provided
      if (query.category_id) {
        supabaseQuery = supabaseQuery.eq('category_id', query.category_id);
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }
      if (query.difficulty_level) {
        supabaseQuery = supabaseQuery.eq('difficulty_level', query.difficulty_level);
      }
      if (query.is_featured !== undefined) {
        supabaseQuery = supabaseQuery.eq('is_featured', query.is_featured);
      }
      if (query.is_new !== undefined) {
        supabaseQuery = supabaseQuery.eq('is_new', query.is_new);
      }
      if (query.is_bestseller !== undefined) {
        supabaseQuery = supabaseQuery.eq('is_bestseller', query.is_bestseller);
      }

      // Handle stock filtering with proper logic
      if (query.stock_filter) {
        if (query.stock_filter === 'out_of_stock') {
          // Hết hàng: stock_quantity = 0
          supabaseQuery = supabaseQuery.eq('stock_quantity', 0);
        } else if (query.stock_filter === 'low_stock') {
          // Sắp hết: stock_quantity > 0 AND stock_quantity <= min_stock_level
          // Note: Supabase doesn't directly support column-to-column comparison
          // We'll handle this in post-processing for now
          supabaseQuery = supabaseQuery.gt('stock_quantity', 0);
        } else if (query.stock_filter === 'in_stock') {
          // Còn hàng: stock_quantity > min_stock_level
          // We'll handle this in post-processing too
          supabaseQuery = supabaseQuery.gt('stock_quantity', 0);
        }
      } else if (query.in_stock) {
        // Legacy in_stock filter
        supabaseQuery = supabaseQuery.gt('stock_quantity', 0);
      }

      // Apply sorting
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder ? (query.sortOrder === 'asc' ? true : false) : false; // Default: descending (newest first)
      supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder });

      // Apply pagination
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        logger.error('❌ Supabase query error:', error);
        throw error;
      }

      logger.info(`✅ Supabase returned ${data?.length || 0} products from DB (total count: ${count})`);
      logger.info(`📊 Will apply post-processing: stock_filter=${query.stock_filter}`);

      // Calculate sold_count for each product
      const productIds = (data || []).map((item: any) => item.product_id);
      const soldCounts = await this.calculateSoldCounts(productIds);

      let products = (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        category_id: item.category_id,
        category_name: item.categories?.category_name || 'N/A',
        description: item.description,
        short_description: item.short_description,
        price: item.price,
        sale_price: item.sale_price,
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        piece_count: item.piece_count,
        difficulty_level: item.difficulty_level,
        dimensions: item.dimensions,
        weight: item.weight,
        status: item.status,
        is_featured: item.is_featured,
        is_new: item.is_new,
        is_bestseller: item.is_bestseller,
        rating_average: item.rating_average,
        rating_count: item.rating_count,
        sold_count: soldCounts[item.product_id] || 0,
        images: this.flattenProductImages(item.product_images || []),
        needs_restock: item.min_stock_level && item.stock_quantity < item.min_stock_level,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      // Post-process stock filtering (column-to-column comparison)
      const beforeFilterCount = products.length;
      if (query.stock_filter === 'low_stock') {
        // Sắp hết: 0 < stock_quantity <= min_stock_level
        products = products.filter((p: any) => 
          p.stock_quantity > 0 && 
          p.min_stock_level && 
          p.stock_quantity <= p.min_stock_level
        );
        logger.info(`🔍 low_stock filter: ${beforeFilterCount} → ${products.length} products`);
      } else if (query.stock_filter === 'in_stock') {
        // Còn hàng: stock_quantity > min_stock_level (or no min_stock_level set)
        products = products.filter((p: any) => 
          p.stock_quantity > 0 && 
          (!p.min_stock_level || p.stock_quantity > p.min_stock_level)
        );
        logger.info(`🔍 in_stock filter: ${beforeFilterCount} → ${products.length} products`);
      }

      logger.info(`📤 Returning ${products.length} products to frontend`);

      return {
        products,
        pagination: {
          page,
          limit,
          total: products.length, // Use filtered count
          total_pages: Math.ceil(products.length / limit),
        },
      };
    } catch (error) {
      logger.error('❌ Error in getAllProducts:', error);
      throw error;
    }
  }

  /**
   * Get product by ID - simplified
   */
  async getProductById_NEW(productId: number): Promise<ProductResponseDTO | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          categories(category_id, category_name, category_slug),
          product_images(image_id, image_url, alt_img1, alt_img2, alt_img3, is_primary, sort_order)
        `)
        .eq('product_id', productId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        product_id: data.product_id,
        product_name: data.product_name,
        product_slug: data.product_slug,
        category_id: data.category_id,
        category_name: data.categories?.category_name || 'N/A',
        description: data.description,
        short_description: data.short_description,
        price: data.price,
        sale_price: data.sale_price,
        stock_quantity: data.stock_quantity,
        piece_count: data.piece_count,
        difficulty_level: data.difficulty_level,
        dimensions: data.dimensions,
        weight: data.weight,
        status: data.status,
        is_featured: data.is_featured,
        is_new: data.is_new,
        is_bestseller: data.is_bestseller,
        rating_average: data.rating_average,
        rating_count: data.rating_count,
        sold_count: data.sold_count,
        images: this.flattenProductImages(data.product_images || []),
        needs_restock: data.min_stock_level && data.stock_quantity < data.min_stock_level,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      logger.error('Error getting product by ID:', error);
      return null;
    }
  }

  /**
   * Get product by ID - use simplified version
   */
  async getProductById(productId: number): Promise<ProductResponseDTO | null> {
    return this.getProductById_NEW(productId);
  }

  /**
   * Create new product
   */
  async createProduct(
    dto: CreateProductDTO,
    adminId: number
  ): Promise<ProductResponseDTO> {
    try {
      console.log('🚀🚀🚀 [Service] CREATE PRODUCT STARTED 🚀🚀🚀');
      console.log('DTO:', JSON.stringify(dto, null, 2));
      
      // Validate category exists
      logger.info(`🔍 [CreateProduct] Checking category with ID: ${dto.category_id}`);
      const category = await this.categoryRepo.findById(
        dto.category_id.toString()
      );
      if (!category) {
        console.error(`❌❌❌ CATEGORY NOT FOUND: ${dto.category_id}`);
        logger.error(`❌ [CreateProduct] Category not found: ${dto.category_id}`);
        throw new Error(`Danh mục với ID ${dto.category_id} không tồn tại`);
      }
      console.log(`✅ Category found: ${category.categoryName}`);
      logger.info(`✅ [CreateProduct] Category found: ${category.categoryName}`);

      // Create product entity
      const product = new AdminProduct({
        productName: dto.product_name,
        categoryId: dto.category_id,
        description: dto.description,
        shortDescription: dto.short_description,
        price: dto.price,
        salePrice: dto.sale_price,
        stockQuantity: dto.stock_quantity || 0,
        minStockLevel: dto.min_stock_level,
        pieceCount: dto.piece_count,
        difficultyLevel: dto.difficulty_level,
        dimensions: dto.dimensions,
        weight: dto.weight,
        status: dto.status || 'active',
        isFeatured: dto.is_featured || false,
        isNew: dto.is_new || false,
        isBestseller: dto.is_bestseller || false,
      });

      // Generate slug
      product.productSlug = product.generateSlug();

      // Validate product
      const errors = product.validate();
      if (errors.length > 0) {
        logger.error('❌ [CreateProduct] Validation errors:', errors);
        throw new Error('Validation failed: ' + errors.join(', '));
      }
      
      logger.info('✅ [CreateProduct] Product validation passed');


      // Add images if provided - group all images into one row
      if (dto.images && dto.images.length > 0) {
        const imageUrls = dto.images.map(img => img.image_url);
        
        // Generate alt_text from product name if not provided
        const altText = dto.images[0]?.alt_text || dto.product_name;
        
        // Create single image row with main image + alt images
        // IMPORTANT: DO NOT pass imageId - let database auto-generate it
        product.images = [
          new ProductImage({
            productId: 0, // Will be set after product creation
            imageUrl: imageUrls[0], // Primary image
            altText: altText, // Use product name if alt_text not provided
            isPrimary: true,
            sortOrder: 0, // Explicitly set to 0
            altImg1: imageUrls[1] || undefined, // Second image
            altImg2: imageUrls[2] || undefined, // Third image
            altImg3: imageUrls[3] || undefined, // Fourth image
            // imageId is NOT included - will be auto-generated by database
          })
        ];
      }

      // Create product
      const createdProduct = await this.productRepo.create(product);

      // Log action
      await this.logAction(adminId, 'CREATE', {
        product_id: createdProduct.productId,
        product_name: createdProduct.productName,
      });

      console.log('✅✅✅ Product created in DB, converting to response...');
      const response = await this.toProductResponse(createdProduct);
      console.log('✅✅✅ [Service] CREATE PRODUCT SUCCESS ✅✅✅');
      return response;
    } catch (error: any) {
      console.error('❌❌❌ [Service] CREATE PRODUCT FAILED ❌❌❌');
      console.error('Service Error:', error);
      console.error('Service Error message:', error.message);
      console.error('Service Error stack:', error.stack);
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: number,
    dto: UpdateProductDTO,
    adminId: number
  ): Promise<ProductResponseDTO> {
    try {
      console.log('🔄 [UpdateProduct] Starting update for product ID:', productId);
      console.log('🔄 [UpdateProduct] DTO:', JSON.stringify(dto, null, 2));
      
      // Check if product exists
      const existingProduct = await this.productRepo.findById(
        productId.toString()
      );
      if (!existingProduct) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Validate category if changed
      if (dto.category_id) {
        const category = await this.categoryRepo.findById(
          dto.category_id.toString()
        );
        if (!category) {
          throw new Error('Danh mục không tồn tại');
        }
      }

      // Handle image updates - delete old images from Storage if new images are provided
      if (dto.images && dto.images.length > 0) {
        console.log('🖼️ [UpdateProduct] New images provided, cleaning up old images...');
        
        // Get existing images from database
        const existingImages = await this.imageRepo.findByProductId(productId);
        console.log(`🖼️ [UpdateProduct] Found ${existingImages.length} existing image records`);
        
        // Delete old images from Storage and database
        for (const img of existingImages) {
          console.log(`🗑️ [UpdateProduct] Deleting old image: ${img.imageUrl}`);
          
          // Extract and delete from Storage
          const storagePath = this.extractStoragePath(img.imageUrl);
          if (storagePath) {
            const { error: storageError } = await supabaseAdmin.storage
              .from('product-img')
              .remove([storagePath]);
            
            if (storageError) {
              logger.warn(`⚠️ Failed to delete from Storage: ${storagePath}`, storageError);
            } else {
              console.log(`✅ Deleted from Storage: ${storagePath}`);
            }
          }
          
          // Delete alt images if they exist
          if (img.altImg1) {
            const altPath1 = this.extractStoragePath(img.altImg1);
            if (altPath1) {
              await supabaseAdmin.storage.from('product-img').remove([altPath1]);
              console.log(`✅ Deleted alt_img1 from Storage: ${altPath1}`);
            }
          }
          if (img.altImg2) {
            const altPath2 = this.extractStoragePath(img.altImg2);
            if (altPath2) {
              await supabaseAdmin.storage.from('product-img').remove([altPath2]);
              console.log(`✅ Deleted alt_img2 from Storage: ${altPath2}`);
            }
          }
          if (img.altImg3) {
            const altPath3 = this.extractStoragePath(img.altImg3);
            if (altPath3) {
              await supabaseAdmin.storage.from('product-img').remove([altPath3]);
              console.log(`✅ Deleted alt_img3 from Storage: ${altPath3}`);
            }
          }
        }
        
        // Delete old image records from database
        await this.imageRepo.deleteByProductId(productId);
        console.log('✅ [UpdateProduct] Deleted old image records from database');
        
        // Create new image record (single row with 4 image URLs)
        const imageUrls = dto.images.map(img => img.image_url);
        const altText = dto.images[0]?.alt_text || dto.product_name || existingProduct.productName;
        
        const newImage = new ProductImage({
          productId: productId,
          imageUrl: imageUrls[0], // Primary image
          altText: altText,
          isPrimary: true,
          sortOrder: 0, // Explicitly set to 0
          altImg1: imageUrls[1] || undefined,
          altImg2: imageUrls[2] || undefined,
          altImg3: imageUrls[3] || undefined,
        });
        
        await this.imageRepo.create(newImage);
        console.log('✅ [UpdateProduct] Created new image record with all 4 images in one row');
      }

      // Update product entity
      const productUpdate: Partial<AdminProduct> = {};
      
      if (dto.product_name !== undefined) {
        productUpdate.productName = dto.product_name;
        // Regenerate slug if name changed
        const tempProduct = new AdminProduct({ productName: dto.product_name });
        productUpdate.productSlug = tempProduct.generateSlug();
      }
      if (dto.category_id !== undefined)
        productUpdate.categoryId = dto.category_id;
      if (dto.description !== undefined)
        productUpdate.description = dto.description;
      if (dto.short_description !== undefined)
        productUpdate.shortDescription = dto.short_description;
      if (dto.price !== undefined) productUpdate.price = dto.price;
      if (dto.sale_price !== undefined) productUpdate.salePrice = dto.sale_price;
      if (dto.stock_quantity !== undefined)
        productUpdate.stockQuantity = dto.stock_quantity;
      if (dto.min_stock_level !== undefined)
        productUpdate.minStockLevel = dto.min_stock_level;
      if (dto.piece_count !== undefined)
        productUpdate.pieceCount = dto.piece_count;
      if (dto.difficulty_level !== undefined)
        productUpdate.difficultyLevel = dto.difficulty_level;
      if (dto.dimensions !== undefined)
        productUpdate.dimensions = dto.dimensions;
      if (dto.weight !== undefined) productUpdate.weight = dto.weight;
      if (dto.status !== undefined) productUpdate.status = dto.status;
      if (dto.is_featured !== undefined)
        productUpdate.isFeatured = dto.is_featured;
      if (dto.is_new !== undefined) productUpdate.isNew = dto.is_new;
      if (dto.is_bestseller !== undefined)
        productUpdate.isBestseller = dto.is_bestseller;

      // Update product
      const updatedProduct = await this.productRepo.update(
        productId.toString(),
        productUpdate
      );

      console.log('✅ [UpdateProduct] Product updated successfully');

      // Log action
      await this.logAction(adminId, 'UPDATE', {
        product_id: productId,
        changes: dto,
      });

      return await this.toProductResponse(updatedProduct);
    } catch (error) {
      console.error('❌ [UpdateProduct] Error:', error);
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: number, adminId: number): Promise<void> {
    try {
      // Check if product exists
      const product = await this.productRepo.findById(productId.toString());
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Check if product has active orders
      const hasActiveOrders = await this.productRepo.hasActiveOrders(productId);
      if (hasActiveOrders) {
        throw new Error(
          'Không thể xóa sản phẩm đang có trong đơn hàng chưa hoàn thành. Vui lòng xử lý các đơn hàng trước.'
        );
      }

      // Delete product
      await this.productRepo.delete(productId.toString());

      // Log action
      await this.logAction(adminId, 'DELETE', {
        product_id: productId,
        product_name: product.productName,
      });
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(
    dto: UpdateProductStockDTO,
    adminId: number
  ): Promise<void> {
    try {
      // Check if product exists
      const product = await this.productRepo.findById(
        dto.product_id.toString()
      );
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Update stock
      await this.productRepo.updateStock(dto.product_id, dto.stock_quantity);

      // Log action
      await this.logAction(adminId, 'UPDATE', {
        product_id: dto.product_id,
        old_stock: product.stockQuantity,
        new_stock: dto.stock_quantity,
        reason: dto.reason,
      });
    } catch (error) {
      logger.error('Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    dto: UpdateProductStatusDTO,
    adminId: number
  ): Promise<void> {
    try {
      // Check if product exists
      const product = await this.productRepo.findById(
        dto.product_id.toString()
      );
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Update status
      await this.productRepo.updateStatus(dto.product_id, dto.status);

      // Log action
      await this.logAction(adminId, 'UPDATE', {
        product_id: dto.product_id,
        old_status: product.status,
        new_status: dto.status,
        reason: dto.reason,
      });
    } catch (error) {
      logger.error('Error updating product status:', error);
      throw error;
    }
  }

  /**
   * Get products needing restock
   */
  async getProductsNeedingRestock(): Promise<ProductResponseDTO[]> {
    try {
      const products = await this.productRepo.findNeedingRestock();

      return await Promise.all(
        products.map((product) => this.toProductResponse(product))
      );
    } catch (error) {
      logger.error('Error getting products needing restock:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: number): Promise<CategoryResponseDTO | null> {
    try {
      const category = await this.categoryRepo.findById(categoryId.toString());
      if (!category) {
        return null;
      }

      return await this.toCategoryResponse(category);
    } catch (error) {
      logger.error('Error getting category by ID:', error);
      return null;
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<CategoryResponseDTO[]> {
    try {
      const categories = await this.categoryRepo.findAll();

      return await Promise.all(
        categories.map((category) => this.toCategoryResponse(category))
      );
    } catch (error) {
      logger.error('Error getting all categories:', error);
      throw error;
    }
  }

  /**
   * Get active categories
   */
  async getActiveCategories(): Promise<CategoryResponseDTO[]> {
    try {
      const categories = await this.categoryRepo.findActive();

      return await Promise.all(
        categories.map((category) => this.toCategoryResponse(category))
      );
    } catch (error) {
      logger.error('Error getting active categories:', error);
      throw error;
    }
  }

  /**
   * Create category
   */
  async createCategory(
    dto: CreateCategoryDTO,
    adminId: number
  ): Promise<CategoryResponseDTO> {
    try {
      // Create category entity
      const category = new Category({
        categoryName: dto.category_name,
        description: dto.description,
        imageUrl: dto.image_url,
        parentCategoryId: dto.parent_category_id,
        sortOrder: dto.sort_order || 0,
        isActive: dto.is_active !== false,
      });

      // Generate slug
      category.categorySlug = category.categoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      // Create category
      const createdCategory = await this.categoryRepo.create(category);

      // Log action
      await this.logAction(adminId, 'CREATE', {
        category_id: createdCategory.categoryId,
        category_name: createdCategory.categoryName,
      });

      return await this.toCategoryResponse(createdCategory);
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: number,
    dto: UpdateCategoryDTO,
    adminId: number
  ): Promise<CategoryResponseDTO> {
    try {
      // Check if category exists
      const existingCategory = await this.categoryRepo.findById(
        categoryId.toString()
      );
      if (!existingCategory) {
        throw new Error('Danh mục không tồn tại');
      }

      // Update category
      const categoryUpdate: Partial<Category> = {};
      
      if (dto.category_name !== undefined) {
        categoryUpdate.categoryName = dto.category_name;
        // Regenerate slug
        categoryUpdate.categorySlug = dto.category_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      }
      if (dto.description !== undefined)
        categoryUpdate.description = dto.description;
      if (dto.image_url !== undefined) categoryUpdate.imageUrl = dto.image_url;
      if (dto.parent_category_id !== undefined)
        categoryUpdate.parentCategoryId = dto.parent_category_id;
      if (dto.sort_order !== undefined)
        categoryUpdate.sortOrder = dto.sort_order;
      if (dto.is_active !== undefined) categoryUpdate.isActive = dto.is_active;

      const updatedCategory = await this.categoryRepo.update(
        categoryId.toString(),
        categoryUpdate
      );

      // Log action
      await this.logAction(adminId, 'UPDATE', {
        category_id: categoryId,
        changes: dto,
      });

      return await this.toCategoryResponse(updatedCategory);
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: number, adminId: number): Promise<void> {
    try {
      // Check if category exists
      const category = await this.categoryRepo.findById(categoryId.toString());
      if (!category) {
        throw new Error('Danh mục không tồn tại');
      }

      // Check if category has products
      const hasProducts = await this.categoryRepo.hasProducts(categoryId);
      if (hasProducts) {
        throw new Error(
          'Không thể xóa danh mục đang có sản phẩm. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.'
        );
      }

      // Delete category
      await this.categoryRepo.delete(categoryId.toString());

      // Log action
      await this.logAction(adminId, 'DELETE', {
        category_id: categoryId,
        category_name: category.categoryName,
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Upload product image to Supabase Storage
   */
  async uploadProductImage(
    fileBuffer: Buffer, 
    fileType: string,
    categoryName?: string,
    productName?: string,
    imageIndex?: number
  ): Promise<string> {
    try {
      console.log(`🔥 ===== PRODUCT IMAGE UPLOAD STARTED =====`);
      console.log(`🔥 File type: ${fileType}`);
      console.log(`🔥 File size: ${fileBuffer.length} bytes`);
      console.log(`🔥 Category: ${categoryName || 'Unknown'}`);
      console.log(`🔥 Product: ${productName || 'Unknown'}`);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileType)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed.');
      }

      // Validate file size (max 5MB)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Generate file name with folder structure: category/product/image{index}.ext
      const fileExtension = fileType.split('/')[1];
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      
      // Sanitize product name for consistent folder structure
      // Keep categoryName AS-IS from controller (matches existing Storage folders)
      const sanitizeProductName = (name: string): string => {
        return name
          .trim()
          .replace(/\s+/g, ' '); // Normalize spaces only, keep original case and chars
      };
      
      // Create folder path: category/product/filename
      // categoryName from controller is the ORIGINAL name (e.g., "Train", "Fire Fighter")
      // This matches existing folder structure in Storage
      let folderPath = 'uncategorized';
      if (categoryName && productName) {
        const sanitizedProduct = sanitizeProductName(productName);
        folderPath = `${categoryName}/${sanitizedProduct}`;
        console.log(`📁 Folder structure: ${folderPath}`);
        console.log(`   ├─ Category (original): "${categoryName}"`);
        console.log(`   └─ Product (normalized): "${sanitizedProduct}"`);
      } else {
        console.warn('⚠️ Missing category or product name, using uncategorized folder');
        console.warn(`   categoryName: ${categoryName}, productName: ${productName}`);
      }
      
      const imageName = imageIndex !== undefined 
        ? `image${imageIndex}.${fileExtension}`
        : `${timestamp}_${randomStr}.${fileExtension}`;
        
      const fileName = `${folderPath}/${imageName}`;

      console.log(`📤 Uploading to: ${fileName}`);

      // Upload to Supabase Storage bucket 'product-img'
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('product-img')
        .upload(fileName, fileBuffer, {
          contentType: fileType,
          upsert: true // Allow overwrite if same name exists
        });

      if (uploadError) {
        console.error('❌ Supabase Storage upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL instead of signed URL for easier management
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('product-img')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;
      console.log('📸 Public image URL:', imageUrl);

      console.log(`🔥 ===== PRODUCT IMAGE UPLOAD COMPLETED =====\n`);
      return imageUrl;
    } catch (error: any) {
      console.error('❌ Error in uploadProductImage:', error);
      throw error;
    }
  }

  /**
   * Add images to product
   */
  async addProductImages(
    productId: number,
    images: Array<{
      image_url: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    }>,
    adminId: number
  ): Promise<void> {
    try {
      // Check if product exists
      const product = await this.productRepo.findById(productId.toString());
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Add images
      for (const img of images) {
        const image = new ProductImage({
          productId,
          imageUrl: img.image_url,
          altText: img.alt_text,
          isPrimary: img.is_primary || false,
          sortOrder: img.sort_order || 0,
        });

        await this.imageRepo.create(image);
      }

      // Log action
      await this.logAction(adminId, 'CREATE', {
        product_id: productId,
        image_count: images.length,
      });
    } catch (error) {
      logger.error('Error adding product images:', error);
      throw error;
    }
  }

  /**
   * Add or update product image (smart logic for 1 row with 4 columns)
   * - If imageIndex = 0: Create new row or update image_url
   * - If imageIndex = 1-3: Update alt_img1, alt_img2, alt_img3
   */
  /**
   * Delete old image from Storage BEFORE uploading new one
   * This prevents accidentally deleting the new image when filenames are same
   */
  async deleteOldImageBeforeUpload(productId: number, imageIndex: number): Promise<void> {
    try {
      // Get existing image row for this product
      const existingImages = await this.imageRepo.findByProductId(productId);
      
      if (existingImages.length === 0) {
        console.log('ℹ️ No existing images to delete');
        return;
      }

      const existingImage = existingImages[0];
      let oldImageUrl: string | undefined;
      
      if (imageIndex === 0) {
        oldImageUrl = existingImage.imageUrl;
      } else if (imageIndex === 1) {
        oldImageUrl = existingImage.altImg1 || undefined;
      } else if (imageIndex === 2) {
        oldImageUrl = existingImage.altImg2 || undefined;
      } else if (imageIndex === 3) {
        oldImageUrl = existingImage.altImg3 || undefined;
      }
      
      // Delete old image from Storage if exists
      if (oldImageUrl) {
        try {
          console.log(`🗑️ [PRE-UPLOAD] Deleting old image from Storage: ${oldImageUrl}`);
          await this.deleteImageFromStorage(oldImageUrl);
          console.log('✅ [PRE-UPLOAD] Old image deleted from Storage');
          
          // IMPORTANT: Also remove the URL from database (set to NULL)
          console.log(`🗑️ [PRE-UPLOAD] Removing image URL from database at index ${imageIndex}`);
          
          if (imageIndex === 0) {
            // Cannot set image_url to NULL (it's NOT NULL constraint)
            console.log('⚠️ Cannot set image_url to NULL (NOT NULL constraint)');
          } else {
            // Use Supabase directly to set NULL value
            const columnName = imageIndex === 1 ? 'alt_img1' 
                             : imageIndex === 2 ? 'alt_img2' 
                             : 'alt_img3';
            
            const { error } = await supabaseAdmin
              .from('product_images')
              .update({ [columnName]: null })
              .eq('image_id', existingImage.imageId);
            
            if (error) {
              console.error(`❌ Failed to set ${columnName} to NULL:`, error);
            } else {
              console.log(`✅ [PRE-UPLOAD] Set ${columnName} to NULL in database`);
            }
          }
        } catch (error) {
          console.error('⚠️ [PRE-UPLOAD] Failed to delete old image from Storage:', error);
          // Continue anyway - we still want to upload new image
        }
      } else {
        console.log(`ℹ️ [PRE-UPLOAD] No old image to delete at index ${imageIndex} (column was empty)`);
      }
    } catch (error) {
      logger.error('Error in deleteOldImageBeforeUpload:', error);
      // Don't throw - we still want to continue with upload
    }
  }

  async addOrUpdateProductImage(
    productId: number,
    imageUrl: string,
    imageIndex: number,
    productName: string,
    adminId: number
  ): Promise<void> {
    try {
      console.log(`🖼️ [Service] addOrUpdateProductImage - Product: ${productId}, Index: ${imageIndex}`);
      
      // Check if product exists
      const product = await this.productRepo.findById(productId.toString());
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      // Get existing image row for this product
      const existingImages = await this.imageRepo.findByProductId(productId);
      console.log(`📊 Found ${existingImages.length} existing image rows`);

      if (existingImages.length === 0) {
        // No image row exists - create new one
        console.log('✨ Creating new image row');
        
        // IMPORTANT: image_url (primary image) is required (NOT NULL in database)
        // If uploading non-primary image first (index 1-3), use it as primary temporarily
        const newImage = new ProductImage({
          productId,
          imageUrl: imageUrl, // Always use the uploaded image as primary
          altText: productName,
          isPrimary: true,
          sortOrder: 0,
          // Only set alt_imgX if this is NOT the primary image
          // This avoids duplication: if index=1, image goes to both image_url AND alt_img1
          altImg1: imageIndex === 1 ? imageUrl : undefined,
          altImg2: imageIndex === 2 ? imageUrl : undefined,
          altImg3: imageIndex === 3 ? imageUrl : undefined,
        });
        
        if (imageIndex !== 0) {
          console.log(`⚠️ Creating row with image at index ${imageIndex} (also set as primary)`);
        }
        
        await this.imageRepo.create(newImage);
        console.log(`✅ Created new image row`);
      } else {
        // Image row exists - update the appropriate column
        const existingImage = existingImages[0]; // Take first row
        console.log(`🔄 Updating existing image row ID: ${existingImage.imageId}`);
        
        // NOTE: Old image has been deleted in deleteOldImageBeforeUpload()
        // No need to delete here to avoid deleting the new image
        
        const updateData: Partial<ProductImage> = {};
        
        if (imageIndex === 0) {
          updateData.imageUrl = imageUrl;
          console.log('  - Updating image_url (main image)');
        } else if (imageIndex === 1) {
          updateData.altImg1 = imageUrl;
          console.log('  - Updating alt_img1');
        } else if (imageIndex === 2) {
          updateData.altImg2 = imageUrl;
          console.log('  - Updating alt_img2');
        } else if (imageIndex === 3) {
          updateData.altImg3 = imageUrl;
          console.log('  - Updating alt_img3');
        }
        
        // Also update alt_text if it's empty
        if (!existingImage.altText) {
          updateData.altText = productName;
        }
        
        await this.imageRepo.update(existingImage.imageId!.toString(), updateData);
        console.log('✅ Updated existing image row with new URL');
      }

      // Log action
      await this.logAction(adminId, 'UPDATE', {
        product_id: productId,
        image_index: imageIndex,
        image_url: imageUrl,
      });
      
      console.log(`✅ [Service] Image ${imageIndex} processed successfully`);
    } catch (error) {
      console.error('❌ [Service] Error in addOrUpdateProductImage:', error);
      logger.error('Error adding/updating product image:', error);
      throw error;
    }
  }

  /**
   * Delete product image
   */
  async deleteProductImage(imageId: number, adminId: number): Promise<void> {
    try {
      // Step 1: Get image record to find the Storage path
      const image = await this.imageRepo.findById(imageId.toString());
      
      if (!image) {
        throw new Error('Image not found');
      }

      logger.info(`🗑️ Deleting image ID ${imageId}: ${image.imageUrl}`);

      // Step 2: Extract Storage path from image URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/product-img/Category/Product/image.webp
      // Extract: Category/Product/image.webp
      const storagePath = this.extractStoragePath(image.imageUrl);

      if (storagePath) {
        // Step 3: Delete from Supabase Storage
        logger.info(`🗑️ Deleting from Storage: ${storagePath}`);
        const { error: storageError } = await supabaseAdmin.storage
          .from('product-img')
          .remove([storagePath]);

        if (storageError) {
          logger.error('❌ Failed to delete from Storage:', storageError);
          // Continue anyway to clean up DB record
        } else {
          logger.info('✅ Deleted from Storage successfully');
        }
      } else {
        logger.warn('⚠️ Could not extract storage path from URL:', image.imageUrl);
      }

      // Step 4: Delete from database
      await this.imageRepo.delete(imageId.toString());
      logger.info('✅ Deleted from database successfully');

      // Log action
      await this.logAction(adminId, 'DELETE', {
        image_id: imageId,
        image_url: image.imageUrl,
      });
    } catch (error) {
      logger.error('Error deleting product image:', error);
      throw error;
    }
  }

  /**
   * Delete image from Supabase Storage by URL
   * Helper method to delete old images when updating
   */
  private async deleteImageFromStorage(imageUrl: string): Promise<void> {
    try {
      // Extract Storage path from URL
      const storagePath = this.extractStoragePath(imageUrl);
      
      if (!storagePath) {
        logger.warn('⚠️ Could not extract storage path from URL:', imageUrl);
        return;
      }

      console.log(`🗑️ Deleting from Storage: ${storagePath}`);
      
      const { error: storageError } = await supabaseAdmin.storage
        .from('product-img')
        .remove([storagePath]);

      if (storageError) {
        logger.error('❌ Failed to delete from Storage:', storageError);
        throw storageError;
      }
      
      console.log('✅ Deleted from Storage successfully');
    } catch (error) {
      logger.error('Error deleting image from storage:', error);
      throw error;
    }
  }

  /**
   * Extract storage path from Supabase public URL
   * Example: https://xxx.supabase.co/storage/v1/object/public/product-img/Train/Product/image.webp
   * Returns: Train/Product/image.webp (decoded)
   */
  private extractStoragePath(url: string): string | null {
    try {
      const match = url.match(/\/product-img\/(.+)$/);
      if (!match) return null;
      
      // IMPORTANT: Decode URL to handle spaces and special characters
      // URL in DB: "Hospital/LEGO%20Emergency%20Ambulance/image0.webp"
      // Storage expects: "Hospital/LEGO Emergency Ambulance/image0.webp"
      const encodedPath = match[1];
      const decodedPath = decodeURIComponent(encodedPath);
      
      console.log(`🔍 [extractStoragePath] Encoded: ${encodedPath}`);
      console.log(`🔍 [extractStoragePath] Decoded: ${decodedPath}`);
      
      return decodedPath;
    } catch (error) {
      logger.error('Error extracting storage path:', error);
      return null;
    }
  }

  /**
   * Add cache-busting query parameter to image URL
   * Forces browser to reload image when it changes
   */
  private addCacheBuster(imageUrl: string, timestamp: number): string {
    if (!imageUrl) return imageUrl;
    
    // Check if URL already has query params
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}v=${timestamp}`;
  }

  /**
   * Convert product entity to response DTO
   */
  private async toProductResponse(
    product: AdminProduct
  ): Promise<ProductResponseDTO> {
    const hasActiveOrders = await this.productRepo.hasActiveOrders(
      product.productId!
    );

    return {
      product_id: product.productId!,
      product_name: product.productName,
      product_slug: product.productSlug,
      category_id: product.categoryId,
      category_name: product.category?.categoryName,
      description: product.description,
      short_description: product.shortDescription,
      price: product.price,
      sale_price: product.salePrice,
      stock_quantity: product.stockQuantity,
      min_stock_level: product.minStockLevel,
      piece_count: product.pieceCount,
      difficulty_level: product.difficultyLevel,
      dimensions: product.dimensions,
      weight: product.weight,
      status: product.status,
      is_featured: product.isFeatured,
      is_new: product.isNew,
      is_bestseller: product.isBestseller,
      rating_average: product.ratingAverage,
      rating_count: product.ratingCount,
      sold_count: product.soldCount,
      images: product.images?.map((img) => ({
        image_id: img.imageId!,
        image_url: img.imageUrl,
        alt_text: img.altText,
        is_primary: img.isPrimary,
        sort_order: img.sortOrder,
      })),
      created_at: product.createdAt?.toISOString(),
      updated_at: product.updatedAt?.toISOString(),
      needs_restock: product.needsRestock(),
      has_active_orders: hasActiveOrders,
    };
  }

  /**
   * Convert category entity to response DTO
   */
  private async toCategoryResponse(
    category: Category
  ): Promise<CategoryResponseDTO> {
    const productCount = await this.categoryRepo.getProductCount(
      category.categoryId!
    );

    return {
      category_id: category.categoryId!,
      category_name: category.categoryName,
      category_slug: category.categorySlug,
      description: category.description,
      image_url: category.imageUrl,
      parent_category_id: category.parentCategoryId,
      sort_order: category.sortOrder,
      is_active: category.isActive,
      product_count: productCount,
      created_at: category.createdAt?.toISOString(),
    };
  }

  /**
   * Log admin action
   */
  private async logAction(
    adminId: number,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<void> {
    try {
      await supabaseAdmin.from('admin_audit_logs').insert([
        {
          admin_id: adminId,
          action: actionType,
          target_type: 'product',
          target_id: payload.product_id?.toString() || payload.category_id?.toString(),
          payload,
        },
      ]);
    } catch (error) {
      logger.error('Error logging admin action:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Calculate sold counts for products
   * Only count orders with status "Đã giao" (delivered), exclude "Đã trả" (returned)
   */
  private async calculateSoldCounts(productIds: number[]): Promise<Record<number, number>> {
    try {
      if (productIds.length === 0) return {};

      // Get all order_items for these products
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('order_id, product_id, quantity')
        .in('product_id', productIds);

      if (itemsError) {
        logger.error('Error fetching order_items:', itemsError);
        return {};
      }

      if (!orderItems || orderItems.length === 0) return {};

      // Get unique order IDs
      const orderIds = [...new Set(orderItems.map(item => item.order_id))];

      // Get order status history to find delivered and returned orders
      const { data: statusHistory, error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .select('order_id, new_status')
        .in('order_id', orderIds)
        .in('new_status', ['Đã giao', 'Đã trả']);

      if (historyError) {
        logger.error('Error fetching order_status_history:', historyError);
        return {};
      }

      // Build a map of order statuses
      // Priority: if "Đã trả" exists, exclude the order
      const orderStatusMap: Record<number, string> = {};
      (statusHistory || []).forEach((history: any) => {
        const orderId = history.order_id;
        const status = history.new_status;
        
        // If already marked as returned, keep it
        if (orderStatusMap[orderId] === 'Đã trả') return;
        
        // Update status
        if (status === 'Đã trả') {
          orderStatusMap[orderId] = 'Đã trả';
        } else if (status === 'Đã giao' && !orderStatusMap[orderId]) {
          orderStatusMap[orderId] = 'Đã giao';
        }
      });

      // Calculate sold count per product
      const soldCounts: Record<number, number> = {};
      orderItems.forEach((item: any) => {
        const orderId = item.order_id;
        const productId = item.product_id;
        const quantity = item.quantity;

        // Only count if order status is "Đã giao" and NOT "Đã trả"
        if (orderStatusMap[orderId] === 'Đã giao') {
          soldCounts[productId] = (soldCounts[productId] || 0) + quantity;
        }
      });

      logger.info('📊 Calculated sold counts:', soldCounts);
      return soldCounts;

    } catch (error) {
      logger.error('❌ Error calculating sold counts:', error);
      return {};
    }
  }
}

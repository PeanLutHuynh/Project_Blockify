import { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';
import { AdminProductService } from '../application/AdminProductService';
import { AdminRequest } from '../infrastructure/middleware/AdminAuthMiddleware';
import { logger } from '../../../config/logger';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductSearchQueryDTO,
  UpdateProductStockDTO,
  UpdateProductStatusDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../application/dto/AdminProductDTO';

/**
 * Admin Product Controller - Presentation Layer
 * Handles HTTP requests for admin product management
 */
export class AdminProductController {
  private productService: AdminProductService;

  constructor() {
    this.productService = new AdminProductService();
  }

  /**
   * Helper: Send success response
   */
  private sendSuccess(res: HttpResponse, message: string, data?: any): void {
    res.json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Helper: Send error response
   */
  private sendError(res: HttpResponse, code: number, message: string): void {
    res.status(code).json({
      success: false,
      error: message,
    });
  }

  /**
   * Helper: Get admin ID from authenticated user
   */
  private async getAdminId(req: AdminRequest): Promise<number | null> {
    const user = (req as any).user;
    const authUid = user?.id || user?.userId || user?.user_id;
    
    if (!authUid) {
      logger.error('No auth UID found in request');
      return null;
    }

    // Import dynamically to avoid circular dependency
    const { supabaseAdmin } = await import('../../../config/database');
    
    const { data: adminData, error } = await supabaseAdmin
      .from('admin_users')
      .select('admin_id')
      .eq('auth_uid', authUid)
      .single();

    if (error || !adminData) {
      logger.error('Failed to get admin_id from auth_uid:', error);
      return null;
    }

    return adminData.admin_id;
  }

  /**
   * GET /api/admin/products/search
   * Search products
   */
  async searchProducts(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const query: ProductSearchQueryDTO = {
        query: req.query.q as string,
        category_id: req.query.category_id
          ? parseInt(req.query.category_id as string)
          : undefined,
        status: req.query.status as string,
        min_price: req.query.min_price
          ? parseFloat(req.query.min_price as string)
          : undefined,
        max_price: req.query.max_price
          ? parseFloat(req.query.max_price as string)
          : undefined,
        in_stock: req.query.in_stock === 'true',
        is_featured: req.query.is_featured === 'true',
        is_new: req.query.is_new === 'true',
        is_bestseller: req.query.is_bestseller === 'true',
      };

      const products = await this.productService.searchProducts(query);

      this.sendSuccess(res, 'Products retrieved successfully', {
        products,
        count: products.length,
      });
    } catch (error: any) {
      logger.error('Search products error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * GET /api/admin/products
   * Get all products with pagination
   */
  async getAllProducts(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const query: ProductSearchQueryDTO = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        category_id: req.query.category_id
          ? parseInt(req.query.category_id as string)
          : undefined,
        status: req.query.status as string,
        in_stock: req.query.in_stock === 'true',
        is_featured: req.query.is_featured === 'true',
        is_new: req.query.is_new === 'true',
        is_bestseller: req.query.is_bestseller === 'true',
      };

      const result = await this.productService.getAllProducts(query);

      this.sendSuccess(res, 'Products retrieved successfully', result);
    } catch (error: any) {
      logger.error('Get all products error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * GET /api/admin/products/:id
   * Get product by ID
   */
  async getProductById(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      const product = await this.productService.getProductById(id);

      if (!product) {
        this.sendError(res, 404, 'Product not found');
        return;
      }

      this.sendSuccess(res, 'Product retrieved successfully', product);
    } catch (error: any) {
      logger.error('Get product by ID error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * POST /api/admin/products
   * Create new product
   */
  async createProduct(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const body = req.body as CreateProductDTO;

      // Validate required fields
      if (!body.product_name || !body.category_id || !body.price) {
        this.sendError(res, 400, 'Missing required fields');
        return;
      }

      const product = await this.productService.createProduct(
        body,
        adminId
      );

      this.sendSuccess(res, 'Product created successfully', product);
    } catch (error: any) {
      logger.error('Create product error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * PUT /api/admin/products/:id
   * Update product
   */
  async updateProduct(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      const body = req.body as UpdateProductDTO;

      const product = await this.productService.updateProduct(
        id,
        body,
        adminId
      );

      this.sendSuccess(res, 'Product updated successfully', product);
    } catch (error: any) {
      logger.error('Update product error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * DELETE /api/admin/products/:id
   * Delete product
   */
  async deleteProduct(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      await this.productService.deleteProduct(id, adminId);

      this.sendSuccess(res, 'Product deleted successfully');
    } catch (error: any) {
      logger.error('Delete product error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * PATCH /api/admin/products/:id/stock
   * Update product stock
   */
  async updateStock(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      const body = req.body as { stock_quantity: number; reason?: string };

      if (body.stock_quantity === undefined || body.stock_quantity < 0) {
        this.sendError(res, 400, 'Invalid stock quantity');
        return;
      }

      const dto: UpdateProductStockDTO = {
        product_id: id,
        stock_quantity: body.stock_quantity,
        reason: body.reason,
      };

      await this.productService.updateProductStock(dto, adminId);

      this.sendSuccess(res, 'Stock updated successfully');
    } catch (error: any) {
      logger.error('Update stock error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * PATCH /api/admin/products/:id/status
   * Update product status
   */
  async updateStatus(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      const body = req.body as { status: string; reason?: string };

      if (!body.status) {
        this.sendError(res, 400, 'Status is required');
        return;
      }

      const dto: UpdateProductStatusDTO = {
        product_id: id,
        status: body.status,
        reason: body.reason,
      };

      await this.productService.updateProductStatus(dto, adminId);

      this.sendSuccess(res, 'Status updated successfully');
    } catch (error: any) {
      logger.error('Update status error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * GET /api/admin/products/restock/needed
   * Get products needing restock
   */
  async getProductsNeedingRestock(
    req: AdminRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const products = await this.productService.getProductsNeedingRestock();

      this.sendSuccess(res, 'Products retrieved successfully', {
        products,
        count: products.length,
      });
    } catch (error: any) {
      logger.error('Get products needing restock error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * GET /api/admin/categories
   * Get all categories
   */
  async getAllCategories(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const categories = await this.productService.getAllCategories();

      this.sendSuccess(res, 'Categories retrieved successfully', {
        categories,
        count: categories.length,
      });
    } catch (error: any) {
      logger.error('Get all categories error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * GET /api/admin/categories/active
   * Get active categories
   */
  async getActiveCategories(
    req: AdminRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const categories = await this.productService.getActiveCategories();

      this.sendSuccess(res, 'Active categories retrieved successfully', {
        categories,
        count: categories.length,
      });
    } catch (error: any) {
      logger.error('Get active categories error:', error);
      this.sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * POST /api/admin/categories
   * Create new category
   */
  async createCategory(req: AdminRequest, res: HttpResponse): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const body = req.body as CreateCategoryDTO;

      if (!body.category_name) {
        this.sendError(res, 400, 'Category name is required');
        return;
      }

      const category = await this.productService.createCategory(
        body,
        adminId
      );

      this.sendSuccess(res, 'Category created successfully', category);
    } catch (error: any) {
      logger.error('Create category error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * PUT /api/admin/categories/:id
   * Update category
   */
  async updateCategory(
    req: AdminRequest,
    res: HttpResponse,
    categoryId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(categoryId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid category ID');
        return;
      }

      const body = req.body as UpdateCategoryDTO;

      const category = await this.productService.updateCategory(
        id,
        body,
        adminId
      );

      this.sendSuccess(res, 'Category updated successfully', category);
    } catch (error: any) {
      logger.error('Update category error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * DELETE /api/admin/categories/:id
   * Delete category
   */
  async deleteCategory(
    req: AdminRequest,
    res: HttpResponse,
    categoryId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(categoryId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid category ID');
        return;
      }

      await this.productService.deleteCategory(id, adminId);

      this.sendSuccess(res, 'Category deleted successfully');
    } catch (error: any) {
      logger.error('Delete category error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * POST /api/admin/products/upload-image
   * Upload product image to Supabase Storage
   */
  async uploadProductImage(
    req: AdminRequest,
    res: HttpResponse,
    fileData: { buffer: Buffer; mimetype: string; filename: string; size: number }
  ): Promise<void> {
    try {
      console.log('📤 [Controller] uploadProductImage CALLED');
      console.log('  - File:', fileData.filename);
      console.log('  - Type:', fileData.mimetype);
      console.log('  - Size:', fileData.size);

      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileData.mimetype)) {
        this.sendError(res, 400, 'Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed');
        return;
      }

      // Validate file size (max 5MB)
      if (fileData.size > 5 * 1024 * 1024) {
        this.sendError(res, 400, 'File size exceeds 5MB limit');
        return;
      }

      // Get optional metadata from request body (sent via FormData)
      const categoryName = req.body?.categoryName || req.body?.category_name;
      const productName = req.body?.productName || req.body?.product_name;
      const imageIndex = req.body?.imageIndex || req.body?.image_index;

      console.log('📋 Upload metadata:', { categoryName, productName, imageIndex });

      // Upload to Supabase Storage
      const imageUrl = await this.productService.uploadProductImage(
        fileData.buffer,
        fileData.mimetype,
        categoryName,
        productName,
        imageIndex ? parseInt(imageIndex) : undefined
      );

      console.log('✅ Image uploaded:', imageUrl);

      this.sendSuccess(res, 'Image uploaded successfully', { imageUrl });
    } catch (error: any) {
      logger.error('Upload product image error:', error);
      this.sendError(res, 500, error.message || 'Failed to upload image');
    }
  }

  /**
   * POST /api/admin/products/:id/images
   * Add images to product
   */
  async addProductImages(
    req: AdminRequest,
    res: HttpResponse,
    productId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(productId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid product ID');
        return;
      }

      const body = req.body as { images: Array<any> };

      if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
        this.sendError(res, 400, 'Images array is required');
        return;
      }

      await this.productService.addProductImages(
        id,
        body.images,
        adminId
      );

      this.sendSuccess(res, 'Images added successfully');
    } catch (error: any) {
      logger.error('Add product images error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }

  /**
   * DELETE /api/admin/products/images/:id
   * Delete product image
   */
  async deleteProductImage(
    req: AdminRequest,
    res: HttpResponse,
    imageId: string
  ): Promise<void> {
    try {
      const adminId = await this.getAdminId(req);
      if (!adminId) {
        this.sendError(res, 401, 'Unauthorized');
        return;
      }

      const id = parseInt(imageId);
      if (isNaN(id)) {
        this.sendError(res, 400, 'Invalid image ID');
        return;
      }

      await this.productService.deleteProductImage(id, adminId);

      this.sendSuccess(res, 'Image deleted successfully');
    } catch (error: any) {
      logger.error('Delete product image error:', error);
      this.sendError(res, 400, error.message || 'Bad request');
    }
  }
}

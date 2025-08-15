import { Request, Response } from 'express';
import { ProductModel } from '../models/Product';
import { AuthRequest, ApiResponse, PaginationParams } from '../types/API';
import { ProductFilters, CreateProductRequest, UpdateProductRequest } from '../types/Product';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

const productModel = new ProductModel();

export class ProductController {
  /**
   * Get all products with filtering and pagination
   */
  public getProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search, 
      minPrice, 
      maxPrice,
      ageRange,
      difficulty,
      inStock,
      featured
    } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const filters: ProductFilters = {
      category: category as string,
      search: search as string,
      priceRange: {
        min: minPrice ? parseFloat(minPrice as string) : undefined,
        max: maxPrice ? parseFloat(maxPrice as string) : undefined
      },
      ageRange: ageRange as string,
      difficulty: difficulty as string,
      inStock: inStock === 'true',
      featured: featured === 'true'
    };

    const result = await productModel.getProducts(filters, pagination);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Get product by ID
   */
  public getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    const product = await productModel.getProductById(id);
    
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: product
    };

    res.json(response);
  });

  /**
   * Get featured products
   */
  public getFeaturedProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit = 8 } = req.query;
    
    const products = await productModel.getFeaturedProducts(parseInt(limit as string));

    const response: ApiResponse = {
      success: true,
      data: products
    };

    res.json(response);
  });

  /**
   * Search products
   */
  public searchProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q: query, page = 1, limit = 12 } = req.query;

    if (!query) {
      throw new AppError('Search query is required', 400);
    }

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await productModel.searchProducts(query as string, pagination);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Get products by category
   */
  public getProductsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await productModel.getProductsByCategory(categoryId, pagination);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
    };

    res.json(response);
  });

  /**
   * Create new product (Admin only)
   */
  public createProduct = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const productData: CreateProductRequest = req.body;

    const product = await productModel.createProduct(productData);

    const response: ApiResponse = {
      success: true,
      message: 'Product created successfully',
      data: product
    };

    res.status(201).json(response);
  });

  /**
   * Update product (Admin only)
   */
  public updateProduct = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData: UpdateProductRequest = req.body;

    const product = await productModel.update(id, updateData);

    const response: ApiResponse = {
      success: true,
      message: 'Product updated successfully',
      data: product
    };

    res.json(response);
  });

  /**
   * Delete product (Admin only)
   */
  public deleteProduct = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    await productModel.update(id, { is_active: false });

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully'
    };

    res.json(response);
  });

  /**
   * Get low stock products (Admin only)
   */
  public getLowStockProducts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const products = await productModel.getLowStockProducts();

    const response: ApiResponse = {
      success: true,
      data: products
    };

    res.json(response);
  });

  /**
   * Update product stock (Admin only)
   */
  public updateStock = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      throw new AppError('Stock must be a non-negative number', 400);
    }

    await productModel.updateStock(id, stock);

    const response: ApiResponse = {
      success: true,
      message: 'Stock updated successfully'
    };

    res.json(response);
  });
}
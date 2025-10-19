import { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';
import { ProductService } from '../application/ProductService';
import { logger } from '../../../config/logger';

/**
 * Product Controller - Presentation layer
 * Handles HTTP requests for product operations
 */
export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * UC3 - Thanh tìm kiếm
   * GET /api/v1/products/search?q=keyword
   * 
   * @description Tìm kiếm sản phẩm theo từ khóa
   */
  searchProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const query = req.query.q as string;
      const category = req.query.category as string;

      // LUỒNG THAY THẾ A1: Từ khóa rỗng
      if (!query || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập từ khóa',
          results: []
        });
        return;
      }

      // Validate query length
      if (query.length < 2) {
        res.status(400).json({
          success: false,
          message: 'Từ khóa phải có ít nhất 2 ký tự',
          results: []
        });
        return;
      }

      // LUỒNG CHÍNH Bước 3: Hệ thống truy vấn dữ liệu
      const results = await this.productService.searchProducts({
        query,
        category,
        limit: 20
      });

      // LUỒNG THAY THẾ A2: Không tìm thấy kết quả
      if (results.length === 0) {
        res.json({
          success: true,
          message: 'Không có kết quả phù hợp',
          results: []
        });
        return;
      }

      // LUỒNG CHÍNH Bước 4: Hiển thị kết quả
      res.json({
        success: true,
        message: `Tìm thấy ${results.length} sản phẩm`,
        results,
        count: results.length
      });

    } catch (error) {
      // LUỒNG THAY THẾ A3: Lỗi hệ thống
      logger.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra, vui lòng thử lại sau',
        results: []
      });
    }
  };

  /**
   * GET /api/v1/products/suggestions?q=keyword
   * 
   * @description Lấy gợi ý sản phẩm cho autocomplete (giới hạn 5 kết quả)
   */
  getSuggestions = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const query = req.query.q as string;

      // Return empty if query is too short
      if (!query || query.length < 2) {
        res.json({ 
          success: true,
          results: [] 
        });
        return;
      }

      // Get suggestions (limited to 5 results)
      const results = await this.productService.getSuggestions(query, 5);

      res.json({
        success: true,
        results
      });

    } catch (error) {
      logger.error('Suggestions error:', error);
      res.json({ 
        success: true,
        results: [] 
      });
    }
  };

  /**
   * GET /api/v1/products/category/:category
   * 
   * @description Lấy sản phẩm theo danh mục
   */
  getProductsByCategory = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const category = req.params.category;

      if (!category) {
        res.status(400).json({
          success: false,
          message: 'Category is required'
        });
        return;
      }

      const results = await this.productService.getProductsByCategory(category);

      res.json({
        success: true,
        results,
        count: results.length
      });

    } catch (error) {
      logger.error('Get products by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };

  /**
   * GET /api/v1/products
   * 
   * @description Lấy sản phẩm với pagination và category filter
   */
  getAllProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const result = await this.productService.getProducts(categoryId, page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        data: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0
        }
      });
    }
  };

  /**
   * GET /api/v1/products/:id
   * 
   * @description Lấy chi tiết sản phẩm
   */
  getProductById = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const id = req.params.id;

      const product = await this.productService.getProductById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  };

  /**
   * GET /api/v1/products/slug/:slug
   * 
   * @description Lấy chi tiết sản phẩm theo slug (for product detail page)
   */
  getProductBySlug = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const slug = req.params.slug;

      if (!slug) {
        res.status(400).json({
          success: false,
          message: 'Slug is required'
        });
        return;
      }

      const product = await this.productService.getProductBySlug(slug);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Get product by slug error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra'
      });
    }
  };
}

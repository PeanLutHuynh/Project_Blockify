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
   * @description Lấy sản phẩm với pagination, filters và sorting
   * Query params:
   * - categoryId: Filter by category
   * - page: Page number
   * - limit: Number of products per page
   * - featured: If 'true', only return products with is_featured = TRUE
   * - difficulty_level: Filter by difficulty (Easy, Medium, Hard, Expert)
   * - price_range: Filter by price range (0-500000, 500000-1000000, 1000000+)
   * - sortBy: Sort field (price, name, created_at)
   * - sortOrder: Sort order (asc, desc)
   */
  getAllProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
      const onlyFeatured = req.query.featured === 'true';
      
      // ✅ New filter parameters
      const difficultyLevel = req.query.difficulty_level as string | undefined;
      const priceRange = req.query.price_range as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      // If only featured products requested, use getFeaturedProducts
      if (onlyFeatured) {
        const featuredProducts = await this.productService.getFeaturedProducts(limit, true);
        res.json({
          success: true,
          data: featuredProducts,
          message: `Tìm thấy ${featuredProducts.length} sản phẩm nổi bật`
        });
        return;
      }

      // ✅ Use enhanced getProducts with filters
      const result = await this.productService.getProducts(
        categoryId, 
        page, 
        limit,
        {
          difficultyLevel,
          priceRange,
          sortBy,
          sortOrder
        }
      );

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

  /**
   * ✅ GET /api/v1/products/recommendations/user/:userId
   * 
   * @description Get recommended products based on user's purchase history
   * For HomePage - recommends products from categories user has bought before
   */
  getRecommendedProductsForUser = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const results = await this.productService.getRecommendedProductsForUser(userId, limit);

      res.json({
        success: true,
        results,
        count: results.length,
        message: `Gợi ý ${results.length} sản phẩm dựa trên lịch sử mua hàng`
      });

    } catch (error) {
      logger.error('Get recommended products for user error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };

  /**
   * ✅ GET /api/v1/products/recommendations/similar/:productId
   * 
   * @description Get recommended products based on current product (same category)
   * For ProductDetail page - recommends similar products from same category
   */
  getRecommendedProductsByProduct = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const productId = parseInt(req.params.productId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;

      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
        return;
      }

      const results = await this.productService.getRecommendedProductsByCategory(productId, limit);

      res.json({
        success: true,
        results,
        count: results.length,
        message: `Gợi ý ${results.length} sản phẩm tương tự`
      });

    } catch (error) {
      logger.error('Get recommended products by product error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };

  /**
   * ✅ GET /api/v1/products/best-selling?limit=8
   * 
   * @description Get best-selling products (most purchased from delivered orders)
   * For HomePage default display when user not logged in or no purchase history
   */
  getBestSellingProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;

      const results = await this.productService.getBestSellingProducts(limit);

      res.json({
        success: true,
        results,
        count: results.length,
        message: `Top ${results.length} sản phẩm bán chạy nhất`
      });

    } catch (error) {
      logger.error('Get best-selling products error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };

  /**
   * POST /api/products/check-stock
   * 
   * @description Check stock availability for multiple products
   * Used by cart to validate stock before checkout
   */
  checkStock = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const { productIds } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Product IDs are required'
        });
        return;
      }

      // Get products by IDs
      const products = await this.productService.getProductsByIds(productIds);

      res.json({
        success: true,
        data: {
          products: products.map((p: any) => ({
            id: p.product_id || p.id,
            name: p.product_name || p.name,
            price: p.price,
            stock: p.stock_quantity || p.stock,
            available: (p.stock_quantity || p.stock || 0) > 0,
            image: p.image || p.product_images?.[0]?.image_url || '/public/images/placeholder.jpg'
          }))
        }
      });

    } catch (error) {
      logger.error('Check stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi kiểm tra tồn kho'
      });
    }
  };

  /**
   * GET /api/v1/products/new?limit=12
   * 
   * @description Get new products (is_new = true)
   * For "Mới nhất" filter on homepage
   */
  getNewProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const results = await this.productService.getNewProducts(limit);

      res.json({
        success: true,
        results,
        count: results.length,
        message: `Tìm thấy ${results.length} sản phẩm mới nhất`
      });

    } catch (error) {
      logger.error('Get new products error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };

  /**
   * GET /api/v1/products/bestseller?limit=12
   * 
   * @description Get bestseller products (is_bestseller = true)
   * For "Phổ biến" filter on homepage
   */
  getBestsellerProducts = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const results = await this.productService.getBestsellerProducts(limit);

      res.json({
        success: true,
        results,
        count: results.length,
        message: `Tìm thấy ${results.length} sản phẩm phổ biến`
      });

    } catch (error) {
      logger.error('Get bestseller products error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra',
        results: []
      });
    }
  };
}

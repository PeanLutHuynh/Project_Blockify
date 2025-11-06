import { Router } from '../../../infrastructure/http/Router';
import { ProductController } from './ProductController';

/**
 * Product Routes
 * Define all product-related API endpoints
 */
export function createProductRoutes(): Router {
  const router = new Router();
  const controller = new ProductController();

  // Get all/featured products (must be before /:id route)
  // GET /api/v1/products?limit=10&featured=true
  router.get('/', controller.getAllProducts);

  // Check stock for multiple products
  // POST /api/products/check-stock
  router.post('/check-stock', controller.checkStock);

  // UC3 - Thanh tìm kiếm
  // GET /api/v1/products/search?q=keyword
  router.get('/search', controller.searchProducts);

  // Autocomplete suggestions
  // GET /api/v1/products/suggestions?q=keyword
  router.get('/suggestions', controller.getSuggestions);

  // ✅ FILTER ROUTES (must be before /:id)
  // Get new products (is_new = true) for "Mới nhất" filter
  // GET /api/v1/products/new?limit=12
  router.get('/new', controller.getNewProducts);

  // Get bestseller products (is_bestseller = true) for "Phổ biến" filter
  // GET /api/v1/products/bestseller?limit=12
  router.get('/bestseller', controller.getBestsellerProducts);

  // ✅ RECOMMENDATION ROUTES (must be before /:id)
  // Get best-selling products (most purchased from delivered orders)
  // GET /api/v1/products/best-selling?limit=8
  router.get('/best-selling', controller.getBestSellingProducts);

  // Get recommended products for user (based on purchase history)
  // GET /api/v1/products/recommendations/user/:userId?limit=8
  router.get('/recommendations/user/:userId', controller.getRecommendedProductsForUser);

  // Get recommended products similar to current product (same category)
  // GET /api/v1/products/recommendations/similar/:productId?limit=6
  router.get('/recommendations/similar/:productId', controller.getRecommendedProductsByProduct);

  // Get product by slug (must be before /:id)
  // GET /api/v1/products/slug/:slug
  router.get('/slug/:slug', controller.getProductBySlug);

  // Get products by category
  // GET /api/v1/products/category/:category
  router.get('/category/:category', controller.getProductsByCategory);

  // Get product by ID
  // GET /api/v1/products/:id
  router.get('/:id', controller.getProductById);

  return router;
}

export const productRoutes = createProductRoutes();

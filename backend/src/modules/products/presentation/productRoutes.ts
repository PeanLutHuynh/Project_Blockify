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

  // UC3 - Thanh tìm kiếm
  // GET /api/v1/products/search?q=keyword
  router.get('/search', controller.searchProducts);

  // Autocomplete suggestions
  // GET /api/v1/products/suggestions?q=keyword
  router.get('/suggestions', controller.getSuggestions);

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

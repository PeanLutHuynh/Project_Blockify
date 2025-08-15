import express from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticate, authorize } from '../middlewares/auth';
import { 
  validateCreateProduct, 
  validatePagination, 
  validateUUIDParam 
} from '../middlewares/validation';

const router = express.Router();
const productController = new ProductController();

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering and pagination
 * @access  Public
 */
router.get('/', validatePagination, productController.getProducts);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', productController.getFeaturedProducts);

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', validatePagination, productController.searchProducts);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get low stock products
 * @access  Private (Admin)
 */
router.get('/low-stock', 
  authenticate, 
  authorize('admin', 'manager'), 
  productController.getLowStockProducts
);

/**
 * @route   GET /api/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:categoryId', 
  validateUUIDParam('categoryId'),
  validatePagination,
  productController.getProductsByCategory
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', validateUUIDParam(), productController.getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin)
 */
router.post('/', 
  authenticate, 
  authorize('admin', 'manager'), 
  validateCreateProduct,
  productController.createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin)
 */
router.put('/:id', 
  authenticate, 
  authorize('admin', 'manager'), 
  validateUUIDParam(),
  productController.updateProduct
);

/**
 * @route   PUT /api/products/:id/stock
 * @desc    Update product stock
 * @access  Private (Admin)
 */
router.put('/:id/stock', 
  authenticate, 
  authorize('admin', 'manager'), 
  validateUUIDParam(),
  productController.updateStock
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  validateUUIDParam(),
  productController.deleteProduct
);

export default router;
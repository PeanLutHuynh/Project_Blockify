import express from 'express';
import { CategoryModel } from '../models/Category';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateCategory, validateUUIDParam } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types/API';

const router = express.Router();
const categoryModel = new CategoryModel();

/**
 * @route   GET /api/categories
 * @desc    Get all categories with hierarchy
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const categories = await categoryModel.getAllCategories();

  const response: ApiResponse = {
    success: true,
    data: categories
  };

  res.json(response);
}));

/**
 * @route   GET /api/categories/root
 * @desc    Get root categories (no parent)
 * @access  Public
 */
router.get('/root', asyncHandler(async (req, res) => {
  const categories = await categoryModel.getRootCategories();

  const response: ApiResponse = {
    success: true,
    data: categories
  };

  res.json(response);
}));

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', validateUUIDParam(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await categoryModel.findById(id);

  const response: ApiResponse = {
    success: true,
    data: category
  };

  res.json(response);
}));

/**
 * @route   GET /api/categories/:id/subcategories
 * @desc    Get subcategories of a category
 * @access  Public
 */
router.get('/:id/subcategories', validateUUIDParam(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subcategories = await categoryModel.getSubcategories(id);

  const response: ApiResponse = {
    success: true,
    data: subcategories
  };

  res.json(response);
}));

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
router.post('/', 
  authenticate, 
  authorize('admin', 'manager'),
  validateCreateCategory,
  asyncHandler(async (req, res) => {
    const category = await categoryModel.createCategory(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Category created successfully',
      data: category
    };

    res.status(201).json(response);
  })
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin)
 */
router.put('/:id', 
  authenticate, 
  authorize('admin', 'manager'),
  validateUUIDParam(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await categoryModel.update(id, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Category updated successfully',
      data: category
    };

    res.json(response);
  })
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  validateUUIDParam(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await categoryModel.update(id, { is_active: false });

    const response: ApiResponse = {
      success: true,
      message: 'Category deleted successfully'
    };

    res.json(response);
  })
);

export default router;
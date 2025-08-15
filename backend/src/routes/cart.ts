import express from 'express';
import { CartModel } from '../models/Cart';
import { authenticate } from '../middlewares/auth';
import { validateAddToCart, validateUUIDParam } from '../middlewares/validation';
import { asyncHandler, AppError } from '../middlewares/errorHandler';
import { AuthRequest, ApiResponse } from '../types/API';

const router = express.Router();
const cartModel = new CartModel();

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const cart = await cartModel.getUserCart(userId);

  const response: ApiResponse = {
    success: true,
    data: cart
  };

  res.json(response);
}));

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/add', 
  authenticate, 
  validateAddToCart,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { product_id, quantity } = req.body;

    const cartItem = await cartModel.addToCart(userId, product_id, quantity);

    const response: ApiResponse = {
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    };

    res.status(201).json(response);
  })
);

/**
 * @route   PUT /api/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/update', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { item_id, quantity } = req.body;

  if (!item_id || typeof quantity !== 'number') {
    throw new AppError('Item ID and quantity are required', 400);
  }

  try {
    const cartItem = await cartModel.updateCartItemQuantity(item_id, quantity);

    const response: ApiResponse = {
      success: true,
      message: 'Cart updated successfully',
      data: cartItem
    };

    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Item removed from cart') {
      const response: ApiResponse = {
        success: true,
        message: 'Item removed from cart'
      };
      res.json(response);
    } else {
      throw error;
    }
  }
}));

/**
 * @route   DELETE /api/cart/remove/:itemId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/remove/:itemId', 
  authenticate,
  validateUUIDParam('itemId'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { itemId } = req.params;

    await cartModel.removeFromCart(itemId);

    const response: ApiResponse = {
      success: true,
      message: 'Item removed from cart successfully'
    };

    res.json(response);
  })
);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/clear', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  await cartModel.clearCart(userId);

  const response: ApiResponse = {
    success: true,
    message: 'Cart cleared successfully'
  };

  res.json(response);
}));

/**
 * @route   GET /api/cart/count
 * @desc    Get cart item count
 * @access  Private
 */
router.get('/count', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const count = await cartModel.getCartItemCount(userId);

  const response: ApiResponse = {
    success: true,
    data: { count }
  };

  res.json(response);
}));

export default router;
import express from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest, ApiResponse } from '../types/API';

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin)
 */
router.get('/dashboard', 
  authenticate, 
  authorize('admin', 'manager'),
  asyncHandler(async (req: AuthRequest, res) => {
    // TODO: Implement admin dashboard
    const response: ApiResponse = {
      success: true,
      data: {
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0
      },
      message: 'Admin dashboard feature coming soon'
    };

    res.json(response);
  })
);

export default router;
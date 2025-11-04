/**
 * AdminUserController - Presentation Layer
 * Controller quản lý users cho admin
 */

import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AdminUserService } from "../application/AdminUserService";

export class AdminUserController {
  private adminUserService: AdminUserService;

  constructor() {
    this.adminUserService = new AdminUserService();
  }

  /**
   * Lấy danh sách users
   * GET /api/admin/users
   */
  public getUsers = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const search = req.query?.search as string;
      const status = req.query?.status as 'active' | 'inactive' | undefined;
      const limit = req.query?.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

      const result = await this.adminUserService.getAllUsers({
        search,
        status,
        limit,
        offset
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ERROR',
            message: result.message
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message || 'Lỗi server'
        }
      });
    }
  };

  /**
   * Lấy chi tiết user
   * GET /api/admin/users/:userId
   */
  public getUserById = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const userId = parseInt(req.params?.userId || '0');

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'User ID không hợp lệ'
          }
        });
        return;
      }

      const result = await this.adminUserService.getUserById(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.message
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message || 'Lỗi server'
        }
      });
    }
  };

  /**
   * Kích hoạt/khóa user
   * PATCH /api/admin/users/:userId/status
   */
  public toggleUserStatus = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const userId = parseInt(req.params?.userId || '0');
      const { is_active } = req.body as { is_active: boolean };

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'User ID không hợp lệ'
          }
        });
        return;
      }

      if (typeof is_active !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Trạng thái không hợp lệ'
          }
        });
        return;
      }

      const result = await this.adminUserService.toggleUserStatus(userId, is_active);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ERROR',
            message: result.message
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message || 'Lỗi server'
        }
      });
    }
  };

  /**
   * Cập nhật thông tin user
   * PUT /api/admin/users/:userId
   */
  public updateUser = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const userId = parseInt(req.params?.userId || '0');
      const { full_name, phone, gender, birth_date } = req.body as {
        full_name?: string;
        phone?: string;
        gender?: 'male' | 'female' | null;
        birth_date?: string | null;
      };

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'User ID không hợp lệ'
          }
        });
        return;
      }

      const result = await this.adminUserService.updateUser(userId, {
        full_name,
        phone,
        gender,
        birth_date
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ERROR',
            message: result.message
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message || 'Lỗi server'
        }
      });
    }
  };

  /**
   * Lấy thống kê users
   * GET /api/admin/users/statistics
   */
  public getUserStatistics = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const result = await this.adminUserService.getUserStatistics();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ERROR',
            message: result.message
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ERROR',
          message: error.message || 'Lỗi server'
        }
      });
    }
  };
}

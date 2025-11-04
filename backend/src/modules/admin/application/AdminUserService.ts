/**
 * AdminUserService - Application Service
 * Quản lý users cho admin
 */

import { supabaseAdmin } from "../../../config/database";
import { logger } from "../../../config/logger";

export class AdminUserService {
  /**
   * Lấy danh sách tất cả users với tìm kiếm và lọc
   */
  async getAllUsers(filters?: {
    search?: string;
    status?: 'active' | 'inactive';
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabaseAdmin
        .from('users')
        .select('user_id, username, email, full_name, phone, gender, birth_date, avatar_url, is_active, created_at, updated_at', { count: 'exact' });

      // Tìm kiếm theo tên
      if (filters?.search) {
        query = query.ilike('full_name', `%${filters.search}%`);
      }

      // Lọc theo trạng thái
      if (filters?.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Sắp xếp theo tên (alphabet)
      query = query.order('full_name', { ascending: true });

      // Pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching users:', error);
        return {
          success: false,
          message: 'Không thể tải danh sách người dùng',
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          users: data || [],
          total: count || 0
        },
        message: 'Lấy danh sách người dùng thành công'
      };
    } catch (error: any) {
      logger.error('Exception in getAllUsers:', error);
      return {
        success: false,
        message: error.message || 'Lỗi server'
      };
    }
  }

  /**
   * Lấy chi tiết một user
   */
  async getUserById(userId: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('Error fetching user:', error);
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          error: error.message
        };
      }

      return {
        success: true,
        data: data,
        message: 'Lấy thông tin người dùng thành công'
      };
    } catch (error: any) {
      logger.error('Exception in getUserById:', error);
      return {
        success: false,
        message: error.message || 'Lỗi server'
      };
    }
  }

  /**
   * Kích hoạt/khóa tài khoản user
   */
  async toggleUserStatus(userId: number, isActive: boolean) {
    try {
      // Cập nhật is_active
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user status:', error);
        return {
          success: false,
          message: 'Không thể cập nhật trạng thái người dùng',
          error: error.message
        };
      }

      logger.info(`User ${userId} status changed to ${isActive ? 'active' : 'inactive'}`);

      return {
        success: true,
        data: data,
        message: isActive ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản'
      };
    } catch (error: any) {
      logger.error('Exception in toggleUserStatus:', error);
      return {
        success: false,
        message: error.message || 'Lỗi server'
      };
    }
  }

  /**
   * Cập nhật thông tin user
   */
  async updateUser(userId: number, updateData: {
    full_name?: string;
    phone?: string;
    gender?: 'male' | 'female' | null;
    birth_date?: string | null;
  }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user:', error);
        return {
          success: false,
          message: 'Không thể cập nhật thông tin người dùng',
          error: error.message
        };
      }

      logger.info(`User ${userId} information updated`);

      return {
        success: true,
        data: data,
        message: 'Cập nhật thông tin thành công'
      };
    } catch (error: any) {
      logger.error('Exception in updateUser:', error);
      return {
        success: false,
        message: error.message || 'Lỗi server'
      };
    }
  }

  /**
   * Lấy thống kê users
   */
  async getUserStatistics() {
    try {
      const { count: totalUsers } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: inactiveUsers } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      return {
        success: true,
        data: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          inactive: inactiveUsers || 0
        },
        message: 'Lấy thống kê thành công'
      };
    } catch (error: any) {
      logger.error('Exception in getUserStatistics:', error);
      return {
        success: false,
        message: error.message || 'Lỗi server'
      };
    }
  }
}

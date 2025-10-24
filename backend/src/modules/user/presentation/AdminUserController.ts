/**
 * AdminUserController - Admin-only endpoints for user management
 * Presentation Layer
 */

import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { UserProfileService } from "../application/UserProfileService";
import { SearchUsersCommand } from "../application/dto/UserProfileDTO";
import { supabaseAdmin } from "../../../config/database";

export class AdminUserController {
  constructor(private readonly userProfileService: UserProfileService) {}

  private sendSuccess(
    res: HttpResponse,
    statusCode: number,
    data: any,
    message: string
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  private sendError(
    res: HttpResponse,
    statusCode: number,
    message: string,
    errors?: any
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Check if user has admin role
   */
  private isAdmin(req: HttpRequest): boolean {
    const user = (req as any).user;
    return user?.role === 'admin';
  }

  /**
   * Log admin action to audit log
   */
  private async logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    details?: any
  ): Promise<void> {
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: parseInt(adminId),
        action,
        target_user_id: targetUserId ? parseInt(targetUserId) : null,
        details,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw - logging failure shouldn't block the request
    }
  }

  /**
   * GET /api/v1/admin/users/search
   * Search users with filters and pagination
   * Query params: q (search term), page, limit, filter
   */
  public searchUsers = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      // Authorization check
      if (!this.isAdmin(req)) {
        this.sendError(res, 403, 'Forbidden: Admin access required');
        return;
      }

      const query = req.query as any;
      const searchTerm = query.q || '';
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;
      const filter = query.filter;

      const command = new SearchUsersCommand(searchTerm, page, limit, filter);

      const result = await this.userProfileService.searchUsers(command);

      if (result.success) {
        // Log admin action
        const adminId = (req as any).user?.userId?.toString() || 
                       (req as any).user?.user_id?.toString() || 
                       (req as any).user?.id?.toString();
        
        if (adminId) {
          await this.logAdminAction(
            adminId,
            'SEARCH_USERS',
            undefined,
            { searchTerm, page, limit, filter }
          );
        }

        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      console.error('Error in searchUsers:', error);
      this.sendError(res, 500, error.message || 'Failed to search users');
    }
  };

  /**
   * GET /api/v1/admin/users/:userId
   * Get full user profile with addresses (Admin view)
   */
  public getUserProfile = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      // Authorization check
      if (!this.isAdmin(req)) {
        this.sendError(res, 403, 'Forbidden: Admin access required');
        return;
      }

      const { userId } = req.params as any;

      const result = await this.userProfileService.getFullUserProfile(userId);

      if (result.success) {
        // Log admin action
        const adminId = (req as any).user?.userId?.toString() || 
                       (req as any).user?.user_id?.toString() || 
                       (req as any).user?.id?.toString();
        
        if (adminId) {
          await this.logAdminAction(
            adminId,
            'VIEW_USER_PROFILE',
            userId,
            { viewedAt: new Date().toISOString() }
          );
        }

        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 404, result.message);
      }
    } catch (error: any) {
      console.error('Error in getUserProfile:', error);
      this.sendError(res, 500, error.message || 'Failed to get user profile');
    }
  };

  /**
   * PUT /api/v1/admin/users/:userId/suspend
   * Suspend a user (Admin only)
   */
  public suspendUser = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      // Authorization check
      if (!this.isAdmin(req)) {
        this.sendError(res, 403, 'Forbidden: Admin access required');
        return;
      }

      const { userId } = req.params as any;
      const { reason } = req.body as any;

      // Update user status in database
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', parseInt(userId))
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log admin action
      const adminId = (req as any).user?.userId?.toString() || 
                     (req as any).user?.user_id?.toString() || 
                     (req as any).user?.id?.toString();
      
      if (adminId) {
        await this.logAdminAction(
          adminId,
          'SUSPEND_USER',
          userId,
          { reason, suspendedAt: new Date().toISOString() }
        );
      }

      this.sendSuccess(res, 200, data, 'User suspended successfully');
    } catch (error: any) {
      console.error('Error in suspendUser:', error);
      this.sendError(res, 500, error.message || 'Failed to suspend user');
    }
  };

  /**
   * PUT /api/v1/admin/users/:userId/activate
   * Activate a suspended user (Admin only)
   */
  public activateUser = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      // Authorization check
      if (!this.isAdmin(req)) {
        this.sendError(res, 403, 'Forbidden: Admin access required');
        return;
      }

      const { userId } = req.params as any;

      // Update user status in database
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', parseInt(userId))
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log admin action
      const adminId = (req as any).user?.userId?.toString() || 
                     (req as any).user?.user_id?.toString() || 
                     (req as any).user?.id?.toString();
      
      if (adminId) {
        await this.logAdminAction(
          adminId,
          'ACTIVATE_USER',
          userId,
          { activatedAt: new Date().toISOString() }
        );
      }

      this.sendSuccess(res, 200, data, 'User activated successfully');
    } catch (error: any) {
      console.error('Error in activateUser:', error);
      this.sendError(res, 500, error.message || 'Failed to activate user');
    }
  };
}

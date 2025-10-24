/**
 * UserProfileController - Presentation Layer
 * Handles HTTP requests for user profile management
 * Following Clean Architecture
 */

import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { UserProfileService } from "../application/UserProfileService";
import {
  UpdateProfileCommand,
  AddAddressCommand,
  UpdateAddressCommand
} from "../application/dto/UserProfileDTO";

export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  /**
   * Helper to get userId from authenticated request
   */
  private getUserId(req: HttpRequest): string | null {
    const user = (req as any).user;
    if (!user) return null;
    
    // Support both userId (number) and user_id (string)
    return user.userId?.toString() || user.user_id?.toString() || user.id?.toString() || null;
  }

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
   * GET /api/v1/users/:userId/profile
   * Get user profile
   */
  public getProfile = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId } = req.params as any;
      const requestingUserId = this.getUserId(req);

      // Authorization: User can only view their own profile (unless admin)
      const userRole = (req as any).user?.role;
      if (userId !== requestingUserId && userRole !== 'admin') {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const result = await this.userProfileService.getUserProfile(userId);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 404, result.message, result.errors);
      }
    } catch (error: any) {
      console.error('Error in getProfile:', error);
      this.sendError(res, 500, error.message || 'Failed to get profile');
    }
  };

  /**
   * PUT /api/v1/users/:userId/profile
   * Update user profile
   */
  public updateProfile = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId } = req.params as any;
      const requestingUserId = this.getUserId(req);
      const body = req.body as any;

      // Authorization: User can only update their own profile
      if (userId !== requestingUserId) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      // Parse birth date if provided
      let birthDate: Date | undefined;
      if (body.birthDate) {
        birthDate = new Date(body.birthDate);
      }

      const command = new UpdateProfileCommand(
        userId,
        body.fullName,
        body.phone,
        body.gender,
        birthDate,
        body.avatarUrl
      );

      const result = await this.userProfileService.updateProfile(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      console.error('Error in updateProfile:', error);
      this.sendError(res, 500, error.message || 'Failed to update profile');
    }
  };

  /**
   * GET /api/v1/users/:userId/addresses
   * Get user addresses
   */
  public getAddresses = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId } = req.params as any;
      const requestingUserId = this.getUserId(req);
      const userRole = (req as any).user?.role;

      console.log('🔍 getAddresses - userId from params:', userId, 'type:', typeof userId);
      console.log('🔍 getAddresses - requestingUserId:', requestingUserId, 'type:', typeof requestingUserId);
      console.log('🔍 getAddresses - userRole:', userRole);

      // Authorization: Convert both to string for comparison
      const userIdStr = userId?.toString();
      const requestingUserIdStr = requestingUserId?.toString();

      if (userIdStr !== requestingUserIdStr && userRole !== 'admin') {
        console.error('❌ Authorization failed - userId mismatch:', userIdStr, 'vs', requestingUserIdStr);
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const result = await this.userProfileService.getUserAddresses(userId);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 500, result.message);
      }
    } catch (error: any) {
      console.error('Error in getAddresses:', error);
      this.sendError(res, 500, error.message || 'Failed to get addresses');
    }
  };

  /**
   * POST /api/v1/users/:userId/addresses
   * Add new address
   */
  public addAddress = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId } = req.params as any;
      const requestingUserId = this.getUserId(req);
      const body = req.body as any;

      // Authorization: Convert both to string for comparison
      const userIdStr = userId?.toString();
      const requestingUserIdStr = requestingUserId?.toString();

      if (userIdStr !== requestingUserIdStr) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const command = new AddAddressCommand(
        userId,
        body.addressName,
        body.fullAddress,
        body.city,
        body.district,
        body.ward,
        body.postalCode,
        body.isDefault || false
      );

      const result = await this.userProfileService.addAddress(command);

      if (result.success) {
        this.sendSuccess(res, 201, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      console.error('Error in addAddress:', error);
      this.sendError(res, 500, error.message || 'Failed to add address');
    }
  };

  /**
   * PUT /api/v1/users/:userId/addresses/:addressId
   * Update address
   */
  public updateAddress = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId, addressId } = req.params as any;
      const requestingUserId = this.getUserId(req);
      const body = req.body as any;

      // Authorization: Convert both to string for comparison
      const userIdStr = userId?.toString();
      const requestingUserIdStr = requestingUserId?.toString();

      if (userIdStr !== requestingUserIdStr) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const command = new UpdateAddressCommand(
        addressId,
        userId,
        body.addressName,
        body.fullAddress,
        body.city,
        body.district,
        body.ward,
        body.postalCode
      );

      const result = await this.userProfileService.updateAddress(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 404;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      console.error('Error in updateAddress:', error);
      this.sendError(res, 500, error.message || 'Failed to update address');
    }
  };

  /**
   * DELETE /api/v1/users/:userId/addresses/:addressId
   * Delete address
   */
  public deleteAddress = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId, addressId } = req.params as any;
      const requestingUserId = this.getUserId(req);

      // Authorization: Convert both to string for comparison
      const userIdStr = userId?.toString();
      const requestingUserIdStr = requestingUserId?.toString();

      if (userIdStr !== requestingUserIdStr) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const result = await this.userProfileService.deleteAddress(addressId, userId);

      if (result.success) {
        this.sendSuccess(res, 200, null, result.message);
      } else {
        this.sendError(res, 400, result.message);
      }
    } catch (error: any) {
      console.error('Error in deleteAddress:', error);
      this.sendError(res, 500, error.message || 'Failed to delete address');
    }
  };

  /**
   * PUT /api/v1/users/:userId/addresses/:addressId/default
   * Set address as default
   */
  public setDefaultAddress = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const { userId, addressId } = req.params as any;
      const requestingUserId = this.getUserId(req);

      // Authorization: Convert both to string for comparison
      const userIdStr = userId?.toString();
      const requestingUserIdStr = requestingUserId?.toString();

      if (userIdStr !== requestingUserIdStr) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      const result = await this.userProfileService.setDefaultAddress(addressId, userId);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 400, result.message);
      }
    } catch (error: any) {
      console.error('Error in setDefaultAddress:', error);
      this.sendError(res, 500, error.message || 'Failed to set default address');
    }
  };
}

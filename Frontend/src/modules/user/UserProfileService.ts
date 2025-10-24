/**
 * UserProfileService - Frontend API Client
 * Handles all user profile and address API calls
 */

import { httpClient } from '../../core/api/FetchHttpClient.js';

export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  address_id: number;
  user_id: number;
  address_name: string;
  full_address: string;
  city: string;
  district: string;
  ward: string;
  postal_code?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  avatarUrl?: string;
}

export interface AddAddressData {
  addressName: string;
  fullAddress: string;
  city: string;
  district: string;
  ward: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UpdateAddressData {
  addressName?: string;
  fullAddress?: string;
  city?: string;
  district?: string;
  ward?: string;
  postalCode?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface SearchUsersResponse {
  users: UserProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class UserProfileService {
  private baseUrl: string = '/api/v1/users';

  /**
   * Get user profile
   */
  async getUserProfile(userId: number): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await httpClient.get<any>(
        `${this.baseUrl}/${userId}/profile`
      );
      return response as ApiResponse<UserProfile>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: number,
    data: UpdateProfileData
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await httpClient.put<any>(
        `${this.baseUrl}/${userId}/profile`,
        data
      );
      return response as ApiResponse<UserProfile>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update profile',
        errors: error.errors,
      };
    }
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: number): Promise<ApiResponse<UserAddress[]>> {
    try {
      const response = await httpClient.get<any>(
        `${this.baseUrl}/${userId}/addresses`
      );
      return response as ApiResponse<UserAddress[]>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch addresses',
      };
    }
  }

  /**
   * Add new address
   */
  async addAddress(
    userId: number,
    data: AddAddressData
  ): Promise<ApiResponse<UserAddress>> {
    try {
      const response = await httpClient.post<any>(
        `${this.baseUrl}/${userId}/addresses`,
        data
      );
      return response as ApiResponse<UserAddress>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to add address',
        errors: error.errors,
      };
    }
  }

  /**
   * Update address
   */
  async updateAddress(
    userId: number,
    addressId: number,
    data: UpdateAddressData
  ): Promise<ApiResponse<UserAddress>> {
    try {
      const response = await httpClient.put<any>(
        `${this.baseUrl}/${userId}/addresses/${addressId}`,
        data
      );
      return response as ApiResponse<UserAddress>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update address',
        errors: error.errors,
      };
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(
    userId: number,
    addressId: number
  ): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<any>(
        `${this.baseUrl}/${userId}/addresses/${addressId}`
      );
      return response as ApiResponse;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete address',
      };
    }
  }

  /**
   * Set address as default
   */
  async setDefaultAddress(
    userId: number,
    addressId: number
  ): Promise<ApiResponse<UserAddress>> {
    try {
      const response = await httpClient.put<any>(
        `${this.baseUrl}/${userId}/addresses/${addressId}/default`,
        {}
      );
      return response as ApiResponse<UserAddress>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to set default address',
      };
    }
  }

  /**
   * ADMIN: Search users
   */
  async searchUsers(
    searchTerm: string = '',
    page: number = 1,
    limit: number = 20,
    filter?: string
  ): Promise<ApiResponse<SearchUsersResponse>> {
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter) {
        params.append('filter', filter);
      }

      const response = await httpClient.get<any>(
        `/api/v1/admin/users/search?${params.toString()}`
      );
      return response as ApiResponse<SearchUsersResponse>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to search users',
      };
    }
  }

  /**
   * ADMIN: Get full user profile with addresses
   */
  async getFullUserProfile(userId: number): Promise<ApiResponse<{
    user: UserProfile;
    addresses: UserAddress[];
  }>> {
    try {
      const response = await httpClient.get<any>(
        `/api/v1/admin/users/${userId}`
      );
      return response as ApiResponse<{ user: UserProfile; addresses: UserAddress[]; }>;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch user profile',
      };
    }
  }

  /**
   * ADMIN: Suspend user
   */
  async suspendUser(userId: number, reason: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.put<any>(
        `/api/v1/admin/users/${userId}/suspend`,
        { reason }
      );
      return response as ApiResponse;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to suspend user',
      };
    }
  }

  /**
   * ADMIN: Activate user
   */
  async activateUser(userId: number): Promise<ApiResponse> {
    try {
      const response = await httpClient.put<any>(
        `/api/v1/admin/users/${userId}/activate`,
        {}
      );
      return response as ApiResponse;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to activate user',
      };
    }
  }
}

export default new UserProfileService();

/**
 * UserProfileService - Application Layer
 * Handles user profile and address management business logic
 * Following Clean Architecture
 */

import { supabaseAdmin } from '../../../config/database';
import { User } from '../domain/User';
import { UserAddress } from '../domain/UserAddress';
import {
  UpdateProfileCommand,
  AddAddressCommand,
  UpdateAddressCommand,
  SearchUsersCommand,
  UserProfileResponse
} from './dto/UserProfileDTO';

export class UserProfileService {
  
  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Supabase error getting user:', error);
        return UserProfileResponse.failure('User not found');
      }

      if (!data) {
        return UserProfileResponse.failure('User not found');
      }

      return UserProfileResponse.success(data, 'User profile retrieved successfully');
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      return UserProfileResponse.failure(error.message || 'Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(command: UpdateProfileCommand): Promise<UserProfileResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return UserProfileResponse.failure('Validation failed', validationErrors);
      }

      // Build update object (only include defined fields)
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (command.fullName !== undefined) updateData.full_name = command.fullName;
      if (command.phone !== undefined) updateData.phone = command.phone;
      if (command.gender !== undefined) updateData.gender = command.gender.toLowerCase();
      if (command.birthDate !== undefined) updateData.birth_date = command.birthDate.toISOString().split('T')[0];
      if (command.avatarUrl !== undefined) updateData.avatar_url = command.avatarUrl;

      console.log('Updating user profile:', { userId: command.userId, updateData });

      // Update in database
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('user_id', command.userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return UserProfileResponse.failure(error.message || 'Failed to update profile');
      }

      return UserProfileResponse.success(data, 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return UserProfileResponse.failure(error.message || 'Failed to update profile');
    }
  }

  /**
   * Upload avatar to Supabase Storage and update user profile
   */
  async uploadAvatar(userId: string, fileBuffer: Buffer, fileType: string): Promise<UserProfileResponse> {
    try {
      console.log(`\n🔥 ===== AVATAR UPLOAD STARTED =====`);
      console.log(`🔥 User ID: ${userId}`);
      console.log(`🔥 File type: ${fileType}`);
      console.log(`🔥 File size: ${fileBuffer.length} bytes`);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileType)) {
        return UserProfileResponse.failure('Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed.');
      }

      // Validate file size (max 5MB)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return UserProfileResponse.failure('File size exceeds 5MB limit');
      }

      // Check if user has existing avatar in storage to delete later
      const { data: oldUserData } = await supabaseAdmin
        .from('users')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();
      
      console.log(`🔥 Old avatar URL: ${oldUserData?.avatar_url || 'None'}`);

      // Generate unique file name
      const fileExtension = fileType.split('/')[1];
      const fileName = `avatars/${userId}_${Date.now()}.${fileExtension}`;

      console.log(`📤 Uploading avatar for user ${userId}: ${fileName}`);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('user-avatars')
        .upload(fileName, fileBuffer, {
          contentType: fileType,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Supabase Storage upload error:', uploadError);
        return UserProfileResponse.failure(`Failed to upload avatar: ${uploadError.message}`);
      }

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;
      console.log('📸 Public avatar URL:', avatarUrl);

      // Update user profile with new avatar URL
      console.log(`🔥 Updating database for user ${userId} with new avatar URL...`);
      const { data: userData, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user avatar URL:', updateError);
        return UserProfileResponse.failure('Failed to update user avatar');
      }

      console.log('✅ Database updated successfully!');
      console.log(`🔥 New user data:`, JSON.stringify(userData, null, 2));

      // Delete old avatar from storage if it exists and is from Supabase
      if (oldUserData?.avatar_url && oldUserData.avatar_url.includes('user-avatars/avatars/')) {
        const oldFileName = oldUserData.avatar_url.split('user-avatars/')[1];
        console.log(`🗑️ Deleting old avatar: ${oldFileName}`);
        
        const { error: deleteError } = await supabaseAdmin.storage
          .from('user-avatars')
          .remove([oldFileName]);
        
        if (deleteError) {
          console.warn('⚠️ Could not delete old avatar:', deleteError);
        } else {
          console.log('✅ Old avatar deleted from storage');
        }
      }

      console.log(`🔥 ===== AVATAR UPLOAD COMPLETED =====\n`);
      return UserProfileResponse.success(userData, 'Avatar uploaded successfully');
    } catch (error: any) {
      console.error('❌ Error in uploadAvatar:', error);
      return UserProfileResponse.failure(error.message || 'Failed to upload avatar');
    }
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<UserProfileResponse> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error getting addresses:', error);
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success(data || [], 'Addresses retrieved successfully');
    } catch (error: any) {
      console.error('Error getting addresses:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * Add new address
   */
  async addAddress(command: AddAddressCommand): Promise<UserProfileResponse> {
    try {
      // Validate
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return UserProfileResponse.failure('Validation failed', validationErrors);
      }

      // If setting as default, unset other defaults first
      if (command.isDefault) {
        await supabaseAdmin
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', command.userId);
      }

      // Insert new address
      const { data, error } = await supabaseAdmin
        .from('user_addresses')
        .insert({
          user_id: command.userId,
          address_name: command.addressName,
          full_address: command.fullAddress,
          city: command.city,
          district: command.district,
          ward: command.ward,
          postal_code: command.postalCode || null,
          is_default: command.isDefault,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding address:', error);
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success(data, 'Address added successfully');
    } catch (error: any) {
      console.error('Error adding address:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * Update address
   */
  async updateAddress(command: UpdateAddressCommand): Promise<UserProfileResponse> {
    try {
      // Validate
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return UserProfileResponse.failure('Validation failed', validationErrors);
      }

      // Verify ownership
      const { data: existingAddress, error: fetchError } = await supabaseAdmin
        .from('user_addresses')
        .select('user_id')
        .eq('address_id', command.addressId)
        .single();

      if (fetchError || !existingAddress) {
        return UserProfileResponse.failure('Address not found');
      }

      if (existingAddress.user_id !== parseInt(command.userId)) {
        return UserProfileResponse.failure('Unauthorized to update this address');
      }

      // Build update object
      const updateData: any = {};
      if (command.addressName !== undefined) updateData.address_name = command.addressName;
      if (command.fullAddress !== undefined) updateData.full_address = command.fullAddress;
      if (command.city !== undefined) updateData.city = command.city;
      if (command.district !== undefined) updateData.district = command.district;
      if (command.ward !== undefined) updateData.ward = command.ward;
      if (command.postalCode !== undefined) updateData.postal_code = command.postalCode;

      // Update
      const { data, error } = await supabaseAdmin
        .from('user_addresses')
        .update(updateData)
        .eq('address_id', command.addressId)
        .select()
        .single();

      if (error) {
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success(data, 'Address updated successfully');
    } catch (error: any) {
      console.error('Error updating address:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: string, userId: string): Promise<UserProfileResponse> {
    try {
      // Verify ownership
      const { data: existingAddress, error: fetchError } = await supabaseAdmin
        .from('user_addresses')
        .select('user_id, is_default')
        .eq('address_id', addressId)
        .single();

      if (fetchError || !existingAddress) {
        return UserProfileResponse.failure('Address not found');
      }

      if (existingAddress.user_id !== parseInt(userId)) {
        return UserProfileResponse.failure('Unauthorized');
      }

      // Cannot delete default address if it's the only one
      if (existingAddress.is_default) {
        const { count } = await supabaseAdmin
          .from('user_addresses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count && count > 1) {
          return UserProfileResponse.failure('Cannot delete default address. Please set another address as default first.');
        }
      }

      // Delete
      const { error } = await supabaseAdmin
        .from('user_addresses')
        .delete()
        .eq('address_id', addressId);

      if (error) {
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success(null, 'Address deleted successfully');
    } catch (error: any) {
      console.error('Error deleting address:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * Set default address
   */
  async setDefaultAddress(addressId: string, userId: string): Promise<UserProfileResponse> {
    try {
      // Verify ownership
      const { data: existingAddress, error: fetchError } = await supabaseAdmin
        .from('user_addresses')
        .select('user_id')
        .eq('address_id', addressId)
        .single();

      if (fetchError || !existingAddress || existingAddress.user_id !== parseInt(userId)) {
        return UserProfileResponse.failure('Address not found or unauthorized');
      }

      // Unset all defaults for this user
      await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set new default
      const { data, error } = await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: true })
        .eq('address_id', addressId)
        .select()
        .single();

      if (error) {
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success(data, 'Default address updated');
    } catch (error: any) {
      console.error('Error setting default address:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * ADMIN: Search users
   */
  async searchUsers(command: SearchUsersCommand): Promise<UserProfileResponse> {
    try {
      // Validate
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return UserProfileResponse.failure('Validation failed', validationErrors);
      }

      let query = supabaseAdmin
        .from('users')
        .select('*', { count: 'exact' });

      // Apply search term
      if (command.searchTerm && command.searchTerm.trim()) {
        const term = command.searchTerm.trim();
        query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,username.ilike.%${term}%`);
      }

      // Apply filters
      if (command.filter?.isActive !== undefined) {
        query = query.eq('is_active', command.filter.isActive);
      }
      if (command.filter?.gender) {
        query = query.eq('gender', command.filter.gender.toLowerCase());
      }

      // Pagination
      const offset = command.getOffset();
      query = query.range(offset, offset + command.limit - 1);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return UserProfileResponse.failure(error.message);
      }

      return UserProfileResponse.success({
        users: data || [],
        pagination: {
          page: command.page,
          limit: command.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / command.limit)
        }
      }, 'Users retrieved successfully');
    } catch (error: any) {
      console.error('Error searching users:', error);
      return UserProfileResponse.failure(error.message);
    }
  }

  /**
   * ADMIN: Get user profile with addresses (full details)
   */
  async getFullUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      // Get user
      const userResult = await this.getUserProfile(userId);
      if (!userResult.success) {
        return userResult;
      }

      // Get addresses
      const addressesResult = await this.getUserAddresses(userId);

      return UserProfileResponse.success({
        user: userResult.data,
        addresses: addressesResult.success ? addressesResult.data : []
      }, 'Full profile retrieved successfully');
    } catch (error: any) {
      console.error('Error getting full profile:', error);
      return UserProfileResponse.failure(error.message);
    }
  }
}

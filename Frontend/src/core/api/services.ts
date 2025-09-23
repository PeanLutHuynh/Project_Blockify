import { httpClient } from './httpClient';
import { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  LoginDto, 
  RegisterDto, 
  AuthTokens,
  ApiResponse 
} from '@/types';

/**
 * Authentication API service
 */
export class AuthService {
  private readonly baseUrl = '/auth';

  /**
   * User login
   */
  async login(credentials: LoginDto): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await httpClient.post(`${this.baseUrl}/login`, credentials);
    
    if (response.success && response.data) {
      const { user, tokens } = response.data;
      
      // Store tokens and user info
      localStorage.setItem('authToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return response;
  }

  /**
   * User registration
   */
  async register(userData: RegisterDto): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await httpClient.post(`${this.baseUrl}/register`, userData);
    
    if (response.success && response.data) {
      const { user, tokens } = response.data;
      
      // Store tokens and user info
      localStorage.setItem('authToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return response;
  }

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse> {
    try {
      await httpClient.post(`${this.baseUrl}/logout`);
    } catch (error) {
      console.warn('Logout request failed, proceeding with local cleanup');
    } finally {
      // Always clear local storage
      this.clearAuthData();
    }
    
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await httpClient.post(`${this.baseUrl}/refresh`, {
      refreshToken
    });

    if (response.success && response.data) {
      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    return response;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return await httpClient.get(`${this.baseUrl}/profile`);
  }

  /**
   * Update user profile
   */
  async updateProfile(userData: UpdateUserDto): Promise<ApiResponse<User>> {
    const response = await httpClient.put(`${this.baseUrl}/profile`, userData);
    
    if (response.success && response.data) {
      // Update stored user info
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return await httpClient.put(`${this.baseUrl}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return await httpClient.post(`${this.baseUrl}/forgot-password`, { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return await httpClient.post(`${this.baseUrl}/reset-password`, {
      token,
      newPassword
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    return await httpClient.post(`${this.baseUrl}/verify-email`, { token });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<ApiResponse> {
    return await httpClient.post(`${this.baseUrl}/resend-verification`);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return httpClient.isAuthenticated();
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Clear authentication data
   */
  clearAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    httpClient.clearAuthToken();
  }
}

/**
 * User management API service
 */
export class UserService {
  private readonly baseUrl = '/users';

  /**
   * Get all users (admin only)
   */
  async getUsers(page: number = 1, limit: number = 10): Promise<ApiResponse<User[]>> {
    return await httpClient.get(`${this.baseUrl}?page=${page}&limit=${limit}`);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return await httpClient.get(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: CreateUserDto): Promise<ApiResponse<User>> {
    return await httpClient.post(this.baseUrl, userData);
  }

  /**
   * Update user (admin only)
   */
  async updateUser(id: string, userData: UpdateUserDto): Promise<ApiResponse<User>> {
    return await httpClient.put(`${this.baseUrl}/${id}`, userData);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<ApiResponse> {
    return await httpClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Activate/Deactivate user (admin only)
   */
  async toggleUserStatus(id: string, isActive: boolean): Promise<ApiResponse<User>> {
    return await httpClient.patch(`${this.baseUrl}/${id}/status`, { isActive });
  }

  /**
   * Search users
   */
  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<ApiResponse<User[]>> {
    return await httpClient.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ avatarUrl: string }>> {
    return await httpClient.uploadFile('/upload/avatar', file, onProgress);
  }
}

// Create and export singleton instances
export const authService = new AuthService();
export const userService = new UserService();
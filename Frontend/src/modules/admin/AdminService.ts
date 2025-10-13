import { FetchHttpClient } from "../../core/api/FetchHttpClient.js";
import { ENV } from "../../core/config/env.js";

/**
 * Admin Service - Frontend API Service
 * Handles all HTTP requests to Admin endpoints
 */
export class AdminService {
  private httpClient: FetchHttpClient;
  private baseUrl: string;

  constructor() {
    console.log('🔧 [AdminService] Initializing with API_BASE_URL:', ENV.API_BASE_URL);
    this.httpClient = new FetchHttpClient(ENV.API_BASE_URL);
    this.baseUrl = "/api/admin";
    console.log('🔧 [AdminService] FetchHttpClient baseURL:', this.httpClient['baseURL']);
  }

  /**
   * Check if current user is admin
   */
  async checkAdmin(authUid: string): Promise<{
    isAdmin: boolean;
    adminId?: number;
    email?: string;
    fullName?: string;
    isActive?: boolean;
  }> {
    try {
      console.log('🔍 [AdminService] Calling checkAdmin with authUid:', authUid);
      console.log('🔍 [AdminService] Full URL:', `${this.baseUrl}/check`);
      
      const response = await this.httpClient.post(`${this.baseUrl}/check`, {
        auth_uid: authUid,
      });
      
      console.log('✅ [AdminService] Response:', response);
      
      // Backend returns {success: true, isAdmin: true, ...}
      // FetchHttpClient returns it as-is (doesn't wrap in .data)
      const data = response as any;
      return {
        isAdmin: data.isAdmin || false,
        adminId: data.adminId,
        email: data.email,
        fullName: data.fullName,
        isActive: data.isActive
      };
    } catch (error) {
      console.error("❌ [AdminService] Check admin error:", error);
      throw error;
    }
  }

  /**
   * Log admin login event
   */
  async logLogin(): Promise<void> {
    try {
      await this.httpClient.post(`${this.baseUrl}/login-audit`, {});
      console.log('✅ [AdminService] Login logged successfully');
    } catch (error) {
      console.warn("⚠️ [AdminService] Failed to log login (non-critical):", error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get current admin info
   */
  async getCurrentAdmin(): Promise<{
    admin: {
      adminId: number;
      email: string;
      fullName: string;
      role: string;
    };
  }> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/me`);
      return response.data || { admin: {} };
    } catch (error) {
      console.error("Get current admin error:", error);
      throw error;
    }
  }

  /**
   * Get admin audit logs
   */
  async getAuditLogs(limit: number = 50): Promise<any[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/audit-logs?limit=${limit}`
      );
      return response.data?.logs || [];
    } catch (error) {
      console.error("Get audit logs error:", error);
      throw error;
    }
  }

  /**
   * Get all admins
   */
  async getAllAdmins(): Promise<any[]> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/all`);
      return response.data?.admins || [];
    } catch (error) {
      console.error("Get all admins error:", error);
      throw error;
    }
  }
}

import { supabaseService } from "../../core/api/supabaseClient.js";
import { AdminService } from "./AdminService.js";
import { ENV } from "../../core/config/env.js";

/**
 * Admin Controller - Frontend MVC Pattern
 * Handles admin authentication and page logic
 */
export class AdminController {
  private adminService: AdminService;
  private currentAdmin: any = null;

  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * Decode JWT token to get payload
   */
  private decodeJwt(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Initialize admin page
   * Check authentication and redirect if necessary
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Supabase client first
      supabaseService.initialize();
      
      // Check if user is authenticated via backend JWT
      const token = localStorage.getItem(ENV.JWT_STORAGE_KEY);
      
      if (!token) {
        console.log('❌ No auth token found, redirecting to login');
        window.location.href = "/pages/SigninPage.html";
        return;
      }

      // Decode JWT to get role
      const payload = this.decodeJwt(token);
      console.log('🔐 JWT payload:', payload);
      
      if (!payload) {
        console.log('❌ Invalid token, redirecting to login');
        window.location.href = "/pages/SigninPage.html";
        return;
      }

      // Check if user has admin role from JWT
      if (payload.role !== "admin") {
        console.log('❌ Not an admin (role:', payload.role, '), redirecting to HomePage');
        alert("Access denied. Admin privileges required.");
        window.location.href = "/pages/HomePage.html";
        return;
      }

      console.log('✅ Admin role verified from JWT');

      // Get Supabase user for additional info
      const { data: { user } } = await supabaseService.getUser();

      if (!user) {
        console.log('⚠️ No Supabase user found, but JWT is valid - proceeding');
      }

      // Verify with backend using userId from JWT
      const adminCheck = await this.adminService.checkAdmin(payload.userId);

      if (!adminCheck.isAdmin) {
        console.log('❌ Admin not found in database');
        alert("Admin record not found in database.");
        window.location.href = "/pages/HomePage.html";
        return;
      }

      if (!adminCheck.isActive) {
        console.log('❌ Admin account inactive');
        alert("Your admin account is inactive.");
        await supabaseService.signOut();
        window.location.href = "/pages/SigninPage.html";
        return;
      }

      // Admin is verified
      this.currentAdmin = adminCheck;
      console.log('✅ Admin verified:', this.currentAdmin);

      // Log login event
      await this.adminService.logLogin();

      // Update UI with admin info
      this.updateAdminUI();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadDashboardData();
    } catch (error) {
      console.error("Admin initialization error:", error);
      alert(`Failed to initialize admin panel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update UI with admin information
   */
  private async updateAdminUI(): Promise<void> {
    if (!this.currentAdmin) return;

    // Update admin name in header
    const adminNameElement = document.getElementById("adminName");
    if (adminNameElement) {
      adminNameElement.textContent = this.currentAdmin.fullName || this.currentAdmin.email;
    }

    // Update admin name in sidebar
    const nameElement = document.querySelector(".user .name");
    if (nameElement) {
      nameElement.textContent = this.currentAdmin.fullName || this.currentAdmin.email;
    }

    // Update admin avatar in sidebar
    const avatarElement = document.querySelector(".user img") as HTMLImageElement;
    if (avatarElement) {
      // Get avatar from Supabase user (Google OAuth avatar)
      const { data: { user } } = await supabaseService.getUser();
      
      if (user?.user_metadata?.avatar_url) {
        avatarElement.src = user.user_metadata.avatar_url;
        avatarElement.alt = this.currentAdmin.fullName || 'Admin avatar';
      } else if (this.currentAdmin.avatarUrl) {
        // Fallback to avatar from admin table
        avatarElement.src = this.currentAdmin.avatarUrl;
        avatarElement.alt = this.currentAdmin.fullName || 'Admin avatar';
      }
      // If no avatar, keep default image
    }
  }

  /**
   * Setup event listeners for admin panel
   */
  private setupEventListeners(): void {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    // Menu navigation (already handled in HTML inline script)
    // But we can enhance it if needed
  }

  /**
   * Load dashboard data
   */
  private async loadDashboardData(): Promise<void> {
    try {
      // Load customers, products, orders etc.
      // This will be implemented with actual data fetching
      console.log("Loading dashboard data...");
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }

  /**
   * Handle logout
   */
  private async handleLogout(): Promise<void> {
    try {
      const confirmed = confirm("Are you sure you want to logout?");
      if (!confirmed) return;

      // Sign out from Supabase
      await supabaseService.signOut();

      // Clear local storage
      localStorage.removeItem(ENV.JWT_STORAGE_KEY);
      localStorage.removeItem(ENV.USER_STORAGE_KEY);

      // Redirect to login page
      window.location.href = "/pages/SigninPage.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout");
    }
  }

  /**
   * Get current admin info
   */
  getCurrentAdmin(): any {
    return this.currentAdmin;
  }

  /**
   * Check if user is admin (static method for other pages)
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const user = await supabaseService.getUser();

      if (!user) return false;

      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      return userRole === "admin";
    } catch (error) {
      console.error("Admin check error:", error);
      return false;
    }
  }

  /**
   * Redirect to admin panel if user is admin
   */
  static async redirectIfAdmin(): Promise<void> {
    const isAdmin = await AdminController.isAdmin();
    if (isAdmin) {
      window.location.href = "/pages/Admin.html";
    }
  }
}

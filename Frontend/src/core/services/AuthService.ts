import { httpClient } from "../api/FetchHttpClient.js";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";

// Define interfaces for auth requests/responses
interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
  username: string;
  gender?: string;
}

interface SignInRequest {
  identifier: string; // username or email
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
    authUid: string;
  };
  token?: string;
  errors?: string[];
}

interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  message: string;
  errors?: string[];
  redirectTo?: string;
}

/**
 * AuthService - Handles authentication operations with backend API
 * Follows service layer pattern in MVC architecture
 */
export class AuthService {
  private readonly AUTH_TOKEN_KEY = ENV.JWT_STORAGE_KEY;
  private readonly USER_KEY = "user";
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Sign up new user
   */
  async signUp(data: SignUpRequest): Promise<{
    success: boolean;
    user?: User;
    message: string;
    errors?: string[];
  }> {
    try {
      const response = await httpClient.post<AuthResponse>(
        "/api/auth/signup",
        data
      );

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message,
          user: response.data.user
            ? User.fromApiResponse(response.data.user)
            : undefined,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || "Sign up failed",
        };
      }
    } catch (error: any) {
      console.error("SignUp error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Network error occurred",
      };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(data: SignInRequest): Promise<{
    success: boolean;
    user?: User;
    message: string;
    errors?: string[];
  }> {
    try {
      const response = await httpClient.post<AuthResponse>(
        "/api/auth/signin",
        data
      );

      if (
        response.data?.success &&
        response.data?.user &&
        response.data?.token
      ) {
        this.handleAuthSuccess(response.data.user, response.data.token);
        return {
          success: true,
          user: this.currentUser!,
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || "Sign in failed",
          errors: response.data?.errors,
        };
      }
    } catch (error: any) {
      console.error("SignIn error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Network error occurred",
        errors: error.response?.data?.errors,
      };
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<{
    success: boolean;
    user?: User;
    message: string;
  }> {
    try {
      const response = await httpClient.post<{ user: any; payload: any }>(
        "/api/auth/verify-token"
      );

      if (response.data?.user) {
        const user = User.fromApiResponse(response.data.user);
        this.setCurrentUser(user);
        return {
          success: true,
          user,
          message: "Token is valid",
        };
      } else {
        this.signOut();
        return {
          success: false,
          message: "Invalid token",
        };
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      this.signOut();
      return {
        success: false,
        message: "Token verification failed",
      };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<{
    success: boolean;
    user?: User;
    message: string;
  }> {
    try {
      const response = await httpClient.get<any>("/api/auth/me");

      if (response.data) {
        const user = User.fromApiResponse(response.data);
        this.setCurrentUser(user);
        return {
          success: true,
          user,
          message: "User profile retrieved successfully",
        };
      } else {
        return {
          success: false,
          message: "Failed to get user profile",
        };
      }
    } catch (error: any) {
      console.error("Get current user error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Network error occurred",
      };
    }
  }

  /**
   * Sign out user
   */
  signOut(): void {
    this.currentUser = null;
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    httpClient.clearAuthToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser && httpClient.isAuthenticated();
  }

  /**
   * Get current user (cached)
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Google authentication via full-page redirect (no popup)
   * Uses Supabase implicit flow to get access_token in URL hash
   */
  async googleAuth(): Promise<{ success: boolean; message: string }> {
    try {
      const redirectUrl = `${window.location.origin}${ENV.GOOGLE_OAUTH_REDIRECT_URL}`;

      // Supabase OAuth URL with implicit flow (returns access_token in hash)
      const authUrl = new URL(`${ENV.SUPABASE_URL}/auth/v1/authorize`);
      authUrl.searchParams.set("provider", "google");
      authUrl.searchParams.set("redirect_to", redirectUrl);

      window.location.href = authUrl.toString();
      return { success: true, message: "Redirecting to Google..." };
    } catch (error) {
      console.error("Google auth error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to initialize Google authentication",
      };
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(authData: {
    email: string;
    fullName: string;
    authUid: string;
    avatarUrl?: string;
  }): Promise<AuthResult> {
    try {
      const response = await httpClient.post("/api/auth/google", authData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        this.handleAuthSuccess(response.data.user, response.data.token);

        return {
          success: true,
          user: this.currentUser!,
          token: response.data.token,
          message: response.data.message,
          redirectTo: "/src/pages/HomePage.html",
        };
      } else {
        return {
          success: false,
          message: response.data.message,
          errors: response.data.errors,
        };
      }
    } catch (error: any) {
      console.error("Google callback error:", error);

      if (error.response?.data) {
        return {
          success: false,
          message:
            error.response.data.message || "Google authentication failed",
          errors: error.response.data.errors,
        };
      }

      return {
        success: false,
        message: "Network error during Google authentication",
      };
    }
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(userData: any, token: string): void {
    // Store token
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    httpClient.setAuthToken(token);

    // Create and store user
    const user = User.fromApiResponse(userData);
    this.setCurrentUser(user);
  }

  /**
   * Set current user and persist to localStorage
   */
  private setCurrentUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user.toApiRequest()));
  }

  /**
   * Load user from localStorage on initialization
   */
  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);

      if (userData && token) {
        const parsedData = JSON.parse(userData);
        this.currentUser = User.fromApiResponse(parsedData);
        httpClient.setAuthToken(token);
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
      this.signOut();
    }
  }

  /**
   * Auto-refresh token if needed
   */
  async refreshAuthToken(): Promise<boolean> {
    try {
      const verifyResult = await this.verifyToken();
      return verifyResult.success;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.signOut();
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
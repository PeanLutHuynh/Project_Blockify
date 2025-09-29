import { httpClient } from "../api/httpClient";
import { User } from "../models/User";
import { ENV } from "../config/env";

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
    emailVerified: boolean;
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
  private readonly AUTH_TOKEN_KEY = "authToken";
  private readonly USER_KEY = "user";
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Sign up new user
   */
  async signUp(
    data: SignUpRequest
  ): Promise<{
    success: boolean;
    user?: User;
    message: string;
    errors?: string[];
  }> {
    try {
      const response = await httpClient.post<AuthResponse>(
        "/auth/signup",
        data
      );

      if (response.success && response.data?.user && response.data?.token) {
        this.handleAuthSuccess(response.data.user, response.data.token);
        return {
          success: true,
          user: this.currentUser!,
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || "Sign up failed",
          errors: response.data?.errors,
        };
      }
    } catch (error: any) {
      console.error("SignUp error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Network error occurred",
        errors: error.response?.data?.errors,
      };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(
    data: SignInRequest
  ): Promise<{
    success: boolean;
    user?: User;
    message: string;
    errors?: string[];
  }> {
    try {
      const response = await httpClient.post<AuthResponse>(
        "/auth/signin",
        data
      );

      if (response.success && response.data?.user && response.data?.token) {
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
        "/auth/verify-token"
      );

      if (response.success && response.data?.user) {
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
      const response = await httpClient.get<any>("/auth/me");

      if (response.success && response.data) {
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
   * Check if user's email is verified
   */
  isEmailVerified(): boolean {
    return this.currentUser?.emailVerified ?? false;
  }

  /**
   * Google authentication with popup - FIXED VERSION
   */
  async googleAuth(): Promise<{ success: boolean; message: string }> {
    try {
      // Create popup window for Google OAuth
      const redirectUrl = `${window.location.origin}/src/pages/AuthCallback.html`;
      const authUrl = `${
        ENV.SUPABASE_URL
      }/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        redirectUrl
      )}`;

      // Open popup window
      const popup = window.open(
        authUrl,
        "google-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for popup to close or send message
      return new Promise((resolve, reject) => {
        let checkClosed: NodeJS.Timeout;

        // Safe popup closed check với try-catch
        const safeCheckClosed = () => {
          try {
            if (popup.closed) {
              clearInterval(checkClosed);
              reject(new Error("Authentication cancelled by user"));
            }
          } catch (error) {
            // Nếu bị chặn bởi COOP, chỉ log warning và tiếp tục chờ message
            console.warn(
              "Cannot access popup.closed due to security policy, waiting for message..."
            );
            // KHÔNG reject ở đây, tiếp tục chờ message từ callback
          }
        };

        checkClosed = setInterval(safeCheckClosed, 1000);

        // Listen for message from popup
        const messageListener = (event: MessageEvent) => {
          // Verify origin for security
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
            clearInterval(checkClosed);
            window.removeEventListener("message", messageListener);
            try {
              popup.close();
            } catch (e) {
              // Ignore close errors
            }

            // Handle the auth success
            this.handleAuthSuccess(event.data.user, event.data.token);
            resolve({
              success: true,
              message: "Google authentication successful",
            });
          } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
            clearInterval(checkClosed);
            window.removeEventListener("message", messageListener);
            try {
              popup.close();
            } catch (e) {
              // Ignore close errors
            }

            reject(
              new Error(event.data.message || "Google authentication failed")
            );
          }
        };

        window.addEventListener("message", messageListener);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          try {
            if (popup && !popup.closed) {
              popup.close();
            }
          } catch (e) {
            // Ignore close errors
          }
          reject(new Error("Authentication timeout"));
        }, 300000);
      });
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
      const response = await httpClient.post("/auth/google", authData, {
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

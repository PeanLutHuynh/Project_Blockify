import { httpClient } from "../api/FetchHttpClient.js";
import { supabaseService } from "../api/supabaseClient.js";
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

      // Backend structure: { success: true/false, data: {...}, message }
      if (response.success) {
        return {
          success: true,
          message: response.message || "Sign up successful",
          user: response.data?.user
            ? User.fromApiResponse(response.data.user)
            : undefined,
        };
      } else {
        return {
          success: false,
          message: response.message || response.data?.message || "Sign up failed",
          errors: response.data?.errors,
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
   * Sign in existing user using Supabase Auth
   */
  async signIn(data: SignInRequest): Promise<{
    success: boolean;
    user?: User;
    message: string;
    errors?: string[];
  }> {
    try {
      console.log('🔐 Attempting sign in with:', { identifier: data.identifier });
      
      // Authenticate with backend first (backend will verify with Supabase)
      const response = await httpClient.post<AuthResponse>(
        "/api/auth/signin",
        data
      );

      console.log('📡 Backend response:', response);

      // Backend structure: { success: true, data: { user, token }, message }
      if (
        response.success &&
        response.data?.user &&
        response.data?.token
      ) {
        this.handleAuthSuccess(response.data.user, response.data.token);
        
        // Then try to sync Supabase session (optional, backend already verified)
        try {
          const email = response.data.user.email;
          if (email && data.password) {
            await supabaseService.signInWithPassword(email, data.password);
            console.log('✅ Supabase session synced');
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase sign in failed, but backend auth succeeded:', supabaseError);
          // Continue anyway since backend auth succeeded
        }
        
        return {
          success: true,
          user: this.currentUser!,
          message: response.message || "Sign in successful",
        };
      } else {
        console.error('❌ Backend authentication failed:', response);
        return {
          success: false,
          message: response.message || response.data?.message || "Sign in failed",
          errors: response.data?.errors,
        };
      }
    } catch (error: any) {
      console.error("❌ SignIn error:", error);
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

      // Backend structure: { success: true, data: { id, email, ... }, message }
      if (response.success && response.data) {
        const user = User.fromApiResponse(response.data);
        this.setCurrentUser(user);
        return {
          success: true,
          user,
          message: response.message || "User profile retrieved successfully",
        };
      } else {
        return {
          success: false,
          message: response.message || "Failed to get user profile",
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
   * Sign out user using Supabase Auth
   */
  async signOut(): Promise<void> {
    // Sign out from Supabase
    await supabaseService.signOut();
    
    // Clear local state
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
   * Google authentication using Supabase OAuth
   * Supabase will handle redirect and session management automatically
   */
  async googleAuth(): Promise<{ success: boolean; message: string }> {
    try {
      // Use Supabase signInWithOAuth - it handles everything automatically
      const { error } = await supabaseService.signInWithGoogle();
      
      if (error) {
        console.error('Google OAuth error:', error);
        return {
          success: false,
          message: error.message || 'Failed to initialize Google authentication'
        };
      }
      
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

      // Backend structure: { success: true, data: { user, token }, message }
      if (response.success && response.data?.user && response.data?.token) {
        this.handleAuthSuccess(response.data.user, response.data.token);

        return {
          success: true,
          user: this.currentUser!,
          token: response.data.token,
          message: response.message || "Google authentication successful",
          redirectTo: "/src/pages/HomePage.html",
        };
      } else {
        return {
          success: false,
          message: response.message || response.data?.message || "Google authentication failed",
          errors: response.data?.errors,
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
      await this.signOut();
      return false;
    }
  }

  /**
   * Initialize auth state listener
   * Listen to Supabase auth state changes and sync with local state
   */
  initializeAuthListener(): () => void {
    let authSyncPromise: Promise<void> | null = null; // Promise-based lock
    
    return supabaseService.onAuthStateChange(async (supabaseUser) => {
      // If already syncing, wait for it to complete
      if (authSyncPromise) {
        await authSyncPromise;
        return;
      }
      
      // Create sync promise
      authSyncPromise = (async () => {
        try {
          if (!supabaseUser) {
            // User logged out - only clear local state, don't trigger another signOut
            if (this.currentUser) {
              this.currentUser = null;
              localStorage.removeItem(this.AUTH_TOKEN_KEY);
              localStorage.removeItem(this.USER_KEY);
              httpClient.clearAuthToken();
            }
          } else if (!this.currentUser || this.currentUser.authUid !== supabaseUser.id) {
            // New user logged in or session restored
            
            // Wait for Supabase session to be fully ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
              // Get Supabase access token
              const { data: sessionData, error: sessionError } = await supabaseService.getSession();
              const supabaseToken = sessionData?.session?.access_token;
              
              if (sessionError) {
                console.error('❌ Session error, signing out:', sessionError.message);
                await supabaseService.signOut();
                return;
              }
              
              if (!supabaseToken) {
                console.error('❌ No Supabase token, clearing expired session');
                await supabaseService.signOut();
                return;
              }
              
              // Set temporary token to call backend
              httpClient.setAuthToken(supabaseToken);
              
              // Try to fetch user profile from backend with Supabase token
              const response = await httpClient.get<any>("/api/auth/me");
              
              // Backend structure: { success: true, data: {...}, message }
              if (response.success && response.data) {
                // Backend knows this user, sync profile
                const user = User.fromApiResponse(response.data);
                this.setCurrentUser(user);
                console.log('✅ Google OAuth: User synced:', user.email);
              } else {
                // User not in backend, need to create via OAuth callback
                
                // Call Google OAuth endpoint to create user in backend
                const authData = {
                  email: supabaseUser.email!,
                  fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
                  authUid: supabaseUser.id,
                  avatarUrl: supabaseUser.user_metadata?.avatar_url,
                };
                
                const oauthResponse = await httpClient.post("/api/auth/google", authData);
                
                // Backend structure: { success: true, data: { user, token }, message }
                if (oauthResponse.success && oauthResponse.data?.user && oauthResponse.data?.token) {
                  this.handleAuthSuccess(oauthResponse.data.user, oauthResponse.data.token);
                  console.log('✅ Google OAuth: User created:', oauthResponse.data.user.email);
                } else {
                  console.error('❌ OAuth user creation failed');
                }
              }
            } catch (error) {
              console.error('❌ Failed to sync user:', error);
            }
          }
        } finally {
          authSyncPromise = null; // Clear lock
        }
      })(); // Execute immediately
      
      // Wait for sync to complete
      await authSyncPromise;
    });
  }

  /**
   * Get current Supabase user
   */
  async getSupabaseUser() {
    return await supabaseService.getUser();
  }

  /**
   * Check if Supabase session is active
   */
  async isSupabaseAuthenticated(): Promise<boolean> {
    return await supabaseService.isAuthenticated();
  }
}

// Export singleton instance
export const authService = new AuthService();
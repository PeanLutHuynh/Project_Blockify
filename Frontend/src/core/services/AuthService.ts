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
    redirectTo?: string;
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
            const { data: signInData } = await supabaseService.signInWithPassword(email, data.password);
            console.log('✅ Supabase session synced');
            
            // Check if user is admin based on Supabase user metadata
            const userRole = signInData?.user?.user_metadata?.role;
            if (userRole === 'admin') {
              console.log('👑 Admin user detected, redirecting to admin panel');
              return {
                success: true,
                user: this.currentUser!,
                message: response.message || "Sign in successful",
                redirectTo: '/pages/Admin.html'
              };
            }
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase sign in failed, but backend auth succeeded:', supabaseError);
          // Continue anyway since backend auth succeeded
        }
        
        return {
          success: true,
          user: this.currentUser!,
          message: response.message || "Sign in successful",
          redirectTo: '/pages/HomePage.html'
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
      // First check if we have a Supabase session
      const { data: sessionData, error: sessionError } = await supabaseService.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.warn('⚠️ No Supabase session found');
        this.signOut();
        return {
          success: false,
          message: "No active session",
        };
      }

      // Use Supabase token for verification
      const supabaseToken = sessionData.session.access_token;
      httpClient.setAuthToken(supabaseToken);

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
      // First check if we have a Supabase session
      const { data: sessionData, error: sessionError } = await supabaseService.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.warn('⚠️ No Supabase session found');
        return {
          success: false,
          message: "No active session",
        };
      }

      // Use Supabase token to authenticate with backend
      const supabaseToken = sessionData.session.access_token;
      httpClient.setAuthToken(supabaseToken);

      const response = await httpClient.get<any>("/api/auth/me");

      // Backend structure: { success: true, data: { id, email, ... }, message }
      if (response.success && response.data) {
        const user = User.fromApiResponse(response.data);
        this.setCurrentUser(user);
        
        // Store the Supabase token as well
        localStorage.setItem(this.AUTH_TOKEN_KEY, supabaseToken);
        
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
          redirectTo: "/pages/HomePage.html",
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
  setCurrentUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user.toApiRequest()));
  }

  /**
   * Load user from localStorage on initialization
   */
  private loadUserFromStorage(): void {
    try {
      console.log('🔍 [AuthService] Loading user from storage...');
      const userData = localStorage.getItem(this.USER_KEY);
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      
      console.log('🔍 [AuthService] USER_KEY:', this.USER_KEY);
      console.log('🔍 [AuthService] AUTH_TOKEN_KEY:', this.AUTH_TOKEN_KEY);
      console.log('🔍 [AuthService] userData exists:', !!userData);
      console.log('🔍 [AuthService] token exists:', !!token);

      if (userData && token) {
        const parsedData = JSON.parse(userData);
        this.currentUser = User.fromApiResponse(parsedData);
        httpClient.setAuthToken(token);
        console.log('✅ [AuthService] User loaded:', this.currentUser?.id);
      } else {
        console.warn('⚠️ [AuthService] Missing userData or token');
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
                console.warn('⚠️ No Supabase token found, but user object exists. Session may be loading...');
                // Don't immediately sign out - the session might be loading
                // Just skip syncing for now and wait for next auth state change
                return;
              }
              
              // Set temporary token to call backend
              httpClient.setAuthToken(supabaseToken);
              
              // For Google OAuth, ALWAYS call /api/auth/google endpoint
              // This endpoint will check admin_users first, then public.users
              console.log('🔄 Google OAuth: Calling /api/auth/google endpoint...');
              const authData = {
                email: supabaseUser.email!,
                fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
                authUid: supabaseUser.id,
                avatarUrl: supabaseUser.user_metadata?.avatar_url,
                username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
              };
              
              const oauthResponse = await httpClient.post("/api/auth/google", authData);
              
              // Backend structure: { success: true, data: { user, token }, message }
              if (oauthResponse.success && oauthResponse.data?.user && oauthResponse.data?.token) {
                this.handleAuthSuccess(oauthResponse.data.user, oauthResponse.data.token);
                console.log('✅ Google OAuth: User authenticated:', oauthResponse.data.user.email);
                console.log('👤 Google OAuth: User role:', oauthResponse.data.user.role);
                
                // Redirect based on role
                const userRole = oauthResponse.data.user.role;
                if (userRole === 'admin') {
                  console.log('👑 Google OAuth: Admin detected, redirecting to Admin panel...');
                  // Check if we're not already on admin page
                  if (!window.location.pathname.includes('Admin.html')) {
                    window.location.href = '/pages/Admin.html';
                  }
                } else {
                  console.log('👤 Google OAuth: Regular user, redirecting to Home page...');
                  // Check if we're on auth callback or signin page
                  if (window.location.pathname.includes('AuthCallback.html') || 
                      window.location.pathname.includes('Signin')) {
                    window.location.href = '/pages/HomePage.html';
                  }
                }
              } else {
                console.error('❌ OAuth authentication failed:', oauthResponse);
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
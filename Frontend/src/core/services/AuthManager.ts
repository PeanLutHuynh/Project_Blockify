/**
 * Global Auth Manager
 * Centralizes authentication state management across the entire application
 * Ensures user is loaded once at startup and provides global access
 */

import { authService } from './AuthService.js';
import { User } from '../models/User.js';
import { supabaseService } from '../api/supabaseClient.js';

type AuthStateListener = (user: User | null) => void;

export class AuthManager {
  private static instance: AuthManager;
  private isInitialized = false;
  private listeners: Set<AuthStateListener> = new Set();
  private currentUser: User | null = null;
  private unsubscribeSupabase: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize auth manager - should be called once at app startup
   * OPTIMIZED: Load from cache instantly, then verify in background
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 1. Initialize Supabase first (CRITICAL!)
    try {
      await supabaseService.initialize();
    } catch (error) {
      console.error('[AuthManager] Failed to initialize Supabase:', error);
      throw error;
    }

    // 2. Load user from cache INSTANTLY (no delay)
    this.currentUser = authService.getUser();
    
    // 3. Notify listeners immediately with cached data (instant UI render)
    if (this.currentUser) {
      this.notifyListeners();
    }

    // 4. Setup Supabase auth listener
    this.setupAuthListener();

    // 5. Verify and sync in background (silent, no UI block)
    this.syncAuthState().catch(err => {
      console.error('[AuthManager] Background sync failed:', err);
      // Don't throw - keep cached user if sync fails
    });

    this.isInitialized = true;
    console.log('[AuthManager] Initialized (sync running in background)');
  }

  /**
   * Setup Supabase auth state listener
   */
  private setupAuthListener(): void {
    this.unsubscribeSupabase = authService.initializeAuthListener();
    
    // Also listen to storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'user' || e.key === 'auth_token') {
        console.log('🔄 [AuthManager] Storage changed in another tab');
        const newUser = authService.getUser();
        if (this.currentUser?.id !== newUser?.id) {
          this.currentUser = newUser;
          this.notifyListeners();
        }
      }
    });
  }

  /**
   * Sync auth state with backend
   * OPTIMIZED: Silent background sync, only notify if changed
   */
  private async syncAuthState(): Promise<void> {
    try {
      // Check if we have a Supabase session
      const { data: sessionData } = await supabaseService.getSession();
      
      if (!sessionData?.session) {
        console.log('[AuthManager] No Supabase session found');
        if (this.currentUser) {
          // Clear stale local state
          await authService.signOut();
          this.currentUser = null;
          this.notifyListeners();
        }
        return;
      }

      // Get Supabase user with metadata
      const { data: supabaseUserData } = await supabaseService.getUser();
      const supabaseUser = supabaseUserData?.user;

      if (!supabaseUser) {
        console.warn('[AuthManager] No Supabase user found');
        return;
      }

      // Extract role from user metadata
      const userRole = supabaseUser.user_metadata?.role || 'user';
      console.log('[AuthManager] Background sync - role:', userRole);

      // Cache key for comparison
      const cacheKey = `${supabaseUser.id}-${userRole}`;
      const currentCacheKey = this.currentUser ? `${this.currentUser.id}-${this.currentUser.role}` : null;

      // If nothing changed, skip update (no UI re-render)
      if (cacheKey === currentCacheKey) {
        console.log('[AuthManager] User unchanged, skipping update');
        return;
      }

      // For admin users, create user object directly from Supabase data
      if (userRole === 'admin') {
        console.log('[AuthManager] Admin user detected, skipping backend sync');
        
        // Create admin user object from Supabase metadata
        const adminUserData = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
          username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
          authUid: supabaseUser.id,
          role: 'admin' as const,
          avatarUrl: supabaseUser.user_metadata?.avatar_url,
          isActive: true
        };
        
        this.currentUser = User.fromApiResponse(adminUserData);
        authService.setCurrentUser(this.currentUser);
        
        console.log('[AuthManager] Admin user synced:', this.currentUser.email);
        this.notifyListeners();
        return;
      }

      // For regular users, sync with backend
      const result = await authService.getCurrentUser();
      
      if (result.success && result.user) {
        // Update user with role from Supabase metadata
        const userData = result.user.toApiRequest();
        userData.role = userRole;
        
        this.currentUser = User.fromApiResponse(userData);
        authService.setCurrentUser(this.currentUser);
        
        console.log('[AuthManager] User synced:', this.currentUser.email, 'Role:', this.currentUser.role);
        this.notifyListeners();
      } else {
        console.warn('[AuthManager] Failed to sync user from backend');
      }
    } catch (error) {
      console.error('[AuthManager] Failed to sync auth state:', error);
      // Don't clear currentUser - keep cached data on sync failure
    }
  }

  /**
   * Get current user
   */
  public getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentUser && authService.isAuthenticated();
  }

  /**
   * Check if current user is admin
   */
  public isAdmin(): boolean {
    return this.currentUser?.isAdmin() ?? false;
  }

  /**
   * Subscribe to auth state changes
   */
  public subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current state
    listener(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(): void {
    console.log('[AuthManager] Notifying', this.listeners.size, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Sign out user
   */
  public async signOut(): Promise<void> {
    console.log('[AuthManager] Signing out...');
    await authService.signOut();
    this.currentUser = null;
    this.notifyListeners();
  }

  /**
   * Refresh auth state (force re-sync)
   */
  public async refresh(): Promise<void> {
    console.log('[AuthManager] Refreshing auth state...');
    await this.syncAuthState();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.unsubscribeSupabase) {
      this.unsubscribeSupabase();
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('[AuthManager] Destroyed');
  }

  /**
   * Guard for admin-only pages
   * Redirects to home if user is not admin
   */
  public requireAdmin(): void {
    if (!this.isAuthenticated()) {
      console.warn('[AuthManager] Not authenticated, redirecting to signin');
      window.location.href = '/pages/SigninPage.html';
      return;
    }

    if (!this.isAdmin()) {
      console.warn('[AuthManager] Not admin, redirecting to home');
      window.location.href = '/pages/HomePage.html';
      return;
    }

    console.log('[AuthManager] Admin access granted');
  }

  /**
   * Guard for authenticated-only pages
   * Redirects to signin if not authenticated
   */
  public requireAuth(): void {
    if (!this.isAuthenticated()) {
      console.warn('[AuthManager] Not authenticated, redirecting to signin');
      window.location.href = '/pages/SigninPage.html';
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

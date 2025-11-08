/**
 * Supabase Client for Frontend
 * Provides authentication and database access using Supabase SDK
 * Uses global supabase from CDN
 */

import { ENV } from '../config/env.js';

// Use global supabase from CDN (loaded in HTML)
declare global {
  interface Window {
    supabase: any;
  }
}

class SupabaseService {
  private client: any | null = null;
  private authStateListeners: Array<(user: any | null) => void> = [];

  /**
   * Wait for Supabase SDK to load from CDN
   */
  private async waitForSDK(maxRetries: number = 20, delayMs: number = 100): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (window.supabase && window.supabase.createClient) {
        console.log('✅ Supabase SDK loaded from CDN');
        return true;
      }
      console.log(`⏳ Waiting for Supabase SDK from CDN... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    console.error('❌ Supabase SDK failed to load from CDN');
    return false;
  }

  /**
   * Initialize Supabase client (async version)
   * Must be called after ENV is loaded
   */
  async initializeAsync(): Promise<boolean> {
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
      console.error('❌ Supabase configuration is missing. Please load ENV first.');
      return false;
    }

    // ✅ Prevent double initialization
    if (this.client) {
      console.warn('⚠️ Supabase client already initialized');
      return true;
    }

    // ✅ Wait for Supabase SDK to load from CDN
    const sdkReady = await this.waitForSDK();
    if (!sdkReady) {
      return false;
    }

    this.client = window.supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    // Set up auth state change listener
    this.client.auth.onAuthStateChange((event: any, session: any) => {
      // Only log important events, not every state change
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log('🔐 Supabase auth event:', event, session?.user?.email);
      }
      
      // Notify all listeners
      const user = session?.user || null;
      this.authStateListeners.forEach(listener => listener(user));
    });

    console.log('✅ Supabase client initialized');
    return true;
  }

  /**
   * Initialize Supabase client (synchronous - deprecated, use initializeAsync instead)
   * Must be called after ENV is loaded
   */
  initialize(): void {
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
      console.error('❌ Supabase configuration is missing. Please load ENV first.');
      return;
    }

    // Check if Supabase SDK is loaded from CDN
    if (!window.supabase || !window.supabase.createClient) {
      console.error('❌ Supabase SDK not loaded. Make sure to include the CDN script in HTML.');
      return;
    }

    // ✅ Prevent double initialization
    if (this.client) {
      console.warn('⚠️ Supabase client already initialized');
      return;
    }

    this.client = window.supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    // Set up auth state change listener
    this.client.auth.onAuthStateChange((event: any, session: any) => {
      // Only log important events, not every state change
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log('🔐 Supabase auth event:', event, session?.user?.email);
      }
      
      // Notify all listeners
      const user = session?.user || null;
      this.authStateListeners.forEach(listener => listener(user));
    });

    console.log('✅ Supabase client initialized');
  }

  /**
   * Wait for Supabase client to be ready
   */
  async waitForReady(maxRetries: number = 10, delayMs: number = 100): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.client) {
        console.log('✅ Supabase client is ready');
        return true;
      }
      console.log(`⏳ Waiting for Supabase client... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    console.error('❌ Supabase client failed to initialize');
    return false;
  }

  /**
   * Get Supabase client instance
   */
  getClient(): any {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string) {
    return await this.getClient().auth.signInWithPassword({
      email,
      password
    });
  }

  /**
   * Sign in with Google OAuth
   * Redirects to AuthCallback page which will handle session detection
   */
  async signInWithGoogle(redirectTo?: string) {
    const defaultRedirect = `${window.location.origin}/pages/AuthCallback.html`;
    
    return await this.getClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || defaultRedirect
      }
    });
  }

  /**
   * Sign out
   */
  async signOut() {
    return await this.getClient().auth.signOut();
  }

  /**
   * Get current user
   */
  async getUser() {
    return await this.getClient().auth.getUser();
  }

  /**
   * Get current session
   */
  async getSession() {
    return await this.getClient().auth.getSession();
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: any | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // DON'T immediately call callback here - causes race conditions
    // Let Supabase's onAuthStateChange handle it
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.getSession();
    return !!data.session;
  }

  /**
   * Send password reset email
   * Link có thời gian sống 1 giờ (Supabase default)
   * Chỉ có thể dùng 1 lần, sau khi đổi pass thì link cũ sẽ invalid
   */
  async resetPasswordForEmail(email: string, redirectTo?: string) {
    const defaultRedirect = `${window.location.origin}/pages/ResetPassword.html`;
    
    return await this.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || defaultRedirect
    });
  }

  /**
   * Update user password (for password reset flow)
   * Yêu cầu user phải có valid reset token (từ email link)
   */
  async updatePassword(newPassword: string) {
    return await this.getClient().auth.updateUser({
      password: newPassword
    });
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

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
   * Initialize Supabase client
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
    const defaultRedirect = `${window.location.origin}/src/pages/AuthCallback.html`;
    
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
}

// Export singleton instance
export const supabaseService = new SupabaseService();

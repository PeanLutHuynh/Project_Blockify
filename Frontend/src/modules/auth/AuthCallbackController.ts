import { ENV } from '../../core/config/env.js';

/**
 * AuthCallbackController
 * Handles Google OAuth callback and completes authentication
 * Following MVC pattern per rule.md
 */
export class AuthCallbackController {
  private statusEl: HTMLElement | null = null;
  private readonly SUPABASE_URL: string;
  private readonly SUPABASE_ANON_KEY: string;
  private readonly API_BASE_URL: string;

  constructor() {
    this.SUPABASE_URL = ENV.SUPABASE_URL || '';
    this.SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY || '';
    this.API_BASE_URL = ENV.API_BASE_URL;
  }

  /**
   * Initialize controller
   */
  public init(): void {
    this.statusEl = document.getElementById('status');
    this.completeAuth();
  }

  /**
   * Parse hash parameters from URL
   */
  private parseHashParams(): {
    access_token: string | null;
    refresh_token: string | null;
    token_type: string | null;
    expires_in: string | null;
  } {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    
    const error = queryParams.get('error');
    const errorDesc = queryParams.get('error_description');
    
    if (error) {
      throw new Error(`Supabase callback error: ${errorDesc || error}`);
    }
    
    return {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      token_type: params.get('token_type'),
      expires_in: params.get('expires_in')
    };
  }

  /**
   * Decode JWT token
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
   * Get Supabase user from access token
   */
  private async getSupabaseUser(accessToken: string): Promise<any> {
    const resp = await fetch(`${this.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': this.SUPABASE_ANON_KEY
      },
      credentials: 'omit'
    });
    
    if (!resp.ok) throw new Error('Failed to fetch user from Supabase');
    return resp.json();
  }

  /**
   * Complete authentication process
   */
  private async completeAuth(): Promise<void> {
    try {
      console.log('🔄 [AuthCallback] Starting Google Auth completion...');
      console.log('🔄 [AuthCallback] Full URL:', window.location.href);
      
      const { access_token } = this.parseHashParams();
      console.log('🔄 [AuthCallback] Access token present:', !!access_token);
      
      if (!access_token) {
        throw new Error('Supabase callback error: Missing access_token in URL hash');
      }

      if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing on client');
      }

      console.log('🔄 [AuthCallback] Fetching user from Supabase...');
      const supaUser = await this.getSupabaseUser(access_token);
      console.log('✅ [AuthCallback] Supabase user:', supaUser);
      
      const email = supaUser?.email || supaUser?.user?.email;
      let authUid = supaUser?.id || supaUser?.user?.id;
      const meta = supaUser?.user_metadata || supaUser?.user?.user_metadata || {};
      const avatarUrl = meta?.avatar_url || meta?.picture || '';
      const derivedName = email ? email.split('@')[0] : '';
      const fullName = (meta.full_name || meta.name || derivedName || 'New User');
      
      // Generate username from email or name (for Google Auth compatibility)
      let username = meta.username || derivedName;
      username = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      console.log('📧 [AuthCallback] Email:', email);
      console.log('🆔 [AuthCallback] Auth UID:', authUid);
      console.log('👤 [AuthCallback] Full Name:', fullName);
      console.log('👤 [AuthCallback] Username:', username);

      if (!authUid) {
        const payload = this.decodeJwt(access_token);
        if (payload && (payload.sub || payload.user_id)) {
          authUid = payload.sub || payload.user_id;
        }
      }

      if (!email || !authUid) {
        throw new Error('Supabase callback error: Missing required user data from OAuth callback');
      }

      console.log('🔄 [AuthCallback] Calling backend API:', `${this.API_BASE_URL}/api/auth/google`);
      const resp = await fetch(`${this.API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, fullName, authUid, avatarUrl, username })
      });

      console.log('📡 [AuthCallback] Backend response status:', resp.status);
      const json = await resp.json();
      console.log('📡 [AuthCallback] Backend response data:', json);
      
      if (!resp.ok || !json?.success) {
        console.error('❌ [AuthCallback] Backend authentication failed:', json);
        throw new Error(json?.message || 'Google authentication failed');
      }

      console.log('✅ [AuthCallback] Authentication successful!');

      // Persist token and user
      try {
        const token = json.data?.token || json.token;
        const user = json.data?.user || json.user;
        console.log('💾 [AuthCallback] Saving token and user to localStorage');
        localStorage.setItem(ENV.JWT_STORAGE_KEY, token);
        localStorage.setItem(ENV.USER_STORAGE_KEY, JSON.stringify(user));
      } catch (err) {
        console.error('⚠️ [AuthCallback] Failed to save to localStorage:', err);
      }

      // Redirect to home or next page
      const next = sessionStorage.getItem('redirectAfterAuth');
      sessionStorage.removeItem('redirectAfterAuth');
      console.log('🔄 [AuthCallback] Redirecting to:', next || '/src/pages/HomePage.html');
      
      if (next) {
        window.location.replace(next);
      } else {
        window.location.replace('/src/pages/HomePage.html');
      }
    } catch (err: any) {
      console.error('❌ [AuthCallback] Auth callback error:', err);
      if (this.statusEl) {
        this.statusEl.textContent = err?.message || 'Authentication failed.';
      }
    }
  }
}

// Export singleton instance
export const authCallbackController = new AuthCallbackController();

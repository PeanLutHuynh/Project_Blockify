/**
 * Global Initialization Script
 * ULTRA-OPTIMIZED: Instant navbar render, zero delay
 * Render first, verify later
 */

import { authManager } from './services/AuthManager.js';
import { initializeNavbarAuth } from '../shared/components/NavbarAuth.js';
import { loadConfig } from './config/env.js';
import { supabaseService } from './api/supabaseClient.js';

let isInitialized = false;

/**
 * Initialize global app features
 * OPTIMIZED: Render navbar INSTANTLY, then verify in background
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    const navbar = document.querySelector('.navbar-right-icons');
    if (navbar) {
      initializeNavbarAuth('.navbar-right-icons');
    }

    // STEP 1: Load config (fast, local)
    await loadConfig();

    // STEP 2: Initialize Supabase (required for auth)
    await supabaseService.initialize();

    // STEP 3: Initialize AuthManager (background sync, non-blocking)
    await authManager.initialize();

    // STEP 4: Check admin redirect (instant from cache)
    // IMPORTANT: Only redirect if actually authenticated, not just from stale cache
    const currentPath = window.location.pathname;
    const isAdminPage = currentPath.includes('Admin.html');
    const isAuthPage = currentPath.includes('Signin') || 
                       currentPath.includes('Signup') || 
                       currentPath.includes('AuthCallback') ||
                       currentPath.includes('VerifyEmail') ||
                       currentPath.includes('EmailVerified');
    
    // Extra check: Verify user object exists and has valid data
    const user = authManager.getUser();
    const hasValidSession = user && user.id && user.email;
    
    if (hasValidSession && authManager.isAdmin() && !isAdminPage && !isAuthPage) {
      console.log('[Init] Admin user detected, redirecting to admin panel...');
      window.location.href = './Admin.html';
      return;
    }

    isInitialized = true;
  } catch (error) {
    console.error('[Init] Initialization failed:', error);
  }
}

// Auto-initialize ASAP (even before DOMContentLoaded if possible)
if (document.readyState === 'loading') {
  // DOM still loading - wait for it
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });
} else {
  // DOM already loaded - run immediately
  initializeApp();
}

// Export for manual initialization if needed
export { authManager, supabaseService };

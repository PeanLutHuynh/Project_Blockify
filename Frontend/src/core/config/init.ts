/**
 * Frontend Initialization
 * Loads configuration and initializes services
 */

import { loadConfig, ENV } from './env.js';
import { supabaseService } from '../api/supabaseClient.js';
import { authService } from '../services/AuthService.js';
import { cartService } from '../services/CartService.js';

// Immediately load config when this module is imported
export const configPromise = loadConfig();

// Wait for config to be loaded before continuing
export async function waitForConfig(): Promise<void> {
  await configPromise;
}

/**
 * Initialize the application
 * Call this before any other operations
 */
export async function initializeApp(): Promise<void> {
  console.log('🚀 Initializing Blockify frontend...');
  
  try {
    // Step 1: Wait for configuration to load
    await waitForConfig();
    console.log('✅ Configuration loaded');
    
    // Step 2: Initialize Supabase client (async - wait for CDN SDK to load)
    if (ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY) {
      const supabaseInitialized = await supabaseService.initializeAsync();
      if (supabaseInitialized) {
        console.log('✅ Supabase client initialized');
      } else {
        console.error('❌ Failed to initialize Supabase client');
      }
    } else {
      console.warn('⚠️ Supabase configuration missing, auth features may not work');
    }
    
    // Step 3: Initialize auth state listener
    authService.initializeAuthListener();
    console.log('✅ Auth state listener initialized');
    
    // Step 4: Load cart from backend if user is logged in
    await cartService.loadFromBackend();
    
    // Step 5: Update cart badge on page load
    updateCartBadge();
    
    // Step 6: Auth listener will automatically handle session detection and user sync
    // No need to manually check session here
    
    console.log('✅ Blockify frontend initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
  }
}

/**
 * Update cart badge in navbar
 */
export function updateCartBadge(): void {
  const badge = document.querySelector('.cart-badge') as HTMLElement;
  if (badge) {
    const count = cartService.getTotalItemsCount();
    badge.textContent = count.toString();
    badge.classList.toggle('d-none', count === 0);
  }
}

/**
 * Initialize app with DOM ready check
 * Use this in page scripts
 */
export function initializeOnReady(callback?: () => void | Promise<void>): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await initializeApp();
      await callback?.(); // ✅ MUST AWAIT ASYNC CALLBACK
    });
  } else {
    initializeApp().then(async () => await callback?.()); // ✅ MUST AWAIT ASYNC CALLBACK
  }
}


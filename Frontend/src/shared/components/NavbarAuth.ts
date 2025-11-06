/**
 * NavbarAuth Component
 * Handles authentication UI in the navbar
 * Shows user avatar and logout button when logged in
 * Shows sign in/sign up buttons when logged out
 */

import { authService } from "../../core/services/AuthService.js";
import { User } from "../../core/models/User.js";

export class NavbarAuth {
  private containerSelector: string;
  private unsubscribeAuthListener: (() => void) | null = null;
  private currentAuthState: 'authenticated' | 'unauthenticated' | null = null;
  private currentUserId: string | null = null;

  constructor(containerSelector: string = '.navbar-right-icons') {
    this.containerSelector = containerSelector;
  }

  /**
   * Initialize the navbar auth component
   */
  initialize(): void {
    this.render();
    
    // Setup auth state listener
    this.setupAuthStateListener();
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.unsubscribeAuthListener) {
      this.unsubscribeAuthListener();
    }
  }

  /**
   * Setup listener for auth state changes
   */
  private setupAuthStateListener(): void {
    // Listen to Supabase auth state changes
    this.unsubscribeAuthListener = authService.initializeAuthListener();
    
    // Check periodically if auth state changed (as fallback, but less frequently)
    setInterval(() => {
      const user = authService.getUser();
      const isAuth = authService.isAuthenticated();
      const newState = (user && isAuth) ? 'authenticated' : 'unauthenticated';
      const newUserId = user?.id || null;
      
      // Only re-render if state actually changed
      if (this.currentAuthState !== newState || this.currentUserId !== newUserId) {
        console.log('🔄 Auth state changed in NavbarAuth, re-rendering');
        this.render();
      }
    }, 3000); // Check every 3 seconds instead of 1 second
  }

  /**
   * Render the navbar auth UI
   */
  private render(): void {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();
    
    // Update current state
    this.currentAuthState = (user && isAuth) ? 'authenticated' : 'unauthenticated';
    this.currentUserId = user?.id || null;
    
    if (user && isAuth) {
      // User is logged in - show user info and logout
      container.innerHTML = this.renderAuthenticatedState(user);
      this.attachLogoutHandler();
      this.attachAvatarClickHandler();
      this.attachSearchHandler();
    } else {
      // User is not logged in - show sign in/sign up buttons
      container.innerHTML = this.renderUnauthenticatedState();
      this.attachSearchHandler();
    }
  }

  /**
   * Render UI when user is authenticated
   */
  private renderAuthenticatedState(user: User): string {
    const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.getDisplayName())}&background=random`;
    const displayName = user.getDisplayName();
    
    return `
      <a href="#" class="search-icon">
        <i class="bi bi-search" id="openSearch"></i>
      </a>
      <a href="CartPage.html" class="cart-icon">
        <i class="bi bi-cart"></i>
      </a>
      <div class="user-info-wrapper" style="display: flex; align-items: center; gap: 10px;">
        <img 
          src="${avatarUrl}" 
          alt="${displayName}" 
          class="user-avatar"
          id="userAvatar"
          style="width: 32px; height: 32px; border-radius: 50%; cursor: pointer; object-fit: cover;"
          title="View Profile"
        />
        <span class="user-greeting" style="color: white; font-size: 14px;">
          Xin chào, <strong>${displayName}</strong>
        </span>
        <a href="#" class="btn-sign" id="logoutBtn">Đăng xuất</a>
      </div>
    `;
  }

  /**
   * Render UI when user is not authenticated
   */
  private renderUnauthenticatedState(): string {
    return `
      <a href="#" class="search-icon">
        <i class="bi bi-search" id="openSearch"></i>
      </a>
      <a href="CartPage.html" class="cart-icon">
        <i class="bi bi-cart"></i>
      </a>
      <a href="SigninPage.html" class="btn-sign">Đăng nhập</a>
      <a href="SignupPage.html" class="btn-sign">Đăng ký</a>
    `;
  }

  /**
   * Attach logout button click handler
   */
  private attachLogoutHandler(): void {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          await authService.signOut();
          console.log('✅ Logged out successfully');
          
          // Redirect to sign in page
          window.location.href = 'SigninPage.html';
        } catch (error) {
          console.error('❌ Logout failed:', error);
          alert('Logout failed. Please try again.');
        }
      });
    }
  }

  /**
   * Attach avatar click handler
   */
  private attachAvatarClickHandler(): void {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'Account.html';
      });
      
      // Add hover effect
      avatar.style.transition = 'transform 0.2s';
      avatar.addEventListener('mouseenter', () => {
        (avatar as HTMLElement).style.transform = 'scale(1.1)';
      });
      avatar.addEventListener('mouseleave', () => {
        (avatar as HTMLElement).style.transform = 'scale(1)';
      });
    }
  }
  
  /**
   * Attach search button click handler
   */
  private attachSearchHandler(): void {
    const searchIcon = document.getElementById('openSearch');
    const overlay = document.getElementById('overlay');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    
    if (searchIcon && overlay) {
      searchIcon.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
        if (searchInput) searchInput.focus();
      });
    }
    
    if (closeSearch && overlay) {
      closeSearch.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }
    
    // Click outside to close
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.style.display = 'none';
        }
      });
    }
  }
}

// Export factory function for easy initialization
export function initializeNavbarAuth(containerSelector?: string): NavbarAuth {
  const navbarAuth = new NavbarAuth(containerSelector);
  navbarAuth.initialize();
  return navbarAuth;
}

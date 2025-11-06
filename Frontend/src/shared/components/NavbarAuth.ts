/**
 * NavbarAuth Component
 * Handles authentication UI in the navbar
 * Shows user avatar and logout button when logged in
 * Shows sign in/sign up buttons when logged out
 */

import { authManager } from "../../core/services/AuthManager.js";
import { User } from "../../core/models/User.js";

export class NavbarAuth {
  private containerSelector: string;
  private unsubscribeAuth: (() => void) | null = null;
  private isFirstRender = true;

  constructor(containerSelector: string = '.navbar-right-icons') {
    this.containerSelector = containerSelector;
  }

  /**
   * Initialize the navbar auth component
   */
  initialize(): void {
    // ⚡ INSTANT RENDER: Get cached user synchronously (no await!)
    const cachedUser = authManager.getUser();
    
    if (cachedUser) {
      this.render(cachedUser, true);
    } else {
      // No cache, try reading directly from storage (sync)
      const storageUser = this.loadUserFromStorageSync();
      if (storageUser) {
        this.render(storageUser, true);
      } else {
        this.render(null, false);
      }
    }
    
    // Subscribe to auth state changes (for updates only)
    this.unsubscribeAuth = authManager.subscribe((user) => {
      // Only re-render if user actually changed
      const currentUserId = cachedUser?.id;
      if (user?.id !== currentUserId) {
        this.render(user, false);
      }
    });
  }

  /**
   * Load user directly from storage (synchronous, instant)
   * Fallback method when AuthManager not ready yet
   */
  private loadUserFromStorageSync(): any {
    try {
      // Try sessionStorage first (fastest)
      let userData = sessionStorage.getItem('session_user_cache');
      
      // Fallback to localStorage
      if (!userData) {
        userData = localStorage.getItem('user');
      }
      
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
    }
    return null;
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }

  /**
   * Render the navbar auth UI
   * OPTIMIZED: Handle both User objects and plain objects from storage
   */
  private render(user: User | any | null, fromCache: boolean = false): void {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    // Add smooth fade-in on first render
    if (this.isFirstRender && fromCache) {
      container.classList.add('loaded');
      this.isFirstRender = false;
    }

    if (user) {
      // Convert plain object to User if needed
      const userObj = user instanceof User ? user : User.fromApiResponse(user);
      
      // User is logged in - show user info and logout
      container.innerHTML = this.renderAuthenticatedState(userObj);
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
          await authManager.signOut();
          
          // Redirect to sign in page
          window.location.href = 'SigninPage.html';
        } catch (error) {
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

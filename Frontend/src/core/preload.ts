/**
 * Preload Script - Executes BEFORE DOM loads
 * Renders navbar instantly from storage cache
 * Zero delay, zero flash
 */

(function() {
  console.log('[Preload] Executing instant navbar render...');

  // Check if navbar exists in HTML
  const checkAndRender = () => {
    const navbar = document.querySelector('.navbar-right-icons');
    if (!navbar) {
      console.log('[Preload] No navbar found, skipping');
      return;
    }

    try {
      // Try sessionStorage first (fastest)
      let userDataStr = sessionStorage.getItem('session_user_cache');
      
      // Fallback to localStorage
      if (!userDataStr) {
        userDataStr = localStorage.getItem('user');
      }

      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        const avatarUrl = userData.avatarUrl || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || userData.email)}&background=random`;
        const displayName = userData.fullName || userData.username || userData.email?.split('@')[0] || 'User';
                
        // Render authenticated navbar HTML
        navbar.innerHTML = `
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
        
        console.log('✅ [Preload] Navbar rendered instantly from cache!');
      } else {
        console.log('ℹ️ [Preload] No cached user, showing guest navbar');
        
        // Render guest navbar
        navbar.innerHTML = `
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
      
      // Add loaded class for smooth fade-in
      navbar.classList.add('loaded');
      
    } catch (error) {
      console.error('❌ [Preload] Error rendering navbar:', error);
    }
  };

  // Try rendering immediately if DOM ready
  if (document.readyState === 'loading') {
    // DOM not ready yet, wait for interactive state
    document.addEventListener('DOMContentLoaded', checkAndRender);
  } else {
    // DOM already ready, render now
    checkAndRender();
  }
})();

export {}; // Make it a module

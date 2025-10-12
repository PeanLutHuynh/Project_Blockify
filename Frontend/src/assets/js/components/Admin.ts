import { initializeOnReady } from '../../../core/config/init.js';
import { authService } from '../../../core/services/AuthService.js';

// Initialize app and run page logic
initializeOnReady(() => {
  // Check authentication - Admin page requires login
  if (!authService.isAuthenticated()) {
    window.location.href = 'SigninPage.html';
    return;
  }
  
  // Original admin page logic
  initializeAdminPage();
});

function initializeAdminPage() {
  document.querySelectorAll('.menu li').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
      item.classList.add('active');
      const target = item.getAttribute('data-target');
      if (target) {
        const section = document.getElementById(target);
        if (section) section.classList.add('active');
      }
    });
  });
}

import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';

// Initialize app and navbar auth
initializeOnReady(() => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Original code for menu navigation
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
});


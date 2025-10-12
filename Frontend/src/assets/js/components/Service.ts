import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';

// Initialize app and run page logic
initializeOnReady(() => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Original service page logic
  initializeServicePage();
});

function initializeServicePage() {
  // Animate service cards on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).style.opacity = '1';
        (entry.target as HTMLElement).style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe all service cards
  document.querySelectorAll('.service-card, .feature-card').forEach(el => {
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.transform = 'translateY(30px)';
    (el as HTMLElement).style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}

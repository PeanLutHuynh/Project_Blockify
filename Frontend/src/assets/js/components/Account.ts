import { AccountController } from "../../../modules/user/AccountController.js";
import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';

// Handle main tab switching (Personal Info, Order, Wishlist...)
function showTab(tabId: string, element: HTMLElement): void {
  document.querySelectorAll('.tab-pane').forEach(div => {
    div.classList.remove('active');
  });
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  element.classList.add('active');
  
  // If switching to wishlist tab, reload wishlist
  if (tabId === 'wishlist' && (window as any).accountControllerInstance) {
    const controller = (window as any).accountControllerInstance;
    if (controller && typeof controller.loadWishlist === 'function') {
      controller.loadWishlist();
    }
  }
}

// Make showTab globally available immediately
(window as any).showTab = showTab;

// Initialize AccountController when page loads
initializeOnReady(() => {
  // Initialize NavbarAuth component for authentication state in navbar
  initializeNavbarAuth();
  
  // Initialize Search controller (UC3 - Thanh tìm kiếm)
  initializeSearch();
  
  // Initialize AccountController
  new AccountController();
});

// Handle small tabs in Order section
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.orders-tabs .nav-link').forEach(tab => {
    tab.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.preventDefault();
      document.querySelectorAll('.orders-tabs .nav-link').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.shop-block').forEach(order => {
        if (order instanceof HTMLElement) order.style.display = "none";
      });
      let status = this.getAttribute('data-status');
      if (status === "All") {
        document.querySelectorAll('.shop-block').forEach(order => {
          if (order instanceof HTMLElement) order.style.display = "block";
        });
      } else {
        document.querySelectorAll('.shop-block').forEach(order => {
          const orderStatus = order.querySelector('.shop-header div:last-child')?.textContent?.trim() || '';
          if (orderStatus.includes(status || '')) {
            if (order instanceof HTMLElement) order.style.display = "block";
          }
        });
      }
    });
  });
});
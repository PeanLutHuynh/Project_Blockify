import { SearchController } from '../../modules/search/SearchController.js';

/**
 * Initialize Search Component
 * This should be called on every page that has search functionality
 */
let searchControllerInstance: SearchController | null = null;

export function initializeSearch(): void {
  // Only initialize once
  if (searchControllerInstance) {
    return;
  }

  // Check if search elements exist on this page
  const searchInput = document.getElementById('searchInput');
  const overlay = document.getElementById('overlay');

  if (searchInput && overlay) {
    searchControllerInstance = new SearchController();
    console.log('✅ Search controller initialized');
  } else {
    console.warn('⚠️ Search elements not found on this page');
  }
}

/**
 * Get search controller instance
 */
export function getSearchController(): SearchController | null {
  return searchControllerInstance;
}

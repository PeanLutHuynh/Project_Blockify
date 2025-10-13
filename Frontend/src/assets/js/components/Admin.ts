import { AdminController } from '../../../modules/admin/AdminController.js';
import { loadConfig } from '../../../core/config/env.js';

/**
 * Admin Page Entry Point
 * Initializes AdminController when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait for ENV to be loaded
    await loadConfig();
    
    // Initialize AdminController
    const adminController = new AdminController();
    await adminController.initialize();
  } catch (error) {
    console.error('Failed to initialize Admin Controller:', error);
  }
});

/**
 * Admin User Routes
 * Admin-only routes for user management
 */

import { Router } from '../../../infrastructure/http/Router';
import { AdminUserController } from '../presentation/AdminUserController';
import { UserProfileService } from '../application/UserProfileService';

// Dependency injection
const userProfileService = new UserProfileService();
const adminUserController = new AdminUserController(userProfileService);

export function createAdminUserRouter(): Router {
  const router = new Router();

  // Admin user search and management
  router.addRoute('GET', '/search', (req, res) => adminUserController.searchUsers(req, res));
  router.addRoute('GET', '/:userId', (req, res) => adminUserController.getUserProfile(req, res));
  router.addRoute('PUT', '/:userId/suspend', (req, res) => adminUserController.suspendUser(req, res));
  router.addRoute('PUT', '/:userId/activate', (req, res) => adminUserController.activateUser(req, res));

  return router;
}

export default createAdminUserRouter();

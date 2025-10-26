import { Router } from '../../../infrastructure/http/Router';
import { UserController } from '../presentation/UserController';
import { UserService } from '../application/UserService';
import { UserRepository } from '../infrastructure/UserRepository';
import { UserProfileController } from '../presentation/UserProfileController';
import { UserProfileService } from '../application/UserProfileService';
import { authenticateToken } from '../../../infrastructure/auth/authMiddleware';
import { multipartMiddleware } from '../../../infrastructure/upload/MultipartParser';

// Dependency injection
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Profile management dependencies
const userProfileService = new UserProfileService();
const userProfileController = new UserProfileController(userProfileService);

export function createUserRouter(): Router {
  const router = new Router();

  // Public routes (no auth required)
  router.addRoute('GET', '/', (req, res) => userController.getAll(req, res));
  router.addRoute('GET', '/active', (req, res) => userController.getActiveUsers(req, res));
  router.addRoute('POST', '/', (req, res) => userController.createUser(req, res));

  // Protected routes (auth required) - Apply middleware wrapper
  router.addRoute('GET', '/me', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.getCurrentUserProfile(req, res);
    });
  });

  router.addRoute('GET', '/:id', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.getById(req, res);
    });
  });

  router.addRoute('GET', '/email/:email', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.getUserByEmail(req, res);
    });
  });

  router.addRoute('PUT', '/:id', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.update(req, res);
    });
  });

  router.addRoute('PATCH', '/:id/profile', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.updateUserProfile(req, res);
    });
  });

  router.addRoute('PATCH', '/:id/deactivate', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.deactivateUser(req, res);
    });
  });

  router.addRoute('DELETE', '/:id', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userController.delete(req, res);
    });
  });

  // Profile Management routes (UC2) - Protected
  router.addRoute('GET', '/:userId/profile', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.getProfile(req, res);
    });
  });

  router.addRoute('PUT', '/:userId/profile', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.updateProfile(req, res);
    });
  });

  // Avatar Upload route - Protected (with multipart middleware)
  router.addRoute('POST', '/:userId/avatar', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await multipartMiddleware()(req, res, async () => {
        await userProfileController.uploadAvatar(req, res);
      });
    });
  });
  
  // Address Management routes - Protected
  router.addRoute('GET', '/:userId/addresses', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.getAddresses(req, res);
    });
  });

  router.addRoute('POST', '/:userId/addresses', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.addAddress(req, res);
    });
  });

  router.addRoute('PUT', '/:userId/addresses/:addressId', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.updateAddress(req, res);
    });
  });

  router.addRoute('DELETE', '/:userId/addresses/:addressId', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.deleteAddress(req, res);
    });
  });

  router.addRoute('PUT', '/:userId/addresses/:addressId/default', async (req, res) => {
    await authenticateToken(req, res, async () => {
      await userProfileController.setDefaultAddress(req, res);
    });
  });

  return router;
}

export default createUserRouter();
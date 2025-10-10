import { Router } from '../../../infrastructure/http/Router';
import { UserController } from '../presentation/UserController';
import { UserService } from '../application/UserService';
import { UserRepository } from '../infrastructure/UserRepository';

// Dependency injection
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export function createUserRouter(): Router {
  const router = new Router();

  // REST API routes
  router.addRoute('GET', '/', (req, res) => userController.getAll(req, res));
  router.addRoute('GET', '/active', (req, res) => userController.getActiveUsers(req, res));
  router.addRoute('GET', '/me', (req, res) => userController.getCurrentUserProfile(req, res));
  router.addRoute('GET', '/:id', (req, res) => userController.getById(req, res));
  router.addRoute('GET', '/email/:email', (req, res) => userController.getUserByEmail(req, res));
  router.addRoute('POST', '/', (req, res) => userController.createUser(req, res));
  router.addRoute('PUT', '/:id', (req, res) => userController.update(req, res));
  router.addRoute('PATCH', '/:id/profile', (req, res) => userController.updateUserProfile(req, res));
  router.addRoute('PATCH', '/:id/deactivate', (req, res) => userController.deactivateUser(req, res));
  router.addRoute('DELETE', '/:id', (req, res) => userController.delete(req, res));

  return router;
}

export default createUserRouter();
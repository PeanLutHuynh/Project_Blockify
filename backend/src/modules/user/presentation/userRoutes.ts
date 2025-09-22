import { Router } from 'express';
import { UserController } from '../presentation/UserController';
import { UserService } from '../application/UserService';
import { UserRepository } from '../infrastructure/UserRepository';

// Dependency injection
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const router = Router();

// REST API routes
router.get('/', (req, res) => userController.getAll(req, res));
router.get('/active', (req, res) => userController.getActiveUsers(req, res));
router.get('/:id', (req, res) => userController.getById(req, res));
router.get('/email/:email', (req, res) => userController.getUserByEmail(req, res));
router.post('/', (req, res) => userController.createUser(req, res));
router.put('/:id', (req, res) => userController.update(req, res));
router.patch('/:id/profile', (req, res) => userController.updateUserProfile(req, res));
router.patch('/:id/deactivate', (req, res) => userController.deactivateUser(req, res));
router.delete('/:id', (req, res) => userController.delete(req, res));

export default router;
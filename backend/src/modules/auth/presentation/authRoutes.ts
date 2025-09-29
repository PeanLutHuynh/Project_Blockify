import { Router } from 'express';
import { AuthController } from './AuthController';
import { AuthService } from '../application/AuthService';
import { UserRepository } from '../../user/infrastructure/UserRepository';
import { authenticateToken } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { body } from 'express-validator';

// Create dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

const router = Router();

// Validation rules
const signUpValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  validateRequest
];

const signInValidation = [
  body('identifier').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

const googleAuthValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('authUid').notEmpty().withMessage('Auth UID is required'),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL'),
  validateRequest
];

// Auth routes
router.post('/signup', signUpValidation, authController.signUp);
router.post('/signin', signInValidation, authController.signIn);
router.post('/google', googleAuthValidation, authController.googleAuth);
router.post('/verify-token', authController.verifyToken);
router.get('/me', authenticateToken, authController.me);

export { router as authRoutes };
import { Router } from '../../../infrastructure/http/Router';
import { AuthController } from './AuthController';
import { AuthService } from '../application/AuthService';
import { UserRepository } from '../../user/infrastructure/UserRepository';
import { authenticateToken } from '../../../infrastructure/auth/authMiddleware';
import { Validator } from '../../../infrastructure/validation/Validator';

// Create dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

const router = new Router();

// Validation rules using custom Validator
const signUpValidation = Validator.validate([
  Validator.field('email').required().isEmail('Valid email is required'),
  Validator.field('password').required().minLength(8, 'Password must be at least 8 characters long'),
  Validator.field('fullName').required('Full name is required'),
  Validator.field('username').required().minLength(3, 'Username must be at least 3 characters long')
    .custom((value) => /^(?=\p{L})[\p{L}0-9]+(?:[_\-.][\p{L}0-9]+)*$/u.test(value), 'Username can only contain letters, numbers, and underscores'),
  Validator.field('gender').optional().custom((value) => !value || ['male', 'female'].includes(value), 'Gender must be male or female'),
]);

const signInValidation = Validator.validate([
  Validator.field('identifier').required('Username or email is required'),
  Validator.field('password').required('Password is required'),
]);

const googleAuthValidation = Validator.validate([
  Validator.field('email').required().isEmail('Valid email is required'),
  Validator.field('fullName').required('Full name is required'),
  Validator.field('authUid').required('Auth UID is required'),
  Validator.field('avatarUrl').optional().custom((value) => !value || /^https?:\/\/.+/.test(value), 'Avatar URL must be a valid URL'),
]);

const verifyEmailValidation = Validator.validate([
  Validator.field('token').required('Verification token is required'),
  Validator.field('type').optional().custom((value) => !value || ['signup', 'magiclink'].includes(value), 'Type must be signup or magiclink'),
]);

const resendVerificationValidation = Validator.validate([
  Validator.field('email').required().isEmail('Valid email is required'),
]);

// Auth routes with custom Router
router.post('/signup', signUpValidation, authController.signUp);
router.post('/signin', signInValidation, authController.signIn);
router.post('/google', googleAuthValidation, authController.googleAuth);
router.post('/verify-email', verifyEmailValidation, authController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, authController.resendVerification);
router.post('/verify-token', authController.verifyToken);
router.get('/me', authenticateToken, authController.me);

export { router as authRoutes };

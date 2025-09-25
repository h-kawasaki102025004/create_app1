import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/register',
  RateLimitMiddleware.createAccountLimiter,
  ValidationMiddleware.validateRegistration,
  authController.register
);

router.post(
  '/login',
  RateLimitMiddleware.loginLimiter,
  ValidationMiddleware.validateLogin,
  authController.login
);

router.post(
  '/refresh',
  RateLimitMiddleware.tokenLimiter,
  ValidationMiddleware.validateRefreshToken,
  authController.refreshToken
);

router.post(
  '/request-password-reset',
  RateLimitMiddleware.passwordResetLimiter,
  ValidationMiddleware.validatePasswordResetRequest,
  authController.requestPasswordReset
);

router.post(
  '/reset-password/:token',
  RateLimitMiddleware.passwordResetLimiter,
  ValidationMiddleware.validatePasswordReset,
  authController.resetPassword
);

router.get(
  '/verify-email/:token',
  ValidationMiddleware.validateEmailVerification,
  authController.verifyEmail
);

// Protected routes
router.use(AuthMiddleware.authenticate);

router.get('/me', authController.getCurrentUser);

router.post('/logout', authController.logout);

router.post(
  '/change-password',
  ValidationMiddleware.validatePasswordChange,
  authController.changePassword
);

router.post(
  '/deactivate',
  ValidationMiddleware.validateAccountDeactivation,
  authController.deactivateAccount
);

export default router;
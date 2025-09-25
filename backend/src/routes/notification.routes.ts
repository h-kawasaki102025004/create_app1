import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const notificationController = new NotificationController();

router.use(AuthMiddleware.authenticate);

router.get('/', RateLimitMiddleware.apiLimiter, notificationController.getAll);

router.get('/unread', RateLimitMiddleware.apiLimiter, notificationController.getUnread);

router.patch(
  '/:id/read',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  notificationController.markAsRead
);

router.patch('/mark-all-read', RateLimitMiddleware.apiLimiter, notificationController.markAllAsRead);

router.delete(
  '/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  notificationController.delete
);

export default router;
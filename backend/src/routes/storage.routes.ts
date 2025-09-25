import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const storageController = new StorageController();

router.use(AuthMiddleware.authenticate);

router.get(
  '/:category',
  RateLimitMiddleware.apiLimiter,
  storageController.getStorageAdvice
);

router.get(
  '/tips/search',
  RateLimitMiddleware.searchLimiter,
  ValidationMiddleware.validateSearch,
  storageController.searchTips
);

export default router;
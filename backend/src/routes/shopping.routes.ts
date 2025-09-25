import { Router } from 'express';
import { ShoppingController } from '../controllers/shopping.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const shoppingController = new ShoppingController();

router.use(AuthMiddleware.authenticate);

router.get('/', RateLimitMiddleware.apiLimiter, shoppingController.getList);

router.post('/generate', RateLimitMiddleware.apiLimiter, shoppingController.generateList);

router.patch(
  '/:id/purchased',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  shoppingController.markAsPurchased
);

router.delete(
  '/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  shoppingController.removeItem
);

export default router;
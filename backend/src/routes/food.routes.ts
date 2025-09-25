import { Router } from 'express';
import { FoodController } from '../controllers/food.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const foodController = new FoodController();

// All food routes require authentication
router.use(AuthMiddleware.authenticate);

// Food CRUD operations
router.get('/', RateLimitMiddleware.apiLimiter, foodController.getAll);

router.post(
  '/',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateFoodCreation,
  foodController.create
);

router.get(
  '/search',
  RateLimitMiddleware.searchLimiter,
  ValidationMiddleware.validateSearch,
  foodController.search
);

router.get('/expiring', RateLimitMiddleware.apiLimiter, foodController.getExpiring);

router.get('/expired', RateLimitMiddleware.apiLimiter, foodController.getExpired);

router.get('/stats', RateLimitMiddleware.apiLimiter, foodController.getStats);

router.get('/ingredients', RateLimitMiddleware.apiLimiter, foodController.getIngredients);

router.get('/storage-advice', RateLimitMiddleware.apiLimiter, foodController.getStorageAdvice);

router.post(
  '/bulk-consume',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateBulkConsume,
  foodController.bulkMarkAsConsumed
);

router.get(
  '/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  foodController.getById
);

router.put(
  '/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  ValidationMiddleware.validateFoodUpdate,
  foodController.update
);

router.delete(
  '/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  foodController.delete
);

router.patch(
  '/:id/consume',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  foodController.markAsConsumed
);

router.patch(
  '/:id/expire',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  foodController.markAsExpired
);

export default router;
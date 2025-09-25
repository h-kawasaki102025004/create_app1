import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const categoryController = new CategoryController();

router.use(AuthMiddleware.authenticate);

router.get('/', RateLimitMiddleware.apiLimiter, categoryController.getAll);

export default router;
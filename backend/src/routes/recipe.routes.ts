import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();
const recipeController = new RecipeController();

router.use(AuthMiddleware.authenticate);

router.get(
  '/suggestions',
  RateLimitMiddleware.searchLimiter,
  recipeController.getSuggestions
);

router.get(
  '/search',
  RateLimitMiddleware.searchLimiter,
  ValidationMiddleware.validateSearch,
  recipeController.search
);

router.post(
  '/favorite/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  recipeController.addToFavorites
);

router.delete(
  '/favorite/:id',
  RateLimitMiddleware.apiLimiter,
  ValidationMiddleware.validateIdParam,
  recipeController.removeFromFavorites
);

router.get('/favorites', RateLimitMiddleware.apiLimiter, recipeController.getFavorites);

export default router;
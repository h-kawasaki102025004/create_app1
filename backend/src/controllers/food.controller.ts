import { Request, Response } from 'express';
import { FoodService } from '../services/food.service';
import { FoodCreateData, FoodUpdateData, FoodFilterOptions, AppError, ValidationError } from '@shared/types';
import { getCurrentUser } from '../middleware/auth.middleware';

export class FoodController {
  private foodService: FoodService;

  constructor() {
    this.foodService = new FoodService();
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodData: FoodCreateData = req.body;

      const food = await this.foodService.createFood(user.id, foodData);

      res.status(201).json({
        success: true,
        data: { food },
        message: 'Food created successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);

      // Parse query parameters
      const filters: FoodFilterOptions = {
        categories: req.query.categories ? (req.query.categories as string).split(',').map(Number) : undefined,
        storage_locations: req.query.storage_locations ? (req.query.storage_locations as string).split(',') : undefined,
        status: req.query.status ? [(req.query.status as string)] : undefined,
        expiry_within_days: req.query.expiry_within_days ? parseInt(req.query.expiry_within_days as string) : undefined,
        search: req.query.search as string,
        sort_by: req.query.sort_by as FoodFilterOptions['sort_by'],
        sort_order: req.query.sort_order as FoodFilterOptions['sort_order']
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        per_page: req.query.per_page ? parseInt(req.query.per_page as string) : undefined
      };

      const result = await this.foodService.getUserFoods(user.id, filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Foods retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodId = parseInt(req.params.id);

      if (isNaN(foodId)) {
        throw new AppError('Invalid food ID', 400);
      }

      const food = await this.foodService.getFoodById(user.id, foodId);

      res.status(200).json({
        success: true,
        data: { food },
        message: 'Food retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodId = parseInt(req.params.id);
      const updateData: FoodUpdateData = req.body;

      if (isNaN(foodId)) {
        throw new AppError('Invalid food ID', 400);
      }

      const food = await this.foodService.updateFood(user.id, foodId, updateData);

      res.status(200).json({
        success: true,
        data: { food },
        message: 'Food updated successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodId = parseInt(req.params.id);

      if (isNaN(foodId)) {
        throw new AppError('Invalid food ID', 400);
      }

      await this.foodService.deleteFood(user.id, foodId);

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  };

  markAsConsumed = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodId = parseInt(req.params.id);

      if (isNaN(foodId)) {
        throw new AppError('Invalid food ID', 400);
      }

      const food = await this.foodService.markAsConsumed(user.id, foodId);

      res.status(200).json({
        success: true,
        data: { food },
        message: 'Food marked as consumed'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  markAsExpired = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const foodId = parseInt(req.params.id);

      if (isNaN(foodId)) {
        throw new AppError('Invalid food ID', 400);
      }

      const food = await this.foodService.markAsExpired(user.id, foodId);

      res.status(200).json({
        success: true,
        data: { food },
        message: 'Food marked as expired'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getExpiring = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const daysThreshold = req.query.days ? parseInt(req.query.days as string) : 3;

      const foods = await this.foodService.getExpiringFoods(user.id, daysThreshold);

      res.status(200).json({
        success: true,
        data: { foods, count: foods.length },
        message: 'Expiring foods retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getExpired = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);

      const foods = await this.foodService.getExpiredFoods(user.id);

      res.status(200).json({
        success: true,
        data: { foods, count: foods.length },
        message: 'Expired foods retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);

      const stats = await this.foodService.getInventoryStats(user.id);

      res.status(200).json({
        success: true,
        data: { stats },
        message: 'Inventory stats retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  search = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const searchTerm = req.query.q as string;

      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new AppError('Search term must be at least 2 characters', 400);
      }

      const foods = await this.foodService.searchFoods(user.id, searchTerm);

      res.status(200).json({
        success: true,
        data: { foods, count: foods.length },
        message: 'Search completed successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getIngredients = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);

      const ingredients = await this.foodService.getFoodIngredients(user.id);

      res.status(200).json({
        success: true,
        data: { ingredients },
        message: 'Food ingredients retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  bulkMarkAsConsumed = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const { food_ids } = req.body;

      if (!Array.isArray(food_ids) || food_ids.length === 0) {
        throw new AppError('Food IDs array is required', 400);
      }

      const updatedCount = await this.foodService.bulkMarkAsConsumed(user.id, food_ids);

      res.status(200).json({
        success: true,
        data: { updated_count: updatedCount },
        message: `${updatedCount} foods marked as consumed`
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getStorageAdvice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { food_name, category } = req.query;

      if (!food_name) {
        throw new AppError('Food name is required', 400);
      }

      const advice = await this.foodService.getStorageAdvice(
        food_name as string,
        category as string
      );

      res.status(200).json({
        success: true,
        data: { advice },
        message: advice ? 'Storage advice found' : 'No storage advice available for this food'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private handleError(res: Response, error: unknown): void {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        errors: error.errors
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Unexpected error in FoodController:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
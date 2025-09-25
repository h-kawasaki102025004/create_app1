import { FoodRepository } from '../repositories/food.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { StorageTipRepository } from '../repositories/storage-tip.repository';
import {
  Food,
  FoodCreateData,
  FoodUpdateData,
  FoodFilterOptions,
  PaginatedResponse,
  AppError,
  ValidationError,
  StorageLocation
} from '@shared/types';
import { ValidationUtils, DateUtils } from '@shared/utils';

export class FoodService {
  private foodRepository: FoodRepository;
  private categoryRepository: CategoryRepository;
  private notificationRepository: NotificationRepository;
  private storageTipRepository: StorageTipRepository;

  constructor() {
    this.foodRepository = new FoodRepository();
    this.categoryRepository = new CategoryRepository();
    this.notificationRepository = new NotificationRepository();
    this.storageTipRepository = new StorageTipRepository();
  }

  async createFood(userId: number, foodData: FoodCreateData): Promise<Food> {
    // Validate input data
    await this.validateFoodData(foodData);

    // Check if category exists
    const category = await this.categoryRepository.findById(foodData.category_id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Auto-adjust expiry date based on storage advice if available
    const adjustedFoodData = await this.adjustExpiryDateBasedOnStorage(foodData);

    // Create food
    const food = await this.foodRepository.create({
      ...adjustedFoodData,
      user_id: userId,
      status: 'active'
    });

    // Create notification if food is expiring soon
    await this.checkAndCreateExpiryNotification(food);

    // Log user action
    await this.logUserAction(userId, 'create', 'food', food.id);

    return food;
  }

  async getUserFoods(
    userId: number,
    filters?: FoodFilterOptions,
    pagination?: { page?: number; per_page?: number }
  ): Promise<PaginatedResponse<any>> {
    if (pagination) {
      return this.foodRepository.findByUserIdWithPagination(userId, {
        ...filters,
        ...pagination
      });
    }

    const foods = await this.foodRepository.findByUserId(userId, filters);
    return {
      items: foods,
      total_count: foods.length,
      page: 1,
      per_page: foods.length,
      total_pages: 1,
      has_next: false,
      has_prev: false
    };
  }

  async getFoodById(userId: number, foodId: number): Promise<Food> {
    const food = await this.foodRepository.findById(foodId);

    if (!food || food.user_id !== userId) {
      throw new AppError('Food not found', 404);
    }

    return food;
  }

  async updateFood(userId: number, foodId: number, updateData: FoodUpdateData): Promise<Food> {
    // Check if food exists and belongs to user
    const existingFood = await this.getFoodById(userId, foodId);

    // Validate update data
    await this.validateFoodUpdateData(updateData);

    // If category is being changed, validate it exists
    if (updateData.category_id) {
      const category = await this.categoryRepository.findById(updateData.category_id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }
    }

    // Auto-adjust expiry date if storage location changed
    let adjustedUpdateData = updateData;
    if (updateData.storage_location && updateData.storage_location !== existingFood.storage_location) {
      adjustedUpdateData = await this.adjustExpiryDateBasedOnStorage({
        ...existingFood,
        ...updateData
      });
    }

    // Update food
    const updatedFood = await this.foodRepository.update(foodId, adjustedUpdateData);
    if (!updatedFood) {
      throw new AppError('Failed to update food', 500);
    }

    // Check if we need to create/update notifications
    if (updateData.expiry_date || updateData.status) {
      await this.checkAndCreateExpiryNotification(updatedFood);
    }

    // Log user action
    await this.logUserAction(userId, 'update', 'food', foodId, existingFood, updatedFood);

    return updatedFood;
  }

  async deleteFood(userId: number, foodId: number): Promise<void> {
    // Check if food exists and belongs to user
    const food = await this.getFoodById(userId, foodId);

    // Delete related notifications
    await this.notificationRepository.deleteByFoodId(foodId);

    // Delete food
    const deleted = await this.foodRepository.delete(foodId);
    if (!deleted) {
      throw new AppError('Failed to delete food', 500);
    }

    // Log user action
    await this.logUserAction(userId, 'delete', 'food', foodId, food);
  }

  async markAsConsumed(userId: number, foodId: number): Promise<Food> {
    const food = await this.getFoodById(userId, foodId);

    const updatedFood = await this.foodRepository.markAsConsumed(foodId, userId);
    if (!updatedFood) {
      throw new AppError('Failed to mark food as consumed', 500);
    }

    // Remove expiry notifications for this food
    await this.notificationRepository.deleteByFoodId(foodId);

    // Log user action
    await this.logUserAction(userId, 'consume', 'food', foodId);

    return updatedFood;
  }

  async markAsExpired(userId: number, foodId: number): Promise<Food> {
    const food = await this.getFoodById(userId, foodId);

    const updatedFood = await this.foodRepository.markAsExpired(foodId, userId);
    if (!updatedFood) {
      throw new AppError('Failed to mark food as expired', 500);
    }

    // Log user action
    await this.logUserAction(userId, 'expire', 'food', foodId);

    return updatedFood;
  }

  async getExpiringFoods(userId: number, daysThreshold: number = 3): Promise<any[]> {
    return this.foodRepository.findExpiringFoods(userId, daysThreshold);
  }

  async getExpiredFoods(userId: number): Promise<any[]> {
    return this.foodRepository.findExpiredFoods(userId);
  }

  async getInventoryStats(userId: number): Promise<any> {
    return this.foodRepository.getInventoryStats(userId);
  }

  async searchFoods(userId: number, searchTerm: string): Promise<any[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    return this.foodRepository.searchFoodsByName(userId, searchTerm);
  }

  async getFoodIngredients(userId: number): Promise<string[]> {
    return this.foodRepository.getFoodIngredients(userId);
  }

  async bulkMarkAsConsumed(userId: number, foodIds: number[]): Promise<number> {
    // Verify all foods belong to the user
    const foods = await this.foodRepository.findByIds(foodIds);
    const userFoods = foods.filter(food => (food as any).user_id === userId);

    if (userFoods.length !== foodIds.length) {
      throw new AppError('Some foods not found or do not belong to user', 404);
    }

    const updatedCount = await this.foodRepository.bulkUpdateStatus(foodIds, 'consumed', userId);

    // Remove notifications for these foods
    for (const foodId of foodIds) {
      await this.notificationRepository.deleteByFoodId(foodId);
    }

    // Log user action
    await this.logUserAction(userId, 'bulk_consume', 'food', undefined, { count: updatedCount });

    return updatedCount;
  }

  async getStorageAdvice(foodName: string, category?: string): Promise<any> {
    return this.storageTipRepository.findByFoodName(foodName, category);
  }

  async checkExpiringFoodsForUser(userId: number, daysThreshold: number = 3): Promise<void> {
    const expiringFoods = await this.getExpiringFoods(userId, daysThreshold);

    for (const food of expiringFoods) {
      await this.checkAndCreateExpiryNotification(food);
    }
  }

  private async validateFoodData(data: FoodCreateData): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      errors.name = ['Food name is required'];
    } else if (data.name.length > 100) {
      errors.name = ['Food name must not exceed 100 characters'];
    }

    // Validate dates
    if (!ValidationUtils.isValidDate(data.purchase_date)) {
      errors.purchase_date = ['Invalid purchase date'];
    }

    if (!ValidationUtils.isValidDate(data.expiry_date)) {
      errors.expiry_date = ['Invalid expiry date'];
    }

    if (ValidationUtils.isValidDate(data.purchase_date) && ValidationUtils.isValidDate(data.expiry_date)) {
      const purchaseDate = DateUtils.parseDate(data.purchase_date);
      const expiryDate = DateUtils.parseDate(data.expiry_date);

      if (expiryDate < purchaseDate) {
        errors.expiry_date = ['Expiry date cannot be before purchase date'];
      }
    }

    // Validate quantity
    if (!ValidationUtils.isValidQuantity(data.quantity)) {
      errors.quantity = ['Quantity must be a positive number'];
    }

    // Validate unit
    if (!data.unit || data.unit.trim().length === 0) {
      errors.unit = ['Unit is required'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  private async validateFoodUpdateData(data: FoodUpdateData): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.name = ['Food name cannot be empty'];
      } else if (data.name.length > 100) {
        errors.name = ['Food name must not exceed 100 characters'];
      }
    }

    // Validate dates if provided
    if (data.purchase_date && !ValidationUtils.isValidDate(data.purchase_date)) {
      errors.purchase_date = ['Invalid purchase date'];
    }

    if (data.expiry_date && !ValidationUtils.isValidDate(data.expiry_date)) {
      errors.expiry_date = ['Invalid expiry date'];
    }

    // Validate quantity if provided
    if (data.quantity !== undefined && !ValidationUtils.isValidQuantity(data.quantity)) {
      errors.quantity = ['Quantity must be a positive number'];
    }

    // Validate unit if provided
    if (data.unit !== undefined && (!data.unit || data.unit.trim().length === 0)) {
      errors.unit = ['Unit cannot be empty'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  private async adjustExpiryDateBasedOnStorage(foodData: any): Promise<any> {
    if (!foodData.storage_location || !foodData.name) {
      return foodData;
    }

    const storageTip = await this.storageTipRepository.findByFoodName(foodData.name);
    if (storageTip && storageTip.storage_method === foodData.storage_location) {
      // Calculate new expiry date based on storage advice
      const purchaseDate = DateUtils.parseDate(foodData.purchase_date);
      const suggestedExpiryDate = DateUtils.addDaysToDate(purchaseDate, storageTip.shelf_life_days);

      // Only adjust if the suggested date is later than the current expiry date
      const currentExpiryDate = DateUtils.parseDate(foodData.expiry_date);
      const suggestedDate = DateUtils.parseDate(suggestedExpiryDate);

      if (suggestedDate > currentExpiryDate) {
        return {
          ...foodData,
          expiry_date: suggestedExpiryDate
        };
      }
    }

    return foodData;
  }

  private async checkAndCreateExpiryNotification(food: Food): Promise<void> {
    if (food.status !== 'active') {
      return;
    }

    const daysUntilExpiry = DateUtils.getDaysUntilExpiry(food.expiry_date);

    // Create notification if food is expiring soon (within 3 days) or expired
    if (daysUntilExpiry <= 3) {
      const existingNotification = await this.notificationRepository.findByUserAndFood(
        food.user_id,
        food.id,
        'expiry_alert'
      );

      if (!existingNotification) {
        let title: string;
        let message: string;
        let priority: 'high' | 'medium' | 'low' = 'medium';

        if (daysUntilExpiry < 0) {
          title = '期限切れの食品があります';
          message = `${food.name}が期限切れです（${Math.abs(daysUntilExpiry)}日経過）`;
          priority = 'high';
        } else if (daysUntilExpiry === 0) {
          title = '本日期限切れの食品があります';
          message = `${food.name}が本日期限切れです！早めにお使いください。`;
          priority = 'high';
        } else if (daysUntilExpiry === 1) {
          title = '明日期限切れの食品があります';
          message = `${food.name}が明日期限切れです。使い切りレシピをチェックしましょう！`;
          priority = 'high';
        } else {
          title = '期限切れ間近の食品があります';
          message = `${food.name}があと${daysUntilExpiry}日で期限切れです。`;
          priority = 'medium';
        }

        await this.notificationRepository.create({
          user_id: food.user_id,
          food_id: food.id,
          type: 'expiry_alert',
          title,
          message,
          priority,
          sent_at: new Date()
        });
      }
    }
  }

  private async logUserAction(
    userId: number,
    action: string,
    entityType: string,
    entityId?: number,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    // TODO: Implement audit logging
    console.log(`User ${userId} performed action: ${action} on ${entityType} ${entityId}`);
  }
}
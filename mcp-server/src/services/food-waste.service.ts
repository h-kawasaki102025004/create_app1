import { DatabaseService } from './database.service.js';
import { AIService, Recipe, BarcodeProduct } from './ai.service.js';

export interface FoodInventoryFilter {
  user_id: number;
  status?: 'active' | 'consumed' | 'expired' | 'disposed';
  category_id?: number;
  expiring_soon?: boolean;
}

export interface AddFoodItemRequest {
  user_id: number;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  storage_location?: string;
  barcode?: string;
  notes?: string;
}

export interface RecipeSuggestionRequest {
  user_id: number;
  ingredient_preferences?: string[];
  dietary_restrictions?: string[];
  max_recipes?: number;
}

export interface ShoppingListRequest {
  user_id: number;
  recipe_ids?: number[];
}

export interface StorageAdviceRequest {
  food_name: string;
  category?: string;
}

export class FoodWasteService {
  constructor(
    private databaseService: DatabaseService,
    private aiService: AIService
  ) {}

  async getFoodInventory(filter: FoodInventoryFilter): Promise<any[]> {
    return await this.databaseService.getFoodInventory(filter.user_id, filter);
  }

  async addFoodItem(request: AddFoodItemRequest): Promise<any> {
    // Validate expiry date is after purchase date
    const purchaseDate = new Date(request.purchase_date);
    const expiryDate = new Date(request.expiry_date);

    if (expiryDate < purchaseDate) {
      throw new Error('Expiry date cannot be before purchase date');
    }

    const food = await this.databaseService.addFoodItem(request);

    // Create notification for expiry warning
    await this.createExpiryNotification(food);

    return food;
  }

  async updateFoodStatus(userId: number, foodId: number, status: string): Promise<any> {
    const food = await this.databaseService.updateFoodStatus(userId, foodId, status);

    if (!food) {
      throw new Error('Food item not found');
    }

    // Update statistics based on status change
    await this.updateWasteStatistics(userId, status);

    return food;
  }

  async getRecipeSuggestions(request: RecipeSuggestionRequest): Promise<Recipe[]> {
    // Get user's available ingredients
    const availableIngredients = await this.databaseService.getUserIngredients(request.user_id);

    if (availableIngredients.length === 0) {
      return [];
    }

    // Combine with user preferences
    const ingredients = request.ingredient_preferences
      ? [...new Set([...availableIngredients, ...request.ingredient_preferences])]
      : availableIngredients;

    const aiRequest = {
      ingredients,
      dietary_restrictions: request.dietary_restrictions,
      max_recipes: request.max_recipes || 5
    };

    const recipes = await this.aiService.generateRecipeSuggestions(aiRequest);

    // Save recipe suggestions to database for future reference
    await this.saveRecipeSuggestions(request.user_id, recipes);

    return recipes;
  }

  async generateShoppingList(request: ShoppingListRequest): Promise<any[]> {
    const userId = request.user_id;

    // Get current inventory
    const currentInventory = await this.databaseService.getUserIngredients(userId);

    let neededIngredients: string[] = [];

    if (request.recipe_ids && request.recipe_ids.length > 0) {
      // Get ingredients from selected recipes
      const recipeIngredients = await this.getRecipeIngredients(request.recipe_ids);
      neededIngredients = recipeIngredients;
    } else {
      // Generate based on low inventory and expiring items
      neededIngredients = await this.getRecommendedItems(userId);
    }

    // Use AI to refine shopping recommendations
    const recommendations = await this.aiService.generateShoppingRecommendations(
      currentInventory,
      neededIngredients
    );

    // Convert to shopping list format and save to database
    const shoppingItems = recommendations.map(rec => ({
      name: rec.name,
      quantity: 1,
      unit: 'piece'
    }));

    await this.databaseService.addToShoppingList(userId, shoppingItems);

    return await this.databaseService.getShoppingList(userId);
  }

  async getStorageAdvice(request: StorageAdviceRequest): Promise<any> {
    return await this.aiService.getStorageAdvice(request.food_name, request.category);
  }

  async scanBarcode(barcode: string): Promise<BarcodeProduct | null> {
    // Lookup product information using barcode
    const product = await this.aiService.lookupBarcode(barcode);

    if (product) {
      // Enrich with storage advice
      const storageAdvice = await this.aiService.getStorageAdvice(product.name, product.category);
      return {
        ...product,
        storage_advice: storageAdvice
      };
    }

    return null;
  }

  async getExpiryAlerts(userId: number, daysAhead: number = 3): Promise<any[]> {
    const expiringFoods = await this.databaseService.getExpiringFoods(userId, daysAhead);

    // Enhance with recommendations
    return expiringFoods.map(food => ({
      ...food,
      days_until_expiry: this.calculateDaysUntilExpiry(food.expiry_date),
      usage_suggestions: this.getUsageSuggestions(food.name, food.category_name)
    }));
  }

  private async createExpiryNotification(food: any): Promise<void> {
    const expiryDate = new Date(food.expiry_date);
    const warningDate = new Date(expiryDate);
    warningDate.setDate(warningDate.getDate() - 2); // 2 days before expiry

    // In a real implementation, this would schedule a notification
    console.log(`Scheduled expiry notification for ${food.name} on ${warningDate.toISOString()}`);
  }

  private async updateWasteStatistics(userId: number, status: string): Promise<void> {
    // Update waste statistics based on food status changes
    if (status === 'disposed' || status === 'expired') {
      // Increment waste counter
      console.log(`Updated waste statistics for user ${userId}: ${status}`);
    }
  }

  private async saveRecipeSuggestions(userId: number, recipes: Recipe[]): Promise<void> {
    // Save recipes to database for future reference and favorites
    console.log(`Saved ${recipes.length} recipe suggestions for user ${userId}`);
  }

  private async getRecipeIngredients(recipeIds: number[]): Promise<string[]> {
    // Get ingredients from specific recipes
    // Mock implementation - in reality would query database
    return ['tomato', 'onion', 'garlic', 'olive oil'];
  }

  private async getRecommendedItems(userId: number): Promise<string[]> {
    // Get items that are running low or commonly used
    // Mock implementation
    return ['bread', 'milk', 'eggs', 'vegetables'];
  }

  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  private getUsageSuggestions(foodName: string, category: string): string[] {
    // Generate usage suggestions based on food type
    const suggestions: Record<string, string[]> = {
      '野菜': ['サラダに使用', '炒め物に追加', 'スープの具材'],
      '肉類': ['焼いて主菜に', 'カレーの具材', '炒め物に使用'],
      '乳製品': ['そのまま飲用', 'シリアルと一緒に', 'コーヒーに追加'],
      'default': ['冷凍保存', '他の料理に活用', 'すぐに消費']
    };

    return suggestions[category] || suggestions['default'];
  }
}
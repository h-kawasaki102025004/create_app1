// Base types
export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
}

// User types
export interface User extends BaseEntity {
  username: string;
  email: string;
  password_hash?: string; // Optional for client-side
}

export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  tokens: AuthTokens;
}

// Category types
export interface Category extends BaseEntity {
  name: string;
  icon: string;
  color: string;
}

// Food types
export type StorageLocation = '冷蔵庫' | '冷凍庫' | '常温' | 'その他';
export type FoodStatus = 'active' | 'consumed' | 'expired' | 'disposed';
export type FoodUnit = '個' | 'kg' | 'g' | 'L' | 'ml' | '本' | '袋' | 'パック' | 'その他';

export interface Food extends BaseEntity {
  user_id: number;
  category_id: number;
  name: string;
  purchase_date: string; // ISO date string
  expiry_date: string;   // ISO date string
  quantity: number;
  unit: FoodUnit;
  storage_location: StorageLocation;
  barcode?: string;
  image_url?: string;
  status: FoodStatus;

  // Populated fields (joins)
  category?: Category;
  user?: User;
}

export interface FoodCreateData {
  name: string;
  category_id: number;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  unit: FoodUnit;
  storage_location: StorageLocation;
  barcode?: string;
  image_url?: string;
}

export interface FoodUpdateData extends Partial<FoodCreateData> {
  status?: FoodStatus;
}

export interface FoodFilterOptions {
  categories?: number[];
  storage_locations?: StorageLocation[];
  status?: FoodStatus[];
  expiry_within_days?: number;
  search?: string;
  sort_by?: 'name' | 'expiry_date' | 'purchase_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// Recipe types
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export type RecipeSource = 'ai_generated' | 'external_api' | 'user_created';

export interface Recipe extends BaseEntity {
  name: string;
  description?: string;
  instructions: string[];
  prep_time: number; // minutes
  cook_time: number; // minutes
  servings: number;
  difficulty: RecipeDifficulty;
  image_url?: string;
  source: RecipeSource;
  external_id?: string;
  external_url?: string;
}

export interface RecipeIngredient extends BaseEntity {
  recipe_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  optional: boolean;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface RecipeSuggestionRequest {
  available_ingredients: string[];
  dietary_preferences?: string[];
  max_prep_time?: number;
  max_cook_time?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  exclude_ingredients?: string[];
}

export interface RecipeSuggestionResponse {
  recipes: RecipeWithIngredients[];
  matched_ingredients: string[];
  missing_ingredients: string[];
  source: RecipeSource;
  personalized?: boolean;
}

// Notification types
export type NotificationType = 'expiry_alert' | 'recipe_suggestion' | 'shopping_reminder' | 'system';
export type NotificationStatus = 'unread' | 'read';

export interface Notification extends BaseEntity {
  user_id: number;
  food_id?: number;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  sent_at: Date;
  read_at?: Date;

  // Populated fields
  food?: Food;
}

// Shopping List types
export interface ShoppingList extends BaseEntity {
  user_id: number;
  name: string;
  completed: boolean;

  // Populated fields
  items?: ShoppingListItem[];
}

export interface ShoppingListItem extends BaseEntity {
  list_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  estimated_price?: number;
  store_name?: string;
}

export interface ShoppingListCreateData {
  name: string;
  items: Omit<ShoppingListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'>[];
}

// Storage Tips types
export interface StorageTip extends BaseEntity {
  food_name: string;
  category: string;
  storage_method: StorageLocation;
  optimal_temp?: string;
  humidity_level?: string;
  shelf_life_days: number;
  tips: string[];
}

// AI Service types
export interface AIRecipeSuggestion {
  recipe_name: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: RecipeDifficulty;
  nutritional_info?: {
    calories_per_serving?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface AIStorageAdvice {
  recommended_storage: StorageLocation;
  optimal_temperature?: string;
  humidity_level?: string;
  shelf_life_days: number;
  storage_tips: string[];
  reasons: string[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationOptions {
  page?: number;
  per_page?: number;
}

// MCP Server types
export interface MCPRequest {
  method: string;
  params: Record<string, unknown>;
  id?: string | number;
}

export interface MCPResponse<T = unknown> {
  result?: T;
  error?: {
    code: string;
    message: string;
    data?: unknown;
  };
  id?: string | number;
}

export interface MCPFoodInventoryAddParams {
  user_id: number;
  name: string;
  category: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  storage_location?: StorageLocation;
}

export interface MCPExpiryAlertParams {
  user_id: number;
  days_threshold: number;
}

export interface MCPRecipeSuggestionParams {
  ingredients: string[];
  dietary_preferences?: string[];
  max_prep_time?: number;
}

// External API types
export interface RakutenRecipeResponse {
  result: {
    recipeId: string;
    recipeTitle: string;
    recipeUrl: string;
    foodImageUrl: string;
    recipeMaterial: string[];
    recipeIndication: string;
    recipeCost: string;
  }[];
}

export interface BarcodeApiResponse {
  products?: {
    product_name?: string;
    categories?: string;
    image_url?: string;
  }[];
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 400);
    this.errors = errors;
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Environment types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  OPENAI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  RAKUTEN_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
}
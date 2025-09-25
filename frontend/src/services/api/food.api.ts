import { BaseApi } from './base.api';
import {
  Food,
  FoodCreationData,
  FoodUpdateData,
  PaginatedResponse,
  FoodStats,
  ApiResponse
} from '@shared/types';

export interface FoodFilters {
  page?: number;
  per_page?: number;
  status?: 'active' | 'consumed' | 'expired' | 'disposed';
  category_id?: number;
  sort_by?: 'name' | 'expiry_date' | 'purchase_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
  search?: string;
}

class FoodApi extends BaseApi {
  async getAll(filters: FoodFilters = {}): Promise<PaginatedResponse<Food>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/foods?${queryString}` : '/foods';

    return this.get<PaginatedResponse<Food>>(url);
  }

  async getById(id: number): Promise<Food> {
    return this.get<Food>(`/foods/${id}`);
  }

  async create(data: FoodCreationData): Promise<Food> {
    return this.post<Food>('/foods', data);
  }

  async update(id: number, data: FoodUpdateData): Promise<Food> {
    return this.put<Food>(`/foods/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    return this.delete<void>(`/foods/${id}`);
  }

  async markAsConsumed(id: number): Promise<Food> {
    return this.patch<Food>(`/foods/${id}/consume`);
  }

  async markAsExpired(id: number): Promise<Food> {
    return this.patch<Food>(`/foods/${id}/expire`);
  }

  async bulkMarkAsConsumed(foodIds: number[]): Promise<ApiResponse<{ updated_count: number }>> {
    return this.post<ApiResponse<{ updated_count: number }>>('/foods/bulk-consume', {
      food_ids: foodIds
    });
  }

  async search(query: string): Promise<PaginatedResponse<Food>> {
    return this.get<PaginatedResponse<Food>>(`/foods/search?q=${encodeURIComponent(query)}`);
  }

  async getExpiring(): Promise<Food[]> {
    const response = await this.get<ApiResponse<Food[]>>('/foods/expiring');
    return response.data;
  }

  async getExpired(): Promise<Food[]> {
    const response = await this.get<ApiResponse<Food[]>>('/foods/expired');
    return response.data;
  }

  async getStats(): Promise<FoodStats> {
    const response = await this.get<ApiResponse<FoodStats>>('/foods/stats');
    return response.data;
  }

  async getIngredients(): Promise<string[]> {
    const response = await this.get<ApiResponse<string[]>>('/foods/ingredients');
    return response.data;
  }

  async getStorageAdvice(): Promise<Array<{
    food_name: string;
    storage_location: string;
    tips: string[];
  }>> {
    const response = await this.get<ApiResponse<Array<{
      food_name: string;
      storage_location: string;
      tips: string[];
    }>>>('/foods/storage-advice');
    return response.data;
  }

  async uploadImage(file: File, foodId?: number): Promise<{ image_url: string }> {
    const url = foodId ? `/foods/${foodId}/image` : '/foods/upload-image';
    return this.uploadFile<{ image_url: string }>(url, file);
  }
}

export const foodApi = new FoodApi();
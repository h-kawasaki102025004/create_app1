import { BaseRepository } from './base.repository';
import { StorageTip } from '@shared/types';

export class StorageTipRepository extends BaseRepository<StorageTip> {
  constructor() {
    super('storage_tips');
  }

  async findByFoodName(foodName: string, category?: string): Promise<StorageTip | null> {
    // Try exact match first
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE LOWER(food_name) = LOWER($1) AND is_active = TRUE
      ORDER BY
        CASE WHEN category = $2 THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 1
    `;

    let result = await this.executeQuery<StorageTip>(query, [foodName, category || '']);

    if (result.length > 0) {
      return result[0];
    }

    // Try partial match
    query = `
      SELECT * FROM ${this.tableName}
      WHERE (
        LOWER(food_name) LIKE LOWER($1) OR
        LOWER($2) LIKE LOWER('%' || food_name || '%')
      ) AND is_active = TRUE
      ORDER BY
        CASE WHEN category = $3 THEN 1 ELSE 2 END,
        CASE WHEN LOWER(food_name) = LOWER($2) THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 1
    `;

    result = await this.executeQuery<StorageTip>(query, [`%${foodName}%`, foodName, category || '']);
    return result[0] || null;
  }

  async findByCategory(category: string): Promise<StorageTip[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE LOWER(category) = LOWER($1) AND is_active = TRUE
      ORDER BY food_name ASC
    `;

    return this.executeQuery<StorageTip>(query, [category]);
  }

  async findByStorageMethod(storageMethod: string): Promise<StorageTip[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE LOWER(storage_method) = LOWER($1) AND is_active = TRUE
      ORDER BY food_name ASC
    `;

    return this.executeQuery<StorageTip>(query, [storageMethod]);
  }

  async searchTips(searchTerm: string): Promise<StorageTip[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE (
        food_name ILIKE $1 OR
        category ILIKE $1 OR
        storage_method ILIKE $1 OR
        EXISTS (
          SELECT 1 FROM unnest(tips) as tip
          WHERE tip ILIKE $1
        )
      ) AND is_active = TRUE
      ORDER BY
        CASE
          WHEN LOWER(food_name) = LOWER($2) THEN 1
          WHEN LOWER(food_name) LIKE LOWER($2 || '%') THEN 2
          WHEN LOWER(category) = LOWER($2) THEN 3
          ELSE 4
        END,
        food_name ASC
      LIMIT 50
    `;

    return this.executeQuery<StorageTip>(query, [`%${searchTerm}%`, searchTerm]);
  }

  async getStorageMethodStats(): Promise<Array<{
    storage_method: string;
    count: number;
    avg_shelf_life: number;
  }>> {
    const query = `
      SELECT
        storage_method,
        COUNT(*) as count,
        ROUND(AVG(shelf_life_days)) as avg_shelf_life
      FROM ${this.tableName}
      WHERE is_active = TRUE
      GROUP BY storage_method
      ORDER BY count DESC, storage_method ASC
    `;

    return this.executeQuery(query);
  }

  async getCategoryStats(): Promise<Array<{
    category: string;
    count: number;
    avg_shelf_life: number;
  }>> {
    const query = `
      SELECT
        category,
        COUNT(*) as count,
        ROUND(AVG(shelf_life_days)) as avg_shelf_life
      FROM ${this.tableName}
      WHERE is_active = TRUE AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC, category ASC
    `;

    return this.executeQuery(query);
  }

  async findSimilarFoods(foodName: string, limit: number = 10): Promise<StorageTip[]> {
    const query = `
      SELECT *,
        similarity(food_name, $1) as sim_score
      FROM ${this.tableName}
      WHERE is_active = TRUE
        AND similarity(food_name, $1) > 0.3
      ORDER BY sim_score DESC, food_name ASC
      LIMIT $2
    `;

    return this.executeQuery<StorageTip>(query, [foodName, limit]);
  }

  async getRandomTips(limit: number = 5): Promise<StorageTip[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = TRUE
      ORDER BY RANDOM()
      LIMIT $1
    `;

    return this.executeQuery<StorageTip>(query, [limit]);
  }

  async findByShelfLife(minDays: number, maxDays: number): Promise<StorageTip[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE shelf_life_days BETWEEN $1 AND $2 AND is_active = TRUE
      ORDER BY shelf_life_days ASC, food_name ASC
    `;

    return this.executeQuery<StorageTip>(query, [minDays, maxDays]);
  }

  async getOptimalStorageForFood(foodName: string): Promise<{
    recommended_storage: string;
    shelf_life_days: number;
    tips: string[];
    optimal_temp?: string;
    humidity_level?: string;
  } | null> {
    const tip = await this.findByFoodName(foodName);

    if (!tip) {
      return null;
    }

    return {
      recommended_storage: tip.storage_method,
      shelf_life_days: tip.shelf_life_days,
      tips: tip.tips,
      optimal_temp: tip.optimal_temp || undefined,
      humidity_level: tip.humidity_level || undefined
    };
  }
}
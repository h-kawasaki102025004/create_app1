import { BaseRepository } from './base.repository';
import { Food, FoodFilterOptions, PaginatedResponse } from '@shared/types';
import { DateUtils } from '@shared/utils';

interface FoodWithCategory extends Food {
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export class FoodRepository extends BaseRepository<Food> {
  constructor() {
    super('foods');
  }

  async findByUserId(userId: number, options?: FoodFilterOptions): Promise<Food[]> {
    const { whereClause, params } = this.buildFoodFilterQuery(userId, options);

    const query = `
      SELECT
        f.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${this.buildSortClause(options?.sort_by, options?.sort_order)}
    `;

    return this.executeQuery<FoodWithCategory>(query, params);
  }

  async findByUserIdWithPagination(
    userId: number,
    options: FoodFilterOptions & { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<FoodWithCategory>> {
    const { whereClause, params } = this.buildFoodFilterQuery(userId, options);

    const baseQuery = `
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE ${whereClause}
    `;

    // Count total records
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await this.executeQuery<{ count: string }>(countQuery, params);
    const totalCount = parseInt(countResult.rows[0]?.count || '0');

    // Get paginated results
    const page = options.page || 1;
    const perPage = options.per_page || 20;
    const offset = (page - 1) * perPage;

    const dataQuery = `
      SELECT
        f.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      ${baseQuery}
      ORDER BY ${this.buildSortClause(options.sort_by, options.sort_order)}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.executeQuery<FoodWithCategory>(
      dataQuery,
      [...params, perPage, offset]
    );

    const totalPages = Math.ceil(totalCount / perPage);

    return {
      items: dataResult,
      total_count: totalCount,
      page,
      per_page: perPage,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    };
  }

  async findExpiringFoods(userId: number, daysThreshold: number = 3): Promise<FoodWithCategory[]> {
    const query = `
      SELECT
        f.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = $1
        AND f.status = 'active'
        AND is_food_expiring_soon(f.expiry_date, $2)
      ORDER BY f.expiry_date ASC
    `;

    return this.executeQuery<FoodWithCategory>(query, [userId, daysThreshold]);
  }

  async findExpiredFoods(userId: number): Promise<FoodWithCategory[]> {
    const query = `
      SELECT
        f.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = $1
        AND f.status = 'active'
        AND is_food_expired(f.expiry_date)
      ORDER BY f.expiry_date ASC
    `;

    return this.executeQuery<FoodWithCategory>(query, [userId]);
  }

  async findByStorageLocation(userId: number, storageLocation: string): Promise<Food[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 AND storage_location = $2 AND status = 'active'
      ORDER BY expiry_date ASC
    `;

    return this.executeQuery<Food>(query, [userId, storageLocation]);
  }

  async findByCategory(userId: number, categoryId: number): Promise<Food[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 AND category_id = $2 AND status = 'active'
      ORDER BY expiry_date ASC
    `;

    return this.executeQuery<Food>(query, [userId, categoryId]);
  }

  async findByBarcode(barcode: string): Promise<Food[]> {
    return this.findByField('barcode', barcode);
  }

  async updateStatus(id: number, status: Food['status'], userId: number): Promise<Food | null> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $2, updated_at = NOW()
      WHERE id = $1 AND user_id = $3
      RETURNING *
    `;

    const result = await this.executeQuery<Food>(query, [id, status, userId]);
    return result[0] || null;
  }

  async markAsConsumed(id: number, userId: number): Promise<Food | null> {
    return this.updateStatus(id, 'consumed', userId);
  }

  async markAsExpired(id: number, userId: number): Promise<Food | null> {
    return this.updateStatus(id, 'expired', userId);
  }

  async markAsDisposed(id: number, userId: number): Promise<Food | null> {
    return this.updateStatus(id, 'disposed', userId);
  }

  async getInventoryStats(userId: number): Promise<{
    total: number;
    active: number;
    expiring_soon: number;
    expired: number;
    consumed: number;
    by_category: Array<{
      category_name: string;
      category_icon: string;
      count: number;
    }>;
    by_storage: Array<{
      storage_location: string;
      count: number;
    }>;
  }> {
    const statsQuery = `
      WITH food_stats AS (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'active' AND is_food_expiring_soon(expiry_date, 3)) as expiring_soon,
          COUNT(*) FILTER (WHERE status = 'active' AND is_food_expired(expiry_date)) as expired,
          COUNT(*) FILTER (WHERE status = 'consumed') as consumed
        FROM foods
        WHERE user_id = $1
      ),
      category_stats AS (
        SELECT
          c.name as category_name,
          c.icon as category_icon,
          COUNT(f.id) as count
        FROM categories c
        LEFT JOIN foods f ON c.id = f.category_id AND f.user_id = $1 AND f.status = 'active'
        GROUP BY c.id, c.name, c.icon
        HAVING COUNT(f.id) > 0
        ORDER BY count DESC
      ),
      storage_stats AS (
        SELECT
          storage_location,
          COUNT(*) as count
        FROM foods
        WHERE user_id = $1 AND status = 'active' AND storage_location IS NOT NULL
        GROUP BY storage_location
        ORDER BY count DESC
      )
      SELECT
        (SELECT row_to_json(food_stats) FROM food_stats) as stats,
        COALESCE((SELECT json_agg(category_stats) FROM category_stats), '[]'::json) as by_category,
        COALESCE((SELECT json_agg(storage_stats) FROM storage_stats), '[]'::json) as by_storage
    `;

    const result = await this.executeQuery<{
      stats: any;
      by_category: any;
      by_storage: any;
    }>(statsQuery, [userId]);

    const data = result[0];
    const stats = data?.stats || {};

    return {
      total: stats.total || 0,
      active: stats.active || 0,
      expiring_soon: stats.expiring_soon || 0,
      expired: stats.expired || 0,
      consumed: stats.consumed || 0,
      by_category: data?.by_category || [],
      by_storage: data?.by_storage || []
    };
  }

  async searchFoodsByName(userId: number, searchTerm: string): Promise<FoodWithCategory[]> {
    const query = `
      SELECT
        f.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = $1
        AND f.status = 'active'
        AND f.name ILIKE $2
      ORDER BY
        CASE WHEN f.name ILIKE $3 THEN 1 ELSE 2 END,
        f.name
    `;

    return this.executeQuery<FoodWithCategory>(query, [
      userId,
      `%${searchTerm}%`,
      `${searchTerm}%`
    ]);
  }

  async getFoodIngredients(userId: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT name
      FROM foods
      WHERE user_id = $1 AND status = 'active'
      ORDER BY name
    `;

    const result = await this.executeQuery<{ name: string }>(query, [userId]);
    return result.map(row => row.name);
  }

  async bulkUpdateStatus(ids: number[], status: Food['status'], userId: number): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, index) => `$${index + 3}`).join(', ');
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE user_id = $2 AND id IN (${placeholders})
    `;

    const result = await this.executeQuery(query, [status, userId, ...ids]);
    return result.length;
  }

  private buildFoodFilterQuery(
    userId: number,
    options?: FoodFilterOptions
  ): { whereClause: string; params: any[] } {
    const conditions: string[] = ['f.user_id = $1'];
    const params: any[] = [userId];

    if (options?.categories && options.categories.length > 0) {
      const placeholders = options.categories.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`f.category_id IN (${placeholders})`);
      params.push(...options.categories);
    }

    if (options?.storage_locations && options.storage_locations.length > 0) {
      const placeholders = options.storage_locations.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`f.storage_location IN (${placeholders})`);
      params.push(...options.storage_locations);
    }

    if (options?.status && options.status.length > 0) {
      const placeholders = options.status.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`f.status IN (${placeholders})`);
      params.push(...options.status);
    } else {
      // Default to active only
      conditions.push(`f.status = 'active'`);
    }

    if (options?.expiry_within_days !== undefined) {
      conditions.push(`is_food_expiring_soon(f.expiry_date, $${params.length + 1})`);
      params.push(options.expiry_within_days);
    }

    if (options?.search) {
      conditions.push(`(f.name ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`);
      params.push(`%${options.search}%`);
    }

    return {
      whereClause: conditions.join(' AND '),
      params
    };
  }

  private buildSortClause(sortBy?: string, sortOrder?: 'asc' | 'desc'): string {
    const order = sortOrder || 'desc';

    switch (sortBy) {
      case 'name':
        return `f.name ${order}`;
      case 'expiry_date':
        return `f.expiry_date ${order}`;
      case 'purchase_date':
        return `f.purchase_date ${order}`;
      case 'created_at':
        return `f.created_at ${order}`;
      default:
        return `f.expiry_date ASC, f.created_at DESC`;
    }
  }
}
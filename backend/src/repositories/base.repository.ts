import database from '../config/database';
import { PaginationOptions, PaginatedResponse } from '@shared/types';

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: number): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await database.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(options?: PaginationOptions): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;

    if (options?.per_page) {
      const offset = ((options.page || 1) - 1) * options.per_page;
      query += ` LIMIT $1 OFFSET $2`;
      const result = await database.query<T>(query, [options.per_page, offset]);
      return result.rows;
    }

    const result = await database.query<T>(query);
    return result.rows;
  }

  async findWithPagination(
    whereClause: string = '',
    params: any[] = [],
    options: PaginationOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const page = options.page || 1;
    const perPage = options.per_page || 20;
    const offset = (page - 1) * perPage;

    // Build the base query
    const baseQuery = `FROM ${this.tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`;

    // Count total records
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await database.query<{ count: string }>(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await database.query<T>(dataQuery, [...params, perPage, offset]);

    const totalPages = Math.ceil(totalCount / perPage);

    return {
      items: dataResult.rows,
      total_count: totalCount,
      page,
      per_page: perPage,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    };
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await database.query<T>(query, values);
    return result.rows[0];
  }

  async update(id: number, data: Partial<T>): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      return this.findById(id);
    }

    const setClause = columns
      .map((col, index) => `${col} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await database.query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  async softDelete(id: number): Promise<T | null> {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await database.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  async exists(id: number): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`;
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(whereClause?: string, params?: any[]): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;

    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }

    const result = await database.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count);
  }

  async findByField(
    field: string,
    value: any,
    operator: string = '='
  ): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${field} ${operator} $1`;
    const result = await database.query<T>(query, [value]);
    return result.rows;
  }

  async findOneByField(
    field: string,
    value: any,
    operator: string = '='
  ): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${field} ${operator} $1 LIMIT 1`;
    const result = await database.query<T>(query, [value]);
    return result.rows[0] || null;
  }

  async findByIds(ids: number[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;
    const result = await database.query<T>(query, ids);
    return result.rows;
  }

  async executeQuery<R = any>(query: string, params?: any[]): Promise<R[]> {
    const result = await database.query<R>(query, params);
    return result.rows;
  }

  async executeTransaction<R>(
    callback: (client: any) => Promise<R>
  ): Promise<R> {
    return database.transaction(callback);
  }

  protected buildSearchQuery(
    searchTerm: string,
    searchFields: string[],
    additionalWhere?: string
  ): { whereClause: string; params: any[] } {
    if (!searchTerm.trim()) {
      return {
        whereClause: additionalWhere || '',
        params: []
      };
    }

    const searchConditions = searchFields
      .map(field => `${field} ILIKE $1`)
      .join(' OR ');

    const whereClause = additionalWhere
      ? `(${searchConditions}) AND ${additionalWhere}`
      : `(${searchConditions})`;

    return {
      whereClause,
      params: [`%${searchTerm}%`]
    };
  }

  protected buildFilterQuery(
    filters: Record<string, any>,
    searchQuery?: { whereClause: string; params: any[] }
  ): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [...(searchQuery?.params || [])];

    if (searchQuery?.whereClause) {
      conditions.push(`(${searchQuery.whereClause})`);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            const placeholders = value.map((_, i) => `$${params.length + i + 1}`).join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            params.push(...value);
          }
        } else {
          conditions.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
      }
    });

    return {
      whereClause: conditions.length > 0 ? conditions.join(' AND ') : '',
      params
    };
  }
}
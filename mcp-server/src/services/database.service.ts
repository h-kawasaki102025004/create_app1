import { Pool } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export class DatabaseService {
  private pool: Pool;

  constructor(config?: DatabaseConfig) {
    const dbConfig = config || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'food_waste_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    };

    this.pool = new Pool({
      ...dbConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async getFoodInventory(userId: number, filters?: any): Promise<any[]> {
    let query = `
      SELECT f.*, c.name as category_name
      FROM foods f
      JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND f.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.category_id) {
      query += ` AND f.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters?.expiring_soon) {
      query += ` AND f.expiry_date <= CURRENT_DATE + INTERVAL '3 days'`;
    }

    query += ' ORDER BY f.expiry_date ASC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async addFoodItem(foodData: any): Promise<any> {
    const query = `
      INSERT INTO foods (
        user_id, name, category_id, quantity, unit,
        purchase_date, expiry_date, storage_location,
        barcode, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *
    `;

    const params = [
      foodData.user_id,
      foodData.name,
      foodData.category_id,
      foodData.quantity,
      foodData.unit,
      foodData.purchase_date,
      foodData.expiry_date,
      foodData.storage_location || '常温',
      foodData.barcode,
      foodData.notes,
    ];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateFoodStatus(userId: number, foodId: number, status: string): Promise<any> {
    const query = `
      UPDATE foods
      SET status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [foodId, userId, status]);
    return result.rows[0];
  }

  async getExpiringFoods(userId: number, daysAhead: number = 3): Promise<any[]> {
    const query = `
      SELECT f.*, c.name as category_name
      FROM foods f
      JOIN categories c ON f.category_id = c.id
      WHERE f.user_id = $1
        AND f.status = 'active'
        AND f.expiry_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY f.expiry_date ASC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getFoodCategories(): Promise<any[]> {
    const query = 'SELECT * FROM categories ORDER BY name';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getStorageTips(category?: string): Promise<any[]> {
    let query = 'SELECT * FROM storage_tips';
    const params: any[] = [];

    if (category) {
      query += ' WHERE category ILIKE $1';
      params.push(`%${category}%`);
    }

    query += ' ORDER BY category, food_name';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUserIngredients(userId: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT name
      FROM foods
      WHERE user_id = $1 AND status = 'active'
        AND expiry_date > CURRENT_DATE
      ORDER BY name
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => row.name);
  }

  async getShoppingList(userId: number): Promise<any[]> {
    const query = `
      SELECT * FROM shopping_lists
      WHERE user_id = $1 AND purchased = false
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async addToShoppingList(userId: number, items: Array<{name: string, quantity: number, unit: string}>): Promise<any[]> {
    const insertPromises = items.map(item => {
      const query = `
        INSERT INTO shopping_lists (user_id, item_name, quantity, unit)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, item_name)
        DO UPDATE SET
          quantity = shopping_lists.quantity + EXCLUDED.quantity,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      return this.pool.query(query, [userId, item.name, item.quantity, item.unit]);
    });

    const results = await Promise.all(insertPromises);
    return results.map(result => result.rows[0]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
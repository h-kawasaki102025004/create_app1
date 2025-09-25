import { BaseRepository } from './base.repository';
import { User } from '@shared/types';

interface UserWithPreferences extends User {
  preferences?: {
    enable_expiry_alerts: boolean;
    expiry_alert_days: number;
    enable_recipe_suggestions: boolean;
    enable_shopping_reminders: boolean;
    enable_email_notifications: boolean;
    enable_push_notifications: boolean;
    theme: string;
    language: string;
  };
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneByField('email', email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOneByField('username', username);
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE email = $1 OR username = $1
      LIMIT 1
    `;
    const result = await this.executeQuery<User>(query, [identifier]);
    return result[0] || null;
  }

  async findWithPreferences(userId: number): Promise<UserWithPreferences | null> {
    const query = `
      SELECT
        u.*,
        json_build_object(
          'enable_expiry_alerts', up.enable_expiry_alerts,
          'expiry_alert_days', up.expiry_alert_days,
          'enable_recipe_suggestions', up.enable_recipe_suggestions,
          'enable_shopping_reminders', up.enable_shopping_reminders,
          'enable_email_notifications', up.enable_email_notifications,
          'enable_push_notifications', up.enable_push_notifications,
          'theme', up.theme,
          'language', up.language
        ) as preferences
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1 AND u.is_active = TRUE
    `;

    const result = await this.executeQuery<UserWithPreferences>(query, [userId]);
    return result[0] || null;
  }

  async updateLastLogin(userId: number): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await this.executeQuery(query, [userId]);
  }

  async setEmailVerified(userId: number): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET email_verified = TRUE, verification_token = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId]);
    return result[0] || null;
  }

  async setVerificationToken(userId: number, token: string): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET verification_token = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId, token]);
    return result[0] || null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.findOneByField('verification_token', token);
  }

  async setResetPasswordToken(
    email: string,
    token: string,
    expiresAt: Date
  ): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET
        reset_password_token = $2,
        reset_password_expires = $3,
        updated_at = NOW()
      WHERE email = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [email, token, expiresAt]);
    return result[0] || null;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE reset_password_token = $1
        AND reset_password_expires > NOW()
      LIMIT 1
    `;
    const result = await this.executeQuery<User>(query, [token]);
    return result[0] || null;
  }

  async clearResetPasswordToken(userId: number): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId]);
    return result[0] || null;
  }

  async updatePassword(userId: number, passwordHash: string): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId, passwordHash]);
    return result[0] || null;
  }

  async deactivateUser(userId: number): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId]);
    return result[0] || null;
  }

  async reactivateUser(userId: number): Promise<User | null> {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.executeQuery<User>(query, [userId]);
    return result[0] || null;
  }

  async getUserStatistics(userId: number): Promise<{
    total_foods: number;
    expiring_soon: number;
    expired: number;
    favorite_recipes: number;
    shopping_lists: number;
  }> {
    const query = `
      WITH user_stats AS (
        SELECT
          COALESCE(food_stats.total_foods, 0) as total_foods,
          COALESCE(food_stats.expiring_soon, 0) as expiring_soon,
          COALESCE(food_stats.expired, 0) as expired,
          COALESCE(recipe_stats.favorite_recipes, 0) as favorite_recipes,
          COALESCE(shopping_stats.shopping_lists, 0) as shopping_lists
        FROM (SELECT 1) dummy
        LEFT JOIN (
          SELECT
            COUNT(*) FILTER (WHERE status = 'active') as total_foods,
            COUNT(*) FILTER (WHERE status = 'active' AND is_food_expiring_soon(expiry_date, 3)) as expiring_soon,
            COUNT(*) FILTER (WHERE status = 'active' AND is_food_expired(expiry_date)) as expired
          FROM foods
          WHERE user_id = $1
        ) food_stats ON true
        LEFT JOIN (
          SELECT COUNT(*) as favorite_recipes
          FROM user_recipe_favorites
          WHERE user_id = $1
        ) recipe_stats ON true
        LEFT JOIN (
          SELECT COUNT(*) as shopping_lists
          FROM shopping_lists
          WHERE user_id = $1 AND completed = false
        ) shopping_stats ON true
      )
      SELECT * FROM user_stats;
    `;

    const result = await this.executeQuery<{
      total_foods: number;
      expiring_soon: number;
      expired: number;
      favorite_recipes: number;
      shopping_lists: number;
    }>(query, [userId]);

    return result[0] || {
      total_foods: 0,
      expiring_soon: 0,
      expired: 0,
      favorite_recipes: 0,
      shopping_lists: 0
    };
  }

  async searchUsers(
    searchTerm: string,
    options: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<User[]> {
    const { includeInactive = false, limit = 50, offset = 0 } = options;

    let whereClause = `(username ILIKE $1 OR email ILIKE $1)`;
    const params = [`%${searchTerm}%`];

    if (!includeInactive) {
      whereClause += ` AND is_active = TRUE`;
    }

    const query = `
      SELECT id, username, email, email_verified, last_login, is_active, created_at, updated_at
      FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY username
      LIMIT $2 OFFSET $3
    `;

    return this.executeQuery<User>(query, [...params, limit, offset]);
  }

  async checkEmailExists(email: string, excludeUserId?: number): Promise<boolean> {
    let query = `SELECT 1 FROM ${this.tableName} WHERE email = $1`;
    const params = [email];

    if (excludeUserId) {
      query += ` AND id != $2`;
      params.push(excludeUserId);
    }

    query += ` LIMIT 1`;

    const result = await this.executeQuery(query, params);
    return result.length > 0;
  }

  async checkUsernameExists(username: string, excludeUserId?: number): Promise<boolean> {
    let query = `SELECT 1 FROM ${this.tableName} WHERE username = $1`;
    const params = [username];

    if (excludeUserId) {
      query += ` AND id != $2`;
      params.push(excludeUserId);
    }

    query += ` LIMIT 1`;

    const result = await this.executeQuery(query, params);
    return result.length > 0;
  }
}
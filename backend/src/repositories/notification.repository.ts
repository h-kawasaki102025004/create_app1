import { BaseRepository } from './base.repository';
import { Notification, NotificationType, PaginatedResponse } from '@shared/types';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  async findByUserId(
    userId: number,
    options: {
      type?: NotificationType;
      status?: 'read' | 'unread';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Notification[]> {
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (options.type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(options.type);
    }

    if (options.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(options.status);
    }

    let query = `
      SELECT
        n.*,
        f.name as food_name
      FROM notifications n
      LEFT JOIN foods f ON n.food_id = f.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC
    `;

    if (options.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    return this.executeQuery<Notification>(query, params);
  }

  async findByUserIdWithPagination(
    userId: number,
    options: {
      type?: NotificationType;
      status?: 'read' | 'unread';
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<PaginatedResponse<Notification>> {
    const conditions: string[] = ['n.user_id = $1'];
    const params: any[] = [userId];

    if (options.type) {
      conditions.push(`n.type = $${params.length + 1}`);
      params.push(options.type);
    }

    if (options.status) {
      conditions.push(`n.status = $${params.length + 1}`);
      params.push(options.status);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      FROM notifications n
      LEFT JOIN foods f ON n.food_id = f.id
      WHERE ${whereClause}
    `;

    // Count total records
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await this.executeQuery<{ count: string }>(countQuery, params);
    const totalCount = parseInt(countResult[0]?.count || '0');

    // Get paginated results
    const page = options.page || 1;
    const perPage = options.per_page || 20;
    const offset = (page - 1) * perPage;

    const dataQuery = `
      SELECT
        n.*,
        f.name as food_name
      ${baseQuery}
      ORDER BY n.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.executeQuery<Notification>(
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

  async getUnreadCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE user_id = $1 AND status = 'unread'
    `;

    const result = await this.executeQuery<{ count: string }>(query, [userId]);
    return parseInt(result[0]?.count || '0');
  }

  async markAsRead(notificationId: number, userId: number): Promise<Notification | null> {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'read', read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'unread'
      RETURNING *
    `;

    const result = await this.executeQuery<Notification>(query, [notificationId, userId]);
    return result[0] || null;
  }

  async markAllAsRead(userId: number, type?: NotificationType): Promise<number> {
    let query = `
      UPDATE ${this.tableName}
      SET status = 'read', read_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND status = 'unread'
    `;
    const params = [userId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    const result = await this.executeQuery(query, params);
    return result.length;
  }

  async deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
        AND status = 'read'
    `;

    const result = await this.executeQuery(query);
    return result.length;
  }

  async findByUserAndFood(
    userId: number,
    foodId: number,
    type: NotificationType
  ): Promise<Notification | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 AND food_id = $2 AND type = $3
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.executeQuery<Notification>(query, [userId, foodId, type]);
    return result[0] || null;
  }

  async deleteByFoodId(foodId: number): Promise<number> {
    const query = `DELETE FROM ${this.tableName} WHERE food_id = $1`;
    const result = await this.executeQuery(query, [foodId]);
    return result.length;
  }

  async getNotificationStats(userId: number): Promise<{
    total: number;
    unread: number;
    by_type: Array<{
      type: NotificationType;
      count: number;
      unread_count: number;
    }>;
  }> {
    const query = `
      WITH notification_stats AS (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'unread') as unread
        FROM ${this.tableName}
        WHERE user_id = $1
      ),
      type_stats AS (
        SELECT
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'unread') as unread_count
        FROM ${this.tableName}
        WHERE user_id = $1
        GROUP BY type
        ORDER BY count DESC
      )
      SELECT
        (SELECT row_to_json(notification_stats) FROM notification_stats) as stats,
        COALESCE((SELECT json_agg(type_stats) FROM type_stats), '[]'::json) as by_type
    `;

    const result = await this.executeQuery<{
      stats: any;
      by_type: any;
    }>(query, [userId]);

    const data = result[0];
    const stats = data?.stats || {};

    return {
      total: stats.total || 0,
      unread: stats.unread || 0,
      by_type: data?.by_type || []
    };
  }

  async createBulkExpiryNotifications(
    notifications: Array<{
      user_id: number;
      food_id: number;
      title: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
    }>
  ): Promise<number> {
    if (notifications.length === 0) return 0;

    const values = notifications
      .map((_, index) => {
        const baseIndex = index * 6;
        return `($${baseIndex + 1}, $${baseIndex + 2}, 'expiry_alert', $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, NOW())`;
      })
      .join(', ');

    const params = notifications.flatMap(n => [
      n.user_id,
      n.food_id,
      n.title,
      n.message,
      n.priority
    ]);

    const query = `
      INSERT INTO ${this.tableName} (
        user_id, food_id, type, title, message, priority, sent_at
      )
      VALUES ${values}
    `;

    const result = await this.executeQuery(query, params);
    return result.length;
  }
}
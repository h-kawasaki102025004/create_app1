import { BaseRepository } from './base.repository';
import { Category } from '@shared/types';

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories');
  }

  async findActive(): Promise<Category[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = TRUE
      ORDER BY name ASC
    `;

    return this.executeQuery<Category>(query);
  }

  async findByName(name: string): Promise<Category | null> {
    return this.findOneByField('name', name);
  }

  async searchByName(searchTerm: string): Promise<Category[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE name ILIKE $1 AND is_active = TRUE
      ORDER BY name ASC
    `;

    return this.executeQuery<Category>(query, [`%${searchTerm}%`]);
  }

  async getCategoryStats(): Promise<Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    food_count: number;
  }>> {
    const query = `
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color,
        COUNT(f.id) as food_count
      FROM categories c
      LEFT JOIN foods f ON c.id = f.category_id AND f.status = 'active'
      WHERE c.is_active = TRUE
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY food_count DESC, c.name ASC
    `;

    return this.executeQuery(query);
  }

  async getFoodCountByCategory(categoryId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM foods
      WHERE category_id = $1 AND status = 'active'
    `;

    const result = await this.executeQuery<{ count: string }>(query, [categoryId]);
    return parseInt(result[0]?.count || '0');
  }
}
import fs from 'fs';
import path from 'path';
import database from '../config/database';

interface MigrationFile {
  filename: string;
  version: string;
  sql: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, '../../migrations');
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('Migration system initialized');
  }

  async getExecutedMigrations(): Promise<Set<string>> {
    const result = await database.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    return new Set(result.rows.map(row => row.version));
  }

  async getPendingMigrations(): Promise<MigrationFile[]> {
    const executed = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();

    return allMigrations.filter(migration => !executed.has(migration.version));
  }

  private loadMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('No migrations directory found');
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');
      const version = filename.replace('.sql', '');

      return {
        filename,
        version,
        sql
      };
    });
  }

  async executeMigration(migration: MigrationFile): Promise<void> {
    console.log(`Executing migration: ${migration.filename}`);

    await database.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(migration.sql);

      // Record the migration as executed
      await client.query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
        [migration.version, migration.filename]
      );
    });

    console.log(`✓ Migration completed: ${migration.filename}`);
  }

  async runMigrations(): Promise<void> {
    await this.initialize();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s)`);

    for (const migration of pending) {
      try {
        await this.executeMigration(migration);
      } catch (error) {
        console.error(`Failed to execute migration ${migration.filename}:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  async rollbackMigration(version?: string): Promise<void> {
    // This is a simplified rollback - in production you'd want proper down migrations
    console.log('Rollback functionality would be implemented here');

    if (version) {
      console.log(`Would rollback to version: ${version}`);
    } else {
      console.log('Would rollback last migration');
    }
  }

  async getMigrationStatus(): Promise<void> {
    await this.initialize();

    const executed = await this.getExecutedMigrations();
    const all = this.loadMigrationFiles();
    const pending = await this.getPendingMigrations();

    console.log('\n=== Migration Status ===');
    console.log(`Total migrations: ${all.length}`);
    console.log(`Executed: ${executed.size}`);
    console.log(`Pending: ${pending.length}`);

    if (executed.size > 0) {
      console.log('\nExecuted migrations:');
      const executedList = await database.query(
        'SELECT version, filename, executed_at FROM schema_migrations ORDER BY version'
      );

      executedList.rows.forEach(row => {
        console.log(`  ✓ ${row.version} (${row.executed_at.toISOString().split('T')[0]})`);
      });
    }

    if (pending.length > 0) {
      console.log('\nPending migrations:');
      pending.forEach(migration => {
        console.log(`  ○ ${migration.version}`);
      });
    }

    console.log();
  }
}

async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'status':
        await runner.getMigrationStatus();
        break;
      case 'rollback':
        const version = process.argv[3];
        await runner.rollbackMigration(version);
        break;
      case 'run':
      default:
        await runner.runMigrations();
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  main();
}

export { MigrationRunner };
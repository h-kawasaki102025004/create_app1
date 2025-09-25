const database = require('../config/sqlite');
const fs = require('fs');
const path = require('path');

class SQLiteMigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, '..', '..', 'migrations', 'sqlite');
    this.database = database;
  }

  async initialize() {
    await this.database.connect();

    // Create migrations table
    await this.database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('SQLite migration system initialized');
  }

  async getExecutedMigrations() {
    const result = await this.database.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return new Set(result.rows.map(row => row.version));
  }

  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();

    return allMigrations.filter(migration => !executed.has(migration.version));
  }

  loadMigrationFiles() {
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('Creating migrations directory...');
      fs.mkdirSync(this.migrationsPath, { recursive: true });
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

  async executeMigration(migration) {
    console.log(`Executing migration: ${migration.filename}`);

    await this.database.transaction(async (db) => {
      // Split SQL by semicolons and execute each statement
      const statements = migration.sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await db.query(statement);
      }

      // Record the migration as executed
      await db.query(
        'INSERT INTO schema_migrations (version, filename) VALUES (?, ?)',
        [migration.version, migration.filename]
      );
    });

    console.log(`✓ Migration completed: ${migration.filename}`);
  }

  async runMigrations() {
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

  async getMigrationStatus() {
    await this.initialize();

    const executed = await this.getExecutedMigrations();
    const all = this.loadMigrationFiles();
    const pending = await this.getPendingMigrations();

    console.log('\n=== SQLite Migration Status ===');
    console.log(`Total migrations: ${all.length}`);
    console.log(`Executed: ${executed.size}`);
    console.log(`Pending: ${pending.length}`);

    if (executed.size > 0) {
      console.log('\nExecuted migrations:');
      const executedList = await this.database.query(
        'SELECT version, filename, executed_at FROM schema_migrations ORDER BY version'
      );

      executedList.rows.forEach(row => {
        const date = new Date(row.executed_at).toISOString().split('T')[0];
        console.log(`  ✓ ${row.version} (${date})`);
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

  async createInitialMigrations() {
    const migrationsDir = this.migrationsPath;

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Create users table migration
    const usersSQL = `
-- Create users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT 0,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires DATETIME,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
`;

    // Create categories table migration
    const categoriesSQL = `
-- Create categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, icon, color) VALUES
('果物', '🍎', '#FF6B6B'),
('野菜', '🥕', '#4ECDC4'),
('肉類', '🥩', '#45B7D1'),
('乳製品', '🥛', '#96CEB4'),
('穀物', '🌾', '#FECA57');
`;

    // Create foods table migration
    const foodsSQL = `
-- Create foods table
CREATE TABLE foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category_id INTEGER,
    name VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    storage_location VARCHAR(50),
    barcode VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_foods_user_id ON foods(user_id);
CREATE INDEX idx_foods_category_id ON foods(category_id);
CREATE INDEX idx_foods_expiry_date ON foods(expiry_date);
CREATE INDEX idx_foods_status ON foods(status);
`;

    fs.writeFileSync(path.join(migrationsDir, '001_create_users_table.sql'), usersSQL);
    fs.writeFileSync(path.join(migrationsDir, '002_create_categories_table.sql'), categoriesSQL);
    fs.writeFileSync(path.join(migrationsDir, '003_create_foods_table.sql'), foodsSQL);

    console.log('✅ Initial migration files created');
  }
}

async function main() {
  const runner = new SQLiteMigrationRunner();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'status':
        await runner.getMigrationStatus();
        break;
      case 'create':
        await runner.createInitialMigrations();
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
    await runner.database.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { SQLiteMigrationRunner };
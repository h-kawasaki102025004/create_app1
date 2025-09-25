const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '..', '..', 'database', 'foodapp.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('SQLite connection failed:', err);
          reject(err);
        } else {
          console.log('✅ SQLite database connected successfully');
          // Enable foreign keys and set UTF-8 encoding
          this.db.run('PRAGMA foreign_keys = ON');
          this.db.run('PRAGMA encoding = "UTF-8"');
          resolve();
        }
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toLowerCase().startsWith('select')) {
        // SELECT query
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err);
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      } else {
        // INSERT, UPDATE, DELETE query
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('SQLite query error:', err);
            reject(err);
          } else {
            resolve({
              rowCount: this.changes,
              lastID: this.lastID,
              rows: []
            });
          }
        });
      }
    });
  }

  async transaction(callback) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.query('BEGIN TRANSACTION');
        const result = await callback(this);
        await this.query('COMMIT');
        resolve(result);
      } catch (error) {
        await this.query('ROLLBACK');
        reject(error);
      }
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async checkConnection() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const database = new SQLiteDatabase();

module.exports = database;
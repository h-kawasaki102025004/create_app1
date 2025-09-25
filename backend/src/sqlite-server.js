const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const database = require('./config/sqlite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3004',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
let dbConnected = false;

/**
 * Initialize the SQLite database connection and update the module's connection state.
 *
 * Attempts to establish a database connection and sets the module-level `dbConnected`
 * flag to `true` when successful; sets `dbConnected` to `false` on failure or error.
 */
async function initializeDatabase() {
  try {
    await database.connect();
    dbConnected = await database.checkConnection();

    if (dbConnected) {
      console.log('✅ SQLite database connected and ready');
    } else {
      console.log('❌ SQLite database connection failed');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    dbConnected = false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: dbConnected ? 'OK' : 'WARNING',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// API Routes
app.get('/api/v1/test', (req, res) => {
  res.json({
    message: 'Food Waste Reduction API with SQLite is running!',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'SQLite Connected' : 'Database Disconnected'
  });
});

// Mock auth routes for testing
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (dbConnected) {
      // Check user in database
      const result = await database.query(
        'SELECT id, username, email, password_hash FROM users WHERE email = ? AND is_active = 1',
        [email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        // In production, use bcrypt to compare password
        // For now, accept any password for testing
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          access_token: 'sqlite-access-token',
          refresh_token: 'sqlite-refresh-token'
        });

        // Update last login
        await database.query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
        return;
      }
    }

    // Fallback to mock auth
    if (email === 'test@example.com' && password === 'password') {
      res.json({
        success: true,
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (dbConnected) {
      // Insert user into database
      const result = await database.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, password] // In production, hash the password
      );

      res.json({
        success: true,
        user: {
          id: result.lastID,
          username,
          email
        },
        access_token: 'sqlite-access-token',
        refresh_token: 'sqlite-refresh-token'
      });
      return;
    }

    // Fallback to mock
    res.json({
      success: true,
      user: {
        id: 1,
        username,
        email
      },
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Food management routes
app.get('/api/v1/foods', async (req, res) => {
  try {
    if (dbConnected) {
      const result = await database.query(`
        SELECT
          f.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color
        FROM foods f
        LEFT JOIN categories c ON f.category_id = c.id
        WHERE f.status = 'active'
        ORDER BY f.created_at DESC
      `);

      console.log(`📋 SQLite: 食材リスト取得 ${result.rows.length} 件`);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: 1,
          per_page: 50,
          total: result.rows.length,
          total_pages: Math.ceil(result.rows.length / 50)
        }
      });
      return;
    }

    // Fallback to empty list
    res.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        per_page: 10,
        total: 0,
        total_pages: 0
      }
    });
  } catch (error) {
    console.error('Foods fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch foods'
    });
  }
});

app.post('/api/v1/foods', async (req, res) => {
  try {
    const { name, category_id, quantity, unit, purchase_date, expiry_date, storage_location } = req.body;

    if (dbConnected) {
      const result = await database.query(`
        INSERT INTO foods (
          name, category_id, quantity, unit,
          purchase_date, expiry_date, storage_location,
          user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, category_id || 1, quantity || 1, unit || '個',
        purchase_date || new Date().toISOString().split('T')[0],
        expiry_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        storage_location || '冷蔵庫',
        1, // Default user_id
        'active'
      ]);

      // Get the created food with category info
      const createdFood = await database.query(`
        SELECT
          f.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color
        FROM foods f
        LEFT JOIN categories c ON f.category_id = c.id
        WHERE f.id = ?
      `, [result.lastID]);

      console.log(`✅ SQLite: 食材追加 - ${name}`);

      res.status(201).json({
        success: true,
        data: createdFood.rows[0]
      });
      return;
    }

    // Fallback response
    const food = {
      id: Date.now(),
      name,
      category_id: category_id || 1,
      quantity: quantity || 1,
      unit: unit || '個',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      expiry_date: expiry_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      storage_location: storage_location || '冷蔵庫',
      status: 'active',
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Food creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create food'
    });
  }
});

// Delete food item
app.delete('/api/v1/foods/:id', async (req, res) => {
  try {
    const foodId = parseInt(req.params.id);

    if (!foodId || isNaN(foodId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid food ID'
      });
    }

    if (dbConnected) {
      // Check if food exists
      const existing = await database.query('SELECT id, name FROM foods WHERE id = ? AND status = "active"', [foodId]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Food item not found'
        });
      }

      // Soft delete - update status to 'deleted'
      await database.query('UPDATE foods SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [foodId]);

      console.log(`🗑️ SQLite: 食材削除 - ${existing.rows[0].name} (ID: ${foodId})`);

      res.json({
        success: true,
        message: 'Food item deleted successfully',
        data: { id: foodId, name: existing.rows[0].name }
      });
      return;
    }

    // Fallback response
    res.json({
      success: true,
      message: 'Food item deleted successfully (mock)',
      data: { id: foodId }
    });

  } catch (error) {
    console.error('Food deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete food item'
    });
  }
});

// Categories route
app.get('/api/v1/categories', async (req, res) => {
  try {
    if (dbConnected) {
      const result = await database.query('SELECT * FROM categories ORDER BY name');

      res.json({
        success: true,
        data: result.rows
      });
      return;
    }

    // Fallback categories
    const categories = [
      { id: 1, name: '果物', icon: '🍎', color: '#FF6B6B' },
      { id: 2, name: '野菜', icon: '🥕', color: '#4ECDC4' },
      { id: 3, name: '肉類', icon: '🥩', color: '#45B7D1' },
      { id: 4, name: '乳製品', icon: '🥛', color: '#96CEB4' },
      { id: 5, name: '穀物', icon: '🌾', color: '#FECA57' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error caught by middleware:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  const errorResponse = {
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.error = error.message || 'Internal server error';
  }

  res.status(500).json(errorResponse);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

/**
 * Initialize the database connection and start the Express server, logging runtime and environment information.
 *
 * This function calls initializeDatabase() and then begins listening on the configured PORT,
 * emitting startup details such as environment, database connection status, health-check and API URLs,
 * test credentials, and the SQLite file path.
 */
async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Food Waste Reduction API Server (SQLite) running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗃️  Database: ${dbConnected ? 'SQLite Connected' : 'Database Disconnected (Fallback Mode)'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API base URL: http://localhost:${PORT}/api/v1`);
    console.log('');
    console.log('Test credentials:');
    console.log('  Email: test@example.com');
    console.log('  Password: password');
    console.log('');
    console.log('📁 SQLite database: backend/database/foodapp.db');
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
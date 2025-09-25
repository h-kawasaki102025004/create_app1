const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = 5002;

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

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
  res.status(200).json(healthStatus);
});

// API Routes
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Food Waste Reduction API is running!', timestamp: new Date().toISOString() });
});

// Mock auth routes for testing
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;

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
});

app.post('/api/v1/auth/register', (req, res) => {
  const { username, email, password } = req.body;

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
});

// In-memory storage for foods
let foods = [
  {
    id: 1,
    name: 'りんご',
    category_id: 1,
    quantity: 3,
    unit: '個',
    purchase_date: '2024-01-15',
    expiry_date: '2024-01-25',
    storage_location: '冷蔵庫',
    status: 'active'
  },
  {
    id: 2,
    name: '牛乳',
    category_id: 2,
    quantity: 1,
    unit: 'L',
    purchase_date: '2024-01-16',
    expiry_date: '2024-01-20',
    storage_location: '冷蔵庫',
    status: 'active'
  }
];

// Mock food routes
app.get('/api/v1/foods', (req, res) => {
  console.log('📋 現在の食材リスト:', foods.length, '件');
  res.json({
    success: true,
    data: foods,
    pagination: {
      page: 1,
      per_page: 10,
      total: foods.length,
      total_pages: Math.ceil(foods.length / 10)
    }
  });
});

app.post('/api/v1/foods', (req, res) => {
  const food = {
    id: Date.now(),
    ...req.body,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  foods.push(food);
  console.log('✅ 食材を追加:', food.name, '総数:', foods.length, '件');

  res.status(201).json({
    success: true,
    data: food
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Food Waste Reduction API Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api/v1`);
  console.log('');
  console.log('Mock credentials for testing:');
  console.log('  Email: test@example.com');
  console.log('  Password: password');
});

module.exports = app;
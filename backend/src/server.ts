import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from './config/environment';
import { Database } from './config/database';
import redisClient from './config/redis';
import { ErrorMiddleware } from './middleware/error.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import foodRoutes from './routes/food.routes';
import categoryRoutes from './routes/category.routes';
import notificationRoutes from './routes/notification.routes';
import recipeRoutes from './routes/recipe.routes';
import shoppingRoutes from './routes/shopping.routes';
import storageRoutes from './routes/storage.routes';

class Server {
  private app: express.Application;
  private database: Database;

  constructor() {
    this.app = express();
    this.database = new Database();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Request logging in development
    if (config.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }

    // Health check endpoint
    this.app.get('/health', ErrorMiddleware.healthCheck);
  }

  private initializeRoutes(): void {
    const apiRouter = express.Router();

    // API routes
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/foods', foodRoutes);
    apiRouter.use('/categories', categoryRoutes);
    apiRouter.use('/notifications', notificationRoutes);
    apiRouter.use('/recipes', recipeRoutes);
    apiRouter.use('/shopping', shoppingRoutes);
    apiRouter.use('/storage', storageRoutes);

    this.app.use('/api/v1', apiRouter);

    // Catch 404
    this.app.use('*', ErrorMiddleware.notFound);
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.handle);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await this.database.initialize();
      console.log('Database connection established');

      // Test Redis connection
      try {
        await redisClient.ping();
        console.log('Redis connection established');
      } catch (error) {
        console.warn('Redis connection failed, rate limiting will be disabled:', error);
      }

      // Start server
      const server = this.app.listen(config.PORT, () => {
        console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
        console.log(`API available at: http://localhost:${config.PORT}/api/v1`);
        console.log(`Health check: http://localhost:${config.PORT}/health`);
      });

      // Graceful shutdown
      ErrorMiddleware.setupGracefulShutdown(server);

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default Server;
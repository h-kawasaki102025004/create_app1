import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '@shared/types';
import { config } from '../config/environment';

export interface ErrorResponse {
  success: false;
  error: string;
  errors?: Record<string, string[]>;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

export class ErrorMiddleware {
  static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    console.error('Error caught by middleware:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    // Handle different error types
    if (error instanceof ValidationError) {
      errorResponse.error = error.message;
      errorResponse.errors = error.errors;
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    if (error instanceof AppError) {
      errorResponse.error = error.message;
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Handle specific error types
    if (error.name === 'JsonWebTokenError') {
      errorResponse.error = 'Invalid token';
      res.status(401).json(errorResponse);
      return;
    }

    if (error.name === 'TokenExpiredError') {
      errorResponse.error = 'Token expired';
      res.status(401).json(errorResponse);
      return;
    }

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      errorResponse.error = 'Invalid JSON format';
      res.status(400).json(errorResponse);
      return;
    }

    // Database errors
    if (error.message.includes('duplicate key')) {
      errorResponse.error = 'Resource already exists';
      res.status(409).json(errorResponse);
      return;
    }

    if (error.message.includes('foreign key')) {
      errorResponse.error = 'Referenced resource not found';
      res.status(400).json(errorResponse);
      return;
    }

    if (error.message.includes('connection')) {
      errorResponse.error = 'Database connection error';
      res.status(503).json(errorResponse);
      return;
    }

    // File upload errors
    if (error.message.includes('File too large')) {
      errorResponse.error = 'File size exceeds limit';
      res.status(413).json(errorResponse);
      return;
    }

    if (error.message.includes('Unexpected field')) {
      errorResponse.error = 'Invalid file field';
      res.status(400).json(errorResponse);
      return;
    }

    // Rate limiting errors
    if (error.message.includes('Too many requests')) {
      errorResponse.error = 'Rate limit exceeded';
      res.status(429).json(errorResponse);
      return;
    }

    // Include stack trace in development
    if (config.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.error = error.message || 'Internal server error';
    }

    res.status(500).json(errorResponse);
  }

  static notFound(req: Request, res: Response, next: NextFunction): void {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
  }

  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Log errors for monitoring
  static logError(error: Error, req: Request): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      body: req.body,
      params: req.params,
      query: req.query
    };

    // In production, you would send this to a logging service
    if (config.NODE_ENV === 'production') {
      // Example: send to logging service
      // logger.error(logData);
      console.error('Production Error:', JSON.stringify(logData, null, 2));
    } else {
      console.error('Development Error:', logData);
    }
  }

  // Graceful shutdown handler
  static setupGracefulShutdown(server: any): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, starting graceful shutdown...`);

        server.close((err: Error) => {
          if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
          }

          console.log('Server closed gracefully');
          process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          console.error('Forcing shutdown after timeout');
          process.exit(1);
        }, 30000);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      ErrorMiddleware.logError(error, {} as Request);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);

      if (reason instanceof Error) {
        ErrorMiddleware.logError(reason, {} as Request);
      } else {
        console.error('Non-error rejection:', reason);
      }

      process.exit(1);
    });
  }

  // Health check for error monitoring
  static healthCheck = (req: Request, res: Response): void => {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: config.NODE_ENV
    };

    res.status(200).json(healthStatus);
  };
}
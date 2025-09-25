import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import { AppError } from '@shared/types';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimitMiddleware {
  private static async checkRateLimit(
    key: string,
    options: RateLimitOptions,
    req: Request
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    const redisKey = `rate_limit:${key}:${windowStart}`;

    try {
      // Get current request count
      const currentCount = await redisClient.get(redisKey);
      const requestCount = currentCount ? parseInt(currentCount) : 0;

      if (requestCount >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + windowMs
        };
      }

      // Increment counter
      const newCount = await redisClient.incrementWithExpire(redisKey, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - newCount),
        resetTime: windowStart + windowMs
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: windowStart + windowMs
      };
    }
  }

  private static createRateLimiter(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Create unique key for this client
        const clientId = req.ip || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        const key = `${clientId}:${req.route?.path || req.path}:${userAgent}`.slice(0, 200);

        const result = await RateLimitMiddleware.checkRateLimit(key, options, req);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.set('Retry-After', retryAfter.toString());

          res.status(429).json({
            success: false,
            error: options.message || 'Too many requests',
            retry_after: retryAfter
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        // Fail open - continue with the request
        next();
      }
    };
  }

  // General API rate limiter
  static apiLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'API rate limit exceeded. Please try again later.'
  });

  // Strict rate limiter for authentication endpoints
  static loginLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.'
  });

  // Account creation limiter
  static createAccountLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 account creations per hour
    message: 'Too many account creation attempts. Please try again later.'
  });

  // Password reset limiter
  static passwordResetLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3, // 3 password reset requests per 15 minutes
    message: 'Too many password reset attempts. Please try again later.'
  });

  // Token refresh limiter
  static tokenLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 token refresh attempts per 5 minutes
    message: 'Too many token refresh attempts. Please try again later.'
  });

  // Search limiter (more restrictive)
  static searchLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Search rate limit exceeded. Please try again later.'
  });

  // File upload limiter
  static uploadLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 50 uploads per 15 minutes
    message: 'Upload rate limit exceeded. Please try again later.'
  });

  // Email limiter (very restrictive)
  static emailLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 emails per hour
    message: 'Email rate limit exceeded. Please try again later.'
  });

  // Admin operations limiter
  static adminLimiter = RateLimitMiddleware.createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 admin operations per minute
    message: 'Admin operation rate limit exceeded. Please try again later.'
  });

  // Custom rate limiter for specific use cases
  static customLimiter(options: RateLimitOptions) {
    return RateLimitMiddleware.createRateLimiter(options);
  }

  // User-specific rate limiter (requires authentication)
  static userSpecificLimiter(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        // If no user, fall back to IP-based limiting
        return RateLimitMiddleware.createRateLimiter(options)(req, res, next);
      }

      try {
        const key = `user:${req.user.id}:${req.route?.path || req.path}`;
        const result = await RateLimitMiddleware.checkRateLimit(key, options, req);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.set('Retry-After', retryAfter.toString());

          res.status(429).json({
            success: false,
            error: options.message || 'Too many requests',
            retry_after: retryAfter
          });
          return;
        }

        next();
      } catch (error) {
        console.error('User-specific rate limiting error:', error);
        next();
      }
    };
  }

  // Rate limiter with dynamic limits based on user tier/subscription
  static dynamicLimiter(
    getLimits: (req: Request) => { windowMs: number; maxRequests: number; message?: string }
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const limits = getLimits(req);
        const limiter = RateLimitMiddleware.createRateLimiter(limits);
        return limiter(req, res, next);
      } catch (error) {
        console.error('Dynamic rate limiting error:', error);
        next();
      }
    };
  }

  // Skip rate limiting for certain conditions
  static skipIf(condition: (req: Request) => boolean, limiter: any) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (condition(req)) {
        next();
        return;
      }

      limiter(req, res, next);
    };
  }

  // Composite rate limiter that applies multiple limits
  static composite(limiters: Array<(req: Request, res: Response, next: NextFunction) => void>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      let index = 0;

      const runNext = (): void => {
        if (index >= limiters.length) {
          next();
          return;
        }

        const limiter = limiters[index++];
        limiter(req, res, (error?: any) => {
          if (error || res.headersSent) {
            return; // Stop if there's an error or response was sent
          }
          runNext();
        });
      };

      runNext();
    };
  }
}
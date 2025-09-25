import { Request, Response, NextFunction } from 'express';
import { CryptoUtils } from '../utils/crypto';
import { AppError } from '@shared/types';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
      };
    }
  }
}

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AppError('Access token is required', 401);
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        throw new AppError('Access token is required', 401);
      }

      // Verify JWT token
      const decoded = CryptoUtils.verifyToken(token);

      if (decoded.type !== 'access') {
        throw new AppError('Invalid token type', 401);
      }

      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired access token'
        });
      }
    }
  }

  static optional(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader;

        if (token) {
          try {
            const decoded = CryptoUtils.verifyToken(token);

            if (decoded.type === 'access') {
              req.user = {
                id: decoded.id,
                email: decoded.email,
                username: decoded.username
              };
            }
          } catch {
            // Ignore token errors for optional auth
          }
        }
      }

      next();
    } catch {
      // Ignore all errors for optional auth
      next();
    }
  }

  static requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
    // This would require checking user's email verification status
    // For now, we'll skip this check but it should be implemented
    next();
  }

  static requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Role-based authorization would be implemented here
      // For now, all authenticated users have access
      next();
    };
  }

  static requireOwnership(entityParam: string = 'id') {
    return (req: Request, res: Response, next: NextFunction): void => {
      // This middleware would check if the authenticated user owns the resource
      // Implementation would depend on the specific entity
      next();
    };
  }
}

// Helper function to get current user from request
export function getCurrentUser(req: Request): { id: number; email: string; username: string } {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }
  return req.user;
}

// Helper function to check if user is authenticated
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}
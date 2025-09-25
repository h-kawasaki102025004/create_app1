import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ValidationError } from '@shared/types';
import { ValidationUtils } from '@shared/utils';

export class ValidationMiddleware {
  // Auth validation schemas
  private static registrationSchema = Joi.object({
    username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, hyphens, and underscores'
      }),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  });

  private static loginSchema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required()
  });

  private static refreshTokenSchema = Joi.object({
    refresh_token: Joi.string().required()
  });

  private static passwordResetRequestSchema = Joi.object({
    email: Joi.string().email().required()
  });

  private static passwordResetSchema = Joi.object({
    password: Joi.string().min(8).required()
  });

  private static passwordChangeSchema = Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).required()
  });

  private static accountDeactivationSchema = Joi.object({
    password: Joi.string().required()
  });

  // Food validation schemas
  private static foodCreationSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    category_id: Joi.number().integer().positive().required(),
    purchase_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    expiry_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().min(1).max(20).required(),
    storage_location: Joi.string().valid('冷蔵庫', '冷凍庫', '常温', 'その他').optional(),
    barcode: Joi.string().max(50).optional(),
    image_url: Joi.string().uri().max(500).optional(),
    notes: Joi.string().max(1000).optional()
  });

  private static foodUpdateSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    category_id: Joi.number().integer().positive().optional(),
    purchase_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    expiry_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    quantity: Joi.number().positive().optional(),
    unit: Joi.string().min(1).max(20).optional(),
    storage_location: Joi.string().valid('冷蔵庫', '冷凍庫', '常温', 'その他').optional(),
    barcode: Joi.string().max(50).optional().allow(''),
    image_url: Joi.string().uri().max(500).optional().allow(''),
    notes: Joi.string().max(1000).optional().allow(''),
    status: Joi.string().valid('active', 'consumed', 'expired', 'disposed').optional()
  });

  private static bulkConsumeSchema = Joi.object({
    food_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required()
  });

  private static searchSchema = Joi.object({
    q: Joi.string().min(2).max(100).required()
  });

  // Generic validation method
  private static validate(schema: Joi.Schema, data: any): { error?: string; errors?: Record<string, string[]> } {
    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors: Record<string, string[]> = {};

      error.details.forEach(detail => {
        const key = detail.path.join('.');
        if (!errors[key]) {
          errors[key] = [];
        }
        errors[key].push(detail.message);
      });

      return { error: 'Validation failed', errors };
    }

    return {};
  }

  private static handleValidationError(res: Response, error: string, errors?: Record<string, string[]>): void {
    res.status(400).json({
      success: false,
      error,
      errors
    });
  }

  // Auth validation middleware
  static validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.registrationSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateLogin = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.loginSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.refreshTokenSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validatePasswordResetRequest = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.passwordResetRequestSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validatePasswordReset = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.passwordResetSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validatePasswordChange = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.passwordChangeSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateAccountDeactivation = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.accountDeactivationSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
    const { token } = req.params;

    if (!token || token.length < 32) {
      ValidationMiddleware.handleValidationError(res, 'Invalid verification token');
      return;
    }

    next();
  };

  // Food validation middleware
  static validateFoodCreation = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.foodCreationSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    // Additional validation for date logic
    const { purchase_date, expiry_date } = req.body;
    if (ValidationUtils.isValidDate(purchase_date) && ValidationUtils.isValidDate(expiry_date)) {
      const purchaseDate = new Date(purchase_date);
      const expiryDate = new Date(expiry_date);

      if (expiryDate < purchaseDate) {
        ValidationMiddleware.handleValidationError(res, 'Validation failed', {
          expiry_date: ['Expiry date cannot be before purchase date']
        });
        return;
      }
    }

    next();
  };

  static validateFoodUpdate = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.foodUpdateSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateBulkConsume = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.bulkConsumeSchema,
      req.body
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  static validateSearch = (req: Request, res: Response, next: NextFunction): void => {
    const { error, errors } = ValidationMiddleware.validate(
      ValidationMiddleware.searchSchema,
      req.query
    );

    if (error) {
      ValidationMiddleware.handleValidationError(res, error, errors);
      return;
    }

    next();
  };

  // Generic ID parameter validation
  static validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
    const { id } = req.params;
    const numericId = parseInt(id);

    if (isNaN(numericId) || numericId <= 0) {
      ValidationMiddleware.handleValidationError(res, 'Invalid ID parameter');
      return;
    }

    next();
  };

  // Query parameter validation helpers
  static validatePaginationParams = (req: Request, res: Response, next: NextFunction): void => {
    const { page, per_page } = req.query;

    if (page && (isNaN(parseInt(page as string)) || parseInt(page as string) < 1)) {
      ValidationMiddleware.handleValidationError(res, 'Invalid page parameter');
      return;
    }

    if (per_page && (isNaN(parseInt(per_page as string)) || parseInt(per_page as string) < 1 || parseInt(per_page as string) > 100)) {
      ValidationMiddleware.handleValidationError(res, 'Invalid per_page parameter (must be 1-100)');
      return;
    }

    next();
  };

  static validateSortParams = (req: Request, res: Response, next: NextFunction): void => {
    const { sort_by, sort_order } = req.query;

    const allowedSortFields = ['name', 'expiry_date', 'purchase_date', 'created_at'];
    const allowedSortOrders = ['asc', 'desc'];

    if (sort_by && !allowedSortFields.includes(sort_by as string)) {
      ValidationMiddleware.handleValidationError(res, `Invalid sort_by parameter. Allowed values: ${allowedSortFields.join(', ')}`);
      return;
    }

    if (sort_order && !allowedSortOrders.includes(sort_order as string)) {
      ValidationMiddleware.handleValidationError(res, `Invalid sort_order parameter. Allowed values: ${allowedSortOrders.join(', ')}`);
      return;
    }

    next();
  };
}
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRegistrationData, UserLoginData, AppError, ValidationError } from '@shared/types';
import { getCurrentUser } from '../middleware/auth.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: UserRegistrationData = req.body;
      const result = await this.authService.register(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: UserLoginData = req.body;
      const result = await this.authService.login(loginData);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        throw new AppError('Refresh token is required', 400);
      }

      const result = await this.authService.refreshToken(refresh_token);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const { refresh_token } = req.body;

      await this.authService.logout(user.id, refresh_token);

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        throw new AppError('Verification token is required', 400);
      }

      const user = await this.authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        data: { user },
        message: 'Email verified successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      await this.authService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!token) {
        throw new AppError('Reset token is required', 400);
      }

      if (!password) {
        throw new AppError('New password is required', 400);
      }

      await this.authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        throw new AppError('Current password and new password are required', 400);
      }

      await this.authService.changePassword(user.id, current_password, new_password);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);

      res.status(200).json({
        success: true,
        data: { user },
        message: 'User information retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  deactivateAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getCurrentUser(req);
      const { password } = req.body;

      if (!password) {
        throw new AppError('Password is required to deactivate account', 400);
      }

      await this.authService.deactivateAccount(user.id, password);

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private handleError(res: Response, error: unknown): void {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        errors: error.errors
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Unexpected error in AuthController:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
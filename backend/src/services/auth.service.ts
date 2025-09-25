import { CryptoUtils } from '../utils/crypto';
import { UserRepository } from '../repositories/user.repository';
import { ValidationUtils } from '@shared/utils';
import { User, UserRegistrationData, UserLoginData, AuthResponse, ValidationError, AppError } from '@shared/types';
import redisClient from '../config/redis';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(userData: UserRegistrationData): Promise<AuthResponse> {
    // Validate input
    await this.validateRegistrationData(userData);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmailOrUsername(userData.email);
    if (existingUser) {
      throw new AppError('User with this email or username already exists', 409);
    }

    // Hash password
    const passwordHash = await CryptoUtils.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
      email_verified: false,
      is_active: true
    });

    // Generate email verification token
    const verificationToken = CryptoUtils.generateVerificationToken();
    await this.userRepository.setVerificationToken(user.id, verificationToken);

    // Generate auth tokens
    const tokens = CryptoUtils.generateTokenPair(user);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refresh_token);

    // Log user action
    await this.logUserAction(user.id, 'register', 'user', user.id);

    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  async login(loginData: UserLoginData): Promise<AuthResponse> {
    // Validate input
    this.validateLoginData(loginData);

    // Find user by email or username
    const user = await this.userRepository.findByEmailOrUsername(loginData.email);
    if (!user || !user.is_active) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await CryptoUtils.verifyPassword(loginData.password, user.password_hash!);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate auth tokens
    const tokens = CryptoUtils.generateTokenPair(user);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refresh_token);

    // Log user action
    await this.logUserAction(user.id, 'login', 'user', user.id);

    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = CryptoUtils.verifyToken(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
      }

      // Check if token exists in Redis
      const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Get user
      const user = await this.userRepository.findById(decoded.id);
      if (!user || !user.is_active) {
        throw new AppError('User not found or inactive', 401);
      }

      // Generate new tokens
      const tokens = CryptoUtils.generateTokenPair(user);

      // Store new refresh token
      await this.storeRefreshToken(user.id, tokens.refresh_token);

      // Log user action
      await this.logUserAction(user.id, 'refresh_token', 'user', user.id);

      return {
        user: this.sanitizeUser(user),
        tokens
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    // Remove refresh token from Redis
    if (refreshToken) {
      await redisClient.del(`refresh_token:${userId}`);
    }

    // Log user action
    await this.logUserAction(userId, 'logout', 'user', userId);
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new AppError('Invalid verification token', 400);
    }

    const verifiedUser = await this.userRepository.setEmailVerified(user.id);
    if (!verifiedUser) {
      throw new AppError('Failed to verify email', 500);
    }

    // Log user action
    await this.logUserAction(user.id, 'email_verified', 'user', user.id);

    return this.sanitizeUser(verifiedUser);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const { token, hash } = CryptoUtils.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.setResetPasswordToken(email, hash, expiresAt);

    // TODO: Send password reset email with token

    // Log user action
    await this.logUserAction(user.id, 'password_reset_requested', 'user', user.id);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password
    const validation = CryptoUtils.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        password: validation.errors
      });
    }

    // Hash token and find user
    const tokenHash = CryptoUtils.hashString(token);
    const user = await this.userRepository.findByResetToken(tokenHash);

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const passwordHash = await CryptoUtils.hashPassword(newPassword);

    // Update password and clear reset token
    await this.userRepository.updatePassword(user.id, passwordHash);
    await this.userRepository.clearResetPasswordToken(user.id);

    // Invalidate all refresh tokens for security
    await redisClient.del(`refresh_token:${user.id}`);

    // Log user action
    await this.logUserAction(user.id, 'password_reset', 'user', user.id);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await CryptoUtils.verifyPassword(currentPassword, user.password_hash!);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Validate new password
    const validation = CryptoUtils.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        password: validation.errors
      });
    }

    // Hash new password
    const passwordHash = await CryptoUtils.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, passwordHash);

    // Invalidate all refresh tokens for security
    await redisClient.del(`refresh_token:${userId}`);

    // Log user action
    await this.logUserAction(userId, 'password_changed', 'user', userId);
  }

  async validateToken(token: string): Promise<User> {
    try {
      const decoded = CryptoUtils.verifyToken(token);

      if (decoded.type !== 'access') {
        throw new AppError('Invalid token type', 401);
      }

      const user = await this.userRepository.findById(decoded.id);
      if (!user || !user.is_active) {
        throw new AppError('User not found or inactive', 401);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new AppError('Invalid access token', 401);
    }
  }

  async deactivateAccount(userId: number, password: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify password
    const isPasswordValid = await CryptoUtils.verifyPassword(password, user.password_hash!);
    if (!isPasswordValid) {
      throw new AppError('Password is incorrect', 400);
    }

    // Deactivate user
    await this.userRepository.deactivateUser(userId);

    // Remove refresh tokens
    await redisClient.del(`refresh_token:${userId}`);

    // Log user action
    await this.logUserAction(userId, 'account_deactivated', 'user', userId);
  }

  private async validateRegistrationData(data: UserRegistrationData): Promise<void> {
    const errors: Record<string, string[]> = {};

    // Validate username
    if (!data.username || data.username.length < 3) {
      errors.username = ['Username must be at least 3 characters long'];
    } else if (data.username.length > 50) {
      errors.username = ['Username must not exceed 50 characters'];
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
      errors.username = ['Username can only contain letters, numbers, hyphens, and underscores'];
    }

    // Validate email
    if (!ValidationUtils.isValidEmail(data.email)) {
      errors.email = ['Please provide a valid email address'];
    }

    // Validate password
    const passwordValidation = CryptoUtils.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors;
    }

    // Check for existing email
    if (data.email && await this.userRepository.checkEmailExists(data.email)) {
      errors.email = (errors.email || []).concat(['Email is already registered']);
    }

    // Check for existing username
    if (data.username && await this.userRepository.checkUsernameExists(data.username)) {
      errors.username = (errors.username || []).concat(['Username is already taken']);
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  private validateLoginData(data: UserLoginData): void {
    const errors: Record<string, string[]> = {};

    if (!data.email) {
      errors.email = ['Email is required'];
    }

    if (!data.password) {
      errors.password = ['Password is required'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  private async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    const expiry = 30 * 24 * 60 * 60; // 30 days in seconds
    await redisClient.set(key, refreshToken, { EX: expiry });
  }

  private sanitizeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async logUserAction(
    userId: number,
    action: string,
    entityType: string,
    entityId?: number
  ): Promise<void> {
    // TODO: Implement audit logging
    console.log(`User ${userId} performed action: ${action} on ${entityType} ${entityId}`);
  }
}
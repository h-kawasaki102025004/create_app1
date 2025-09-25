import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/environment';
import { User, AuthTokens } from '@shared/types';

export class CryptoUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_ALGORITHM = 'HS256';

  // Password hashing
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  // JWT token generation and verification
  static generateAccessToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      type: 'access'
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
      algorithm: this.TOKEN_ALGORITHM,
      issuer: 'food-waste-app',
      audience: 'food-waste-users'
    });
  }

  static generateRefreshToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh',
      jti: crypto.randomUUID() // Unique token ID
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      algorithm: this.TOKEN_ALGORITHM,
      issuer: 'food-waste-app',
      audience: 'food-waste-users'
    });
  }

  static generateTokenPair(user: User): AuthTokens {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Parse expiry from access token
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn
    };
  }

  static verifyToken(token: string): jwt.JwtPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        algorithms: [this.TOKEN_ALGORITHM],
        issuer: 'food-waste-app',
        audience: 'food-waste-users'
      }) as jwt.JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static decodeToken(token: string): jwt.JwtPayload | null {
    try {
      return jwt.decode(token) as jwt.JwtPayload;
    } catch (error) {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch (error) {
      return true;
    }
  }

  // API key generation
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateSecretKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Password reset token
  static generateResetToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  static verifyResetToken(token: string, hash: string): boolean {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }

  // Email verification token
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Session token
  static generateSessionToken(): string {
    return crypto.randomUUID();
  }

  // CSRF token
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // File encryption (for sensitive uploads)
  static encryptBuffer(buffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);

    const cipher = crypto.createCipherGCM(algorithm, keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
  }

  static decryptBuffer(encryptedBuffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);

    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(16, 32);
    const encrypted = encryptedBuffer.subarray(32);

    const decipher = crypto.createDecipherGCM(algorithm, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // Hash functions
  static hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  static hashStringWithSalt(input: string, salt: string): string {
    return crypto.createHash('sha256').update(input + salt).digest('hex');
  }

  // Secure random
  static generateSecureRandom(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateNumericOTP(length: number = 6): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    return (Math.floor(crypto.randomInt(min, max + 1))).toString().padStart(length, '0');
  }

  // Timing safe comparison
  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  // Password strength validation
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      errors.push('パスワードは8文字以上である必要があります');
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('小文字を含む必要があります');
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('大文字を含む必要があります');
    } else {
      score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
      errors.push('数字を含む必要があります');
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('特殊文字を含む必要があります');
    } else {
      score += 1;
    }

    // Common password check
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('よく使われるパスワードは使用できません');
      score = Math.max(0, score - 2);
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(5, score)
    };
  }

  // Token blacklist utility
  static extractTokenId(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.jti || decoded?.iat?.toString() || null;
    } catch (error) {
      return null;
    }
  }
}
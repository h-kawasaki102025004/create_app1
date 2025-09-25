import { BaseApi } from './base.api';
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordChangeRequest
} from '@shared/types';

class AuthApi extends BaseApi {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', data);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', data);
  }

  async logout(): Promise<void> {
    return this.post<void>('/auth/logout');
  }

  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/refresh', data);
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/auth/me');
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/request-password-reset', data);
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/auth/reset-password/${token}`, { password });
  }

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/change-password', data);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.get<{ message: string }>(`/auth/verify-email/${token}`);
  }

  async deactivateAccount(password: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/deactivate', { password });
  }
}

export const authApi = new AuthApi();
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '@shared/types';
import { authApi } from '../services/api/auth.api';
import { tokenManager } from '../services/auth/tokenManager';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Retrieves the current authentication context.
 *
 * @returns The authentication context object containing `user`, `isLoading`, `isAuthenticated`, and authentication actions (`login`, `register`, `logout`, `refreshToken`).
 * @throws If called outside an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides authentication state and actions to descendant components.
 *
 * Initializes auth state on mount, automatically refreshes tokens when needed,
 * and exposes `user`, `isLoading`, `isAuthenticated`, `login`, `register`,
 * `logout`, and `refreshToken` via context.
 *
 * @param children - The React nodes that will receive the authentication context
 * @returns A React element that provides authentication context to its children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      if (token && !tokenManager.isTokenExpired(token)) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to get current user:', error);
          tokenManager.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = () => {
      const token = tokenManager.getAccessToken();
      if (token && tokenManager.isTokenExpiringSoon(token)) {
        refreshToken();
      }
    };

    const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authApi.login({ email, password });

      tokenManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);

      toast.success('ログインしました');
    } catch (error: any) {
      const message = error.response?.data?.error || 'ログインに失敗しました';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authApi.register({
        username,
        email,
        password
      });

      tokenManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);

      toast.success('アカウントを作成しました');
    } catch (error: any) {
      const message = error.response?.data?.error || 'アカウント作成に失敗しました';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      tokenManager.clearTokens();
      setUser(null);
      toast.success('ログアウトしました');
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response: AuthResponse = await authApi.refreshToken({
        refresh_token: refreshToken
      });

      tokenManager.setTokens(response.access_token, response.refresh_token);

      // Update user data if provided
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      tokenManager.clearTokens();
      setUser(null);
      toast.error('セッションが期限切れです。再度ログインしてください。');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
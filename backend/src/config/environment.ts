import dotenv from 'dotenv';
import { EnvironmentConfig } from '@shared/types';

// Load environment variables from .env file
dotenv.config();

/**
 * Retrieve a required string environment variable, optionally using a fallback.
 *
 * @param name - The environment variable name to read from process.env
 * @param defaultValue - A fallback value used when the environment variable is undefined
 * @returns The environment variable value (or the provided fallback)
 * @throws Error if the resolved value is empty or undefined
 */
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

/**
 * Retrieve an integer environment variable, falling back to an optional default.
 *
 * @param name - The environment variable name to read
 * @param defaultValue - The numeric fallback to return when the variable is not set
 * @returns The parsed integer value of the environment variable, or `defaultValue` if provided
 * @throws Error when the environment variable is missing and no `defaultValue` is provided (message: `Environment variable <name> is required`)
 * @throws Error when the environment variable cannot be parsed as an integer (message: `Environment variable <name> must be a number`)
 */
function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${name} is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

/**
 * Determines the boolean value of an environment variable.
 *
 * @param name - The environment variable name to read.
 * @param defaultValue - Value returned when the environment variable is undefined or empty (defaults to `false`).
 * @returns `true` if the environment variable's value (case-insensitive) is `"true"`; `false` otherwise. If the variable is undefined or empty, returns `defaultValue`.
 */
function getEnvBoolean(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const config: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development',
  PORT: getEnvNumber('PORT', 3001),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // Redis
  REDIS_URL: getEnvVar('REDIS_URL'),

  // JWT
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),

  // AI APIs
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,

  // External APIs
  RAKUTEN_API_KEY: process.env.RAKUTEN_API_KEY,

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  // Push notifications
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,

  // File upload
  MAX_FILE_SIZE: getEnvNumber('MAX_FILE_SIZE', 10485760), // 10MB
  ALLOWED_FILE_TYPES: getEnvVar('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,gif,webp'),

  // Security
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  RATE_LIMIT_WINDOW: getEnvNumber('RATE_LIMIT_WINDOW', 15),
  RATE_LIMIT_MAX: getEnvNumber('RATE_LIMIT_MAX', 100)
};

// Validate critical configuration
if (config.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is required in production`);
    }
  }

  // Ensure JWT secret is strong enough for production
  if (config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
}

export default config;
import { createClient, RedisClientType } from 'redis';
import { config } from './environment';

class RedisClient {
  private client: RedisClientType;
  private static instance: RedisClient;
  private isConnected = false;

  private constructor() {
    this.client = createClient({
      url: config.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis disconnected');
      this.isConnected = false;
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  // Cache methods
  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number }
  ): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, options);
      return result === 'OK';
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  // JSON cache methods
  public async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis JSON GET error for key ${key}:`, error);
      return null;
    }
  }

  public async setJSON<T>(
    key: string,
    value: T,
    options?: { EX?: number; PX?: number }
  ): Promise<boolean> {
    try {
      return await this.set(key, JSON.stringify(value), options);
    } catch (error) {
      console.error(`Redis JSON SET error for key ${key}:`, error);
      return false;
    }
  }

  // Hash methods
  public async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  public async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      const result = await this.client.hSet(key, field, value);
      return result >= 0;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  // List methods
  public async lpush(key: string, value: string): Promise<number> {
    try {
      return await this.client.lPush(key, value);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      return 0;
    }
  }

  public async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rPop(key);
    } catch (error) {
      console.error(`Redis RPOP error for key ${key}:`, error);
      return null;
    }
  }

  public async llen(key: string): Promise<number> {
    try {
      return await this.client.lLen(key);
    } catch (error) {
      console.error(`Redis LLEN error for key ${key}:`, error);
      return 0;
    }
  }

  // Set methods
  public async sadd(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sAdd(key, member);
      return result > 0;
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      return false;
    }
  }

  public async srem(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sRem(key, member);
      return result > 0;
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
      return false;
    }
  }

  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  // Expiration methods
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Rate limiting
  public async incrementWithExpire(key: string, expireSeconds: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, expireSeconds);
      }
      return count;
    } catch (error) {
      console.error(`Redis increment with expire error for key ${key}:`, error);
      return 0;
    }
  }

  // Session management
  public async createSession(sessionId: string, data: any, expireSeconds: number): Promise<boolean> {
    return await this.setJSON(`session:${sessionId}`, data, { EX: expireSeconds });
  }

  public async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.getJSON<T>(`session:${sessionId}`);
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    return await this.del(`session:${sessionId}`);
  }

  // Health check
  public async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

export const redisClient = RedisClient.getInstance();
export default redisClient;
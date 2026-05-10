import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL");

    if (!redisUrl) {
      this.logger.warn("REDIS_URL 未配置，Redis 缓存功能将被禁用");
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      });

      this.client.on("connect", () => {
        this.logger.log("Redis 连接成功");
        this.isConnected = true;
      });

      this.client.on("error", (error) => {
        this.logger.warn(`Redis 连接错误: ${error.message}`);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.logger.warn("Redis 连接已关闭");
        this.isConnected = false;
      });

      this.client.connect().catch((error) => {
        this.logger.warn(
          `Redis 初始连接失败，应用将继续运行但缓存功能被禁用: ${error.message}`,
        );
        this.isConnected = false;
      });
    } catch (error) {
      this.logger.warn(
        `Redis 客户端初始化失败，缓存功能将被禁用: ${(error as Error).message}`,
      );
      this.client = null;
      this.isConnected = false;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.debug(`Redis get 失败: ${(error as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }
    try {
      if (ttl) {
        await this.client.set(key, value, "EX", ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.debug(`Redis set 失败: ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.debug(`Redis del 失败: ${(error as Error).message}`);
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      this.logger.debug(`Redis hset 失败: ${(error as Error).message}`);
      return 0;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      this.logger.debug(`Redis hget 失败: ${(error as Error).message}`);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected || !this.client) {
      return {};
    }
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      this.logger.debug(`Redis hgetall 失败: ${(error as Error).message}`);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }
    try {
      return await this.client.hdel(key, field);
    } catch (error) {
      this.logger.debug(`Redis hdel 失败: ${(error as Error).message}`);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }
    try {
      return await this.client.exists(key);
    } catch (error) {
      this.logger.debug(`Redis exists 失败: ${(error as Error).message}`);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.debug(`Redis keys 失败: ${(error as Error).message}`);
      return [];
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }
    try {
      return await this.client.lpush(key, ...values);
    } catch (error) {
      this.logger.debug(`Redis lpush 失败: ${(error as Error).message}`);
      return 0;
    }
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }
    try {
      return await this.client.rpop(key);
    } catch (error) {
      this.logger.debug(`Redis rpop 失败: ${(error as Error).message}`);
      return null;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      this.logger.debug(`Redis lrange 失败: ${(error as Error).message}`);
      return [];
    }
  }

  async llen(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }
    try {
      return await this.client.llen(key);
    } catch (error) {
      this.logger.debug(`Redis llen 失败: ${(error as Error).message}`);
      return 0;
    }
  }
}

import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  @Get()
  checkHealth() {
    const dbConnected = this.prismaService.getIsConnected();
    const redisClient = this.redisService.getClient();
    const redisConnected = !!redisClient;

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? "connected" : "disconnected",
        redis: redisConnected ? "connected" : "disconnected",
      },
    };
  }

  @Get("ready")
  async checkReady() {
    const dbConnected = this.prismaService.getIsConnected();

    if (!dbConnected) {
      return {
        status: "not_ready",
        message: "数据库未连接",
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  }
}

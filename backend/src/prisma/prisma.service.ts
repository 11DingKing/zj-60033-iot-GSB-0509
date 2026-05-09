import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log("数据库连接成功");
    } catch (error) {
      this.logger.error(
        `数据库连接失败: ${(error as Error).message}`,
      );
      this.logger.warn(
        "应用将继续运行，但数据库相关功能将不可用。请确保 PostgreSQL 容器已启动且数据库已创建。",
      );
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
      this.logger.log("数据库连接已关闭");
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { DevicesModule } from "./devices/devices.module";
import { DataRecordsModule } from "./data-records/data-records.module";
import { AlertsModule } from "./alerts/alerts.module";
import { StatisticsModule } from "./statistics/statistics.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    DevicesModule,
    DataRecordsModule,
    AlertsModule,
    StatisticsModule,
    SchedulerModule,
    HealthModule,
  ],
})
export class AppModule {}

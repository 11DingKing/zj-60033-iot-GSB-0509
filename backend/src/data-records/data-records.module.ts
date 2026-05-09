import { Module } from "@nestjs/common";
import { DataRecordsService } from "./data-records.service";
import { DataRecordsController } from "./data-records.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [DataRecordsController],
  providers: [DataRecordsService],
  exports: [DataRecordsService],
})
export class DataRecordsModule {}

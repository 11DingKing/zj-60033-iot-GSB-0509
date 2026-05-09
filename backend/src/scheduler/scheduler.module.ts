import { Module } from "@nestjs/common";
import { SchedulerService } from "./scheduler.service";
import { DevicesModule } from "../devices/devices.module";
import { DataRecordsModule } from "../data-records/data-records.module";
import { AlertsModule } from "../alerts/alerts.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [DevicesModule, DataRecordsModule, AlertsModule, RedisModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

import { Module } from "@nestjs/common";
import { SchedulerService } from "./scheduler.service";
import { DevicesModule } from "../devices/devices.module";
import { DataRecordsModule } from "../data-records/data-records.module";
import { AlertsModule } from "../alerts/alerts.module";

@Module({
  imports: [DevicesModule, DataRecordsModule, AlertsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

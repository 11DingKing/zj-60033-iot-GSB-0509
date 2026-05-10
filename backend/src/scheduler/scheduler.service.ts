import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DevicesService } from "../devices/devices.service";
import { DataRecordsService } from "../data-records/data-records.service";
import { AlertsService } from "../alerts/alerts.service";
import { DeviceStatus } from "@prisma/client";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private devicesService: DevicesService,
    private dataRecordsService: DataRecordsService,
    private alertsService: AlertsService,
  ) {}

  @Cron("*/30 * * * * *")
  async handleDataGeneration() {
    this.logger.debug("开始执行定时数据生成任务...");

    try {
      const onlineDevices = await this.devicesService.getOnlineDevices();
      this.logger.log(`发现 ${onlineDevices.length} 个在线设备`);

      for (const device of onlineDevices) {
        try {
          const dataRecord =
            await this.dataRecordsService.generateMockData(device);
          this.logger.debug(
            `设备 ${device.name} 生成数据: ${dataRecord.value}`,
          );

          await this.alertsService.checkAndCreateAlert(
            device,
            dataRecord.value,
          );
        } catch (error) {
          this.logger.error(
            `设备 ${device.name} 数据生成失败: ${error.message}`,
          );
        }
      }

      this.logger.debug("定时数据生成任务完成");
    } catch (error) {
      this.logger.error(`定时任务执行失败: ${error.message}`);
    }
  }

  @Cron("* * * * *")
  async handleDLQRetry() {
    this.logger.debug("开始执行DLQ重试任务...");

    try {
      const result = await this.dataRecordsService.processDLQ();
      if (result.processed > 0 || result.failed > 0) {
        this.logger.log(
          `DLQ重试任务完成: 成功 ${result.processed} 条，失败 ${result.failed} 条`,
        );
      }
    } catch (error) {
      this.logger.error(`DLQ重试任务执行失败: ${error.message}`);
    }
  }
}

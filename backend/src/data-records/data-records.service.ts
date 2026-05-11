import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateDataRecordDto, QueryDataRecordDto } from "./dto/data-record.dto";
import { DeviceType, DeviceStatus } from "@prisma/client";

@Injectable()
export class DataRecordsService {
  private readonly logger = new Logger(DataRecordsService.name);
  private readonly DLQ_KEY = "dlq:data-records";

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createDataRecordDto: CreateDataRecordDto) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: createDataRecordDto.deviceId },
      });

      if (!device) {
        throw new NotFoundException("设备不存在");
      }

      const dataRecord = await this.prisma.dataRecord.create({
        data: createDataRecordDto,
        include: { device: true },
      });

      await this.cacheLatestData(dataRecord);

      return dataRecord;
    } catch (error) {
      this.logger.error(
        `数据记录创建失败，写入 DLQ: ${(error as Error).message}`,
      );
      await this.sendToDLQ(createDataRecordDto);
      throw error;
    }
  }

  private async sendToDLQ(data: CreateDataRecordDto) {
    try {
      await this.redisService.lpush(
        this.DLQ_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
          retryCount: 0,
        }),
      );
    } catch (dlqError) {
      this.logger.error(`写入 DLQ 失败: ${(dlqError as Error).message}`);
    }
  }

  async processDLQ() {
    const batchSize = 100;
    let processed = 0;

    while (processed < batchSize) {
      const itemStr = await this.redisService.lpop(this.DLQ_KEY);
      if (!itemStr) {
        break;
      }

      try {
        const item = JSON.parse(itemStr);
        await this.createFromDLQ(item.data);
        processed++;
      } catch (error) {
        this.logger.error(`处理 DLQ 数据失败: ${(error as Error).message}`);
      }
    }

    if (processed > 0) {
      this.logger.log(`成功处理 ${processed} 条 DLQ 数据`);
    }
  }

  private async createFromDLQ(createDataRecordDto: CreateDataRecordDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: createDataRecordDto.deviceId },
    });

    if (!device) {
      return;
    }

    const dataRecord = await this.prisma.dataRecord.create({
      data: createDataRecordDto,
      include: { device: true },
    });

    await this.cacheLatestData(dataRecord);
  }

  private async cacheLatestData(dataRecord: any) {
    const cacheKey = `device:latest:${dataRecord.deviceId}`;
    const cacheValue = JSON.stringify({
      deviceId: dataRecord.deviceId,
      deviceName: dataRecord.device.name,
      deviceType: dataRecord.device.type,
      value: dataRecord.value,
      timestamp: dataRecord.timestamp,
      status: dataRecord.device.status,
    });

    await this.redisService.set(cacheKey, cacheValue);
    await this.redisService.hset(
      "devices:latest",
      String(dataRecord.deviceId),
      cacheValue,
    );
  }

  async findByDeviceId(deviceId: number, queryDto: QueryDataRecordDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException("设备不存在");
    }

    const where: any = { deviceId };

    if (queryDto.timeRange) {
      const now = new Date();
      let startTime: Date;

      switch (queryDto.timeRange) {
        case "1h":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "6h":
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case "24h":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      where.timestamp = { gte: startTime };
    } else {
      if (queryDto.startTime) {
        where.timestamp = {
          ...where.timestamp,
          gte: new Date(queryDto.startTime),
        };
      }
      if (queryDto.endTime) {
        where.timestamp = {
          ...where.timestamp,
          lte: new Date(queryDto.endTime),
        };
      }
    }

    const orderBy: any = { timestamp: "asc" };
    const take = queryDto.limit ? Number(queryDto.limit) : undefined;

    return this.prisma.dataRecord.findMany({
      where,
      orderBy,
      take,
    });
  }

  async getLatestData(deviceId?: number) {
    if (deviceId) {
      const cacheKey = `device:latest:${deviceId}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const latest = await this.prisma.dataRecord.findFirst({
        where: { deviceId },
        orderBy: { timestamp: "desc" },
        include: { device: true },
      });

      if (latest) {
        await this.cacheLatestData(latest);
        return {
          deviceId: latest.deviceId,
          deviceName: latest.device.name,
          deviceType: latest.device.type,
          value: latest.value,
          timestamp: latest.timestamp,
          status: latest.device.status,
        };
      }

      return null;
    }

    const cachedAll = await this.redisService.hgetall("devices:latest");
    if (cachedAll && Object.keys(cachedAll).length > 0) {
      return Object.values(cachedAll).map((v) => JSON.parse(v));
    }

    const devices = await this.prisma.device.findMany({
      include: {
        dataRecords: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    const result = devices.map((device) => {
      const latestRecord = device.dataRecords[0];
      return {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        deviceCode: device.code,
        location: device.location,
        x: device.x,
        y: device.y,
        value: latestRecord?.value || 0,
        timestamp: latestRecord?.timestamp || null,
        status: device.status,
      };
    });

    for (const item of result) {
      if (item.timestamp) {
        await this.redisService.hset(
          "devices:latest",
          String(item.deviceId),
          JSON.stringify(item),
        );
      }
    }

    return result;
  }

  async generateMockData(device: any) {
    let value: number;

    switch (device.type) {
      case DeviceType.TEMPERATURE:
        value = 20 + Math.random() * 25;
        break;
      case DeviceType.HUMIDITY:
        value = 30 + Math.random() * 60;
        break;
      case DeviceType.CAMERA:
        value = Math.random() > 0.1 ? 1 : 0;
        break;
      case DeviceType.SMOKE:
        value = Math.random() > 0.95 ? 1 : 0;
        break;
      default:
        value = 0;
    }

    return this.create({
      deviceId: device.id,
      value: parseFloat(value.toFixed(2)),
    });
  }
}

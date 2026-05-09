import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  DeviceType,
  DeviceStatus,
  AlertLevel,
  AlertStatus,
} from "@prisma/client";

@Injectable()
export class StatisticsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async getDeviceTypeDistribution() {
    const result = await this.prisma.device.groupBy({
      by: ["type"],
      _count: { type: true },
    });

    return result.map((item) => ({
      name: this.getDeviceTypeName(item.type),
      type: item.type,
      value: item._count.type,
    }));
  }

  async getAlertLevelDistribution() {
    const result = await this.prisma.alert.groupBy({
      by: ["level"],
      _count: { level: true },
    });

    const allLevels = [
      AlertLevel.EMERGENCY,
      AlertLevel.WARNING,
      AlertLevel.INFO,
    ];

    return allLevels.map((level) => {
      const found = result.find((r) => r.level === level);
      return {
        name: this.getAlertLevelName(level),
        level,
        count: found?._count.level || 0,
      };
    });
  }

  async getDailyAlertTrend(days: number = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const result = [];
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(startDate.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await this.prisma.alert.count({
        where: {
          triggeredAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      result.push({
        date: dayStart.toISOString().split("T")[0],
        count,
      });
    }

    return result;
  }

  async getDeviceOnlineRate() {
    const total = await this.prisma.device.count();
    const online = await this.prisma.device.count({
      where: { status: DeviceStatus.ONLINE },
    });
    const offline = await this.prisma.device.count({
      where: { status: DeviceStatus.OFFLINE },
    });
    const fault = await this.prisma.device.count({
      where: { status: DeviceStatus.FAULT },
    });

    return {
      total,
      online,
      offline,
      fault,
      onlineRate:
        total > 0 ? parseFloat(((online / total) * 100).toFixed(2)) : 0,
    };
  }

  async getOverviewStats() {
    const deviceStats = await this.getDeviceOnlineRate();
    const alertStats = await this.prisma.alert.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const unprocessed =
      alertStats.find((s) => s.status === AlertStatus.UNPROCESSED)?._count
        .status || 0;
    const confirmed =
      alertStats.find((s) => s.status === AlertStatus.CONFIRMED)?._count
        .status || 0;
    const resolved =
      alertStats.find((s) => s.status === AlertStatus.RESOLVED)?._count
        .status || 0;

    return {
      devices: deviceStats,
      alerts: {
        total: unprocessed + confirmed + resolved,
        unprocessed,
        confirmed,
        resolved,
      },
    };
  }

  async getRecentAlerts(limit: number = 10) {
    return this.prisma.alert.findMany({
      orderBy: { triggeredAt: "desc" },
      take: limit,
      include: { device: true },
    });
  }

  private getDeviceTypeName(type: DeviceType): string {
    const names: Record<DeviceType, string> = {
      [DeviceType.TEMPERATURE]: "温度传感器",
      [DeviceType.HUMIDITY]: "湿度传感器",
      [DeviceType.CAMERA]: "摄像头",
      [DeviceType.SMOKE]: "烟雾报警器",
    };
    return names[type] || type;
  }

  private getAlertLevelName(level: AlertLevel): string {
    const names: Record<AlertLevel, string> = {
      [AlertLevel.EMERGENCY]: "紧急",
      [AlertLevel.WARNING]: "警告",
      [AlertLevel.INFO]: "提示",
    };
    return names[level] || level;
  }
}

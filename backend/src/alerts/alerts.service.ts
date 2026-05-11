import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertDto,
} from "./dto/alert.dto";
import {
  DeviceType,
  AlertCondition,
  AlertStatus,
  AlertLevel,
} from "@prisma/client";

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async createRule(createAlertRuleDto: CreateAlertRuleDto) {
    const existing = await this.prisma.alertRule.findUnique({
      where: { deviceType: createAlertRuleDto.deviceType },
    });

    if (existing) {
      throw new ConflictException("该设备类型的告警规则已存在");
    }

    return this.prisma.alertRule.create({
      data: createAlertRuleDto,
    });
  }

  async findAllRules() {
    return this.prisma.alertRule.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findRuleByDeviceType(deviceType: DeviceType) {
    return this.prisma.alertRule.findUnique({
      where: { deviceType },
    });
  }

  async updateRule(
    deviceType: DeviceType,
    updateAlertRuleDto: UpdateAlertRuleDto,
  ) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { deviceType },
    });

    if (!rule) {
      throw new NotFoundException("告警规则不存在");
    }

    return this.prisma.alertRule.update({
      where: { deviceType },
      data: updateAlertRuleDto,
    });
  }

  async deleteRule(deviceType: DeviceType) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { deviceType },
    });

    if (!rule) {
      throw new NotFoundException("告警规则不存在");
    }

    return this.prisma.alertRule.delete({
      where: { deviceType },
    });
  }

  async createAlert(data: {
    deviceId: number;
    level: AlertLevel;
    message: string;
  }) {
    const alert = await this.prisma.alert.create({
      data: {
        deviceId: data.deviceId,
        level: data.level,
        message: data.message,
        status: AlertStatus.UNPROCESSED,
      },
      include: { device: true },
    });

    await this.cacheAlertStats();
    return alert;
  }

  async findAll(queryDto: QueryAlertDto) {
    const where: any = {};

    if (queryDto.level) {
      where.level = queryDto.level;
    }
    if (queryDto.status) {
      where.status = queryDto.status;
    }
    if (queryDto.deviceId) {
      where.deviceId = queryDto.deviceId;
    }

    if (queryDto.timeRange) {
      const now = new Date();
      let startTime: Date;

      switch (queryDto.timeRange) {
        case "7d":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "24h":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      where.triggeredAt = { gte: startTime };
    }

    const take = queryDto.limit ? Number(queryDto.limit) : undefined;

    return this.prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
      include: { device: true },
      take,
    });
  }

  async findOne(id: number) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { device: true },
    });

    if (!alert) {
      throw new NotFoundException("告警记录不存在");
    }

    return alert;
  }

  async confirmAlert(id: number) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException("告警记录不存在");
    }

    if (alert.status !== AlertStatus.UNPROCESSED) {
      throw new ConflictException("该告警已被处理");
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: { device: true },
    });

    await this.cacheAlertStats();
    return updated;
  }

  async resolveAlert(id: number) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException("告警记录不存在");
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictException("该告警已解决");
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        confirmedAt: alert.confirmedAt || new Date(),
      },
      include: { device: true },
    });

    await this.cacheAlertStats();
    return updated;
  }

  async checkAndCreateAlert(device: any, value: number) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { deviceType: device.type },
    });

    if (!rule) {
      return null;
    }

    let shouldAlert = false;

    if (
      rule.condition === AlertCondition.GREATER_THAN &&
      value > rule.threshold
    ) {
      shouldAlert = true;
    } else if (
      rule.condition === AlertCondition.LESS_THAN &&
      value < rule.threshold
    ) {
      shouldAlert = true;
    }

    if (shouldAlert) {
      const recentAlert = await this.prisma.alert.findFirst({
        where: {
          deviceId: device.id,
          status: { in: [AlertStatus.UNPROCESSED, AlertStatus.CONFIRMED] },
          triggeredAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      });

      if (!recentAlert) {
        return this.createAlert({
          deviceId: device.id,
          level: rule.level,
          message: rule.description || `${device.name} 触发告警`,
        });
      }
    }

    return null;
  }

  private async cacheAlertStats() {
    const total = await this.prisma.alert.count();
    const unprocessed = await this.prisma.alert.count({
      where: { status: AlertStatus.UNPROCESSED },
    });
    const confirmed = await this.prisma.alert.count({
      where: { status: AlertStatus.CONFIRMED },
    });
    const resolved = await this.prisma.alert.count({
      where: { status: AlertStatus.RESOLVED },
    });

    const levelStats = await this.prisma.alert.groupBy({
      by: ["level"],
      _count: { level: true },
    });

    const stats = {
      total,
      unprocessed,
      confirmed,
      resolved,
      levels: levelStats.map((l) => ({
        level: l.level,
        count: l._count.level,
      })),
    };

    await this.redisService.set("alerts:stats", JSON.stringify(stats));
  }

  async getAlertStats() {
    const cached = await this.redisService.get("alerts:stats");
    if (cached) {
      return JSON.parse(cached);
    }

    const total = await this.prisma.alert.count();
    const unprocessed = await this.prisma.alert.count({
      where: { status: AlertStatus.UNPROCESSED },
    });
    const confirmed = await this.prisma.alert.count({
      where: { status: AlertStatus.CONFIRMED },
    });
    const resolved = await this.prisma.alert.count({
      where: { status: AlertStatus.RESOLVED },
    });

    const levelStats = await this.prisma.alert.groupBy({
      by: ["level"],
      _count: { level: true },
    });

    const stats = {
      total,
      unprocessed,
      confirmed,
      resolved,
      levels: levelStats.map((l) => ({
        level: l.level,
        count: l._count.level,
      })),
    };

    await this.redisService.set("alerts:stats", JSON.stringify(stats));
    return stats;
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
}

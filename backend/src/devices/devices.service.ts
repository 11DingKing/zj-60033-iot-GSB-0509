import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateDeviceDto, UpdateDeviceDto } from "./dto/device.dto";
import { DeviceType, DeviceStatus } from "@prisma/client";

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private readonly HEARTBEAT_PREFIX = "device:heartbeat:";
  private readonly HEARTBEAT_TTL = 60;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto) {
    const existing = await this.prisma.device.findUnique({
      where: { code: createDeviceDto.code },
    });

    if (existing) {
      throw new ConflictException("设备编号已存在");
    }

    return this.prisma.device.create({
      data: createDeviceDto,
    });
  }

  async findAll() {
    return this.prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findByType(type: DeviceType) {
    return this.prisma.device.findMany({
      where: { type },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException("设备不存在");
    }

    return device;
  }

  async findByCode(code: string) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException("设备不存在");
    }

    return device;
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException("设备不存在");
    }

    return this.prisma.device.update({
      where: { id },
      data: updateDeviceDto,
    });
  }

  async remove(id: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException("设备不存在");
    }

    return this.prisma.device.delete({
      where: { id },
    });
  }

  async isDeviceOnline(deviceId: number): Promise<boolean> {
    const heartbeatKey = `${this.HEARTBEAT_PREFIX}${deviceId}`;
    const exists = await this.redisService.exists(heartbeatKey);
    return exists === 1;
  }

  async updateHeartbeat(deviceId: number): Promise<void> {
    const heartbeatKey = `${this.HEARTBEAT_PREFIX}${deviceId}`;
    await this.redisService.set(
      heartbeatKey,
      String(Date.now()),
      this.HEARTBEAT_TTL,
    );
  }

  async getOnlineDevices() {
    const allDevices = await this.prisma.device.findMany();
    const onlineDevices = [];

    for (const device of allDevices) {
      const isOnline = await this.isDeviceOnline(device.id);
      if (isOnline) {
        onlineDevices.push(device);
      }
    }

    return onlineDevices;
  }

  async getDeviceStats() {
    const allDevices = await this.prisma.device.findMany();

    let online = 0;
    let offline = 0;
    let fault = 0;

    for (const device of allDevices) {
      const isOnline = await this.isDeviceOnline(device.id);
      if (isOnline) {
        online++;
      } else if (device.status === DeviceStatus.FAULT) {
        fault++;
      } else {
        offline++;
      }
    }

    const total = allDevices.length;

    const typeStats = await this.prisma.device.groupBy({
      by: ["type"],
      _count: {
        type: true,
      },
    });

    return {
      total,
      online,
      offline,
      fault,
      onlineRate: total > 0 ? (online / total) * 100 : 0,
      types: typeStats.map((t) => ({
        type: t.type,
        count: t._count.type,
      })),
    };
  }
}

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

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private getHeartbeatKey(deviceId: number): string {
    return `device:heartbeat:${deviceId}`;
  }

  async isDeviceOnline(deviceId: number): Promise<boolean> {
    const heartbeatKey = this.getHeartbeatKey(deviceId);
    const exists = await this.redisService.exists(heartbeatKey);
    return exists > 0;
  }

  async updateDeviceHeartbeat(deviceId: number): Promise<void> {
    const heartbeatKey = this.getHeartbeatKey(deviceId);
    await this.redisService.set(heartbeatKey, "1", 60);
  }

  async enrichDeviceWithOnlineStatus(device: any): Promise<any> {
    const isOnline = await this.isDeviceOnline(device.id);
    return {
      ...device,
      isOnline,
      effectiveStatus: isOnline ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
    };
  }

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
    const devices = await this.prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      devices.map((device) => this.enrichDeviceWithOnlineStatus(device)),
    );
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

  async getOnlineDevices() {
    const devices = await this.prisma.device.findMany();
    const onlineDevices = [];

    for (const device of devices) {
      const isOnline = await this.isDeviceOnline(device.id);
      if (isOnline) {
        onlineDevices.push(await this.enrichDeviceWithOnlineStatus(device));
      }
    }

    return onlineDevices;
  }

  async getDeviceStats() {
    const total = await this.prisma.device.count();
    const devices = await this.prisma.device.findMany();

    let online = 0;
    let offline = 0;
    let fault = 0;

    for (const device of devices) {
      const isOnline = await this.isDeviceOnline(device.id);
      if (isOnline) {
        online++;
      } else if (device.status === DeviceStatus.FAULT) {
        fault++;
      } else {
        offline++;
      }
    }

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

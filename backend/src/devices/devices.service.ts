import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateDeviceDto, UpdateDeviceDto } from "./dto/device.dto";
import { DeviceType, DeviceStatus } from "@prisma/client";

@Injectable()
export class DevicesService {
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
    const heartbeatKey = `device:heartbeat:${deviceId}`;
    const heartbeatExists = await this.redisService.exists(heartbeatKey);
    return heartbeatExists > 0;
  }

  async getOnlineDevices() {
    const devices = await this.prisma.device.findMany();
    const onlineDevices = [];

    for (const device of devices) {
      const isOnline = await this.isDeviceOnline(device.id);
      if (isOnline) {
        onlineDevices.push(device);
      }
    }

    return onlineDevices;
  }

  async getDeviceStats() {
    const devices = await this.prisma.device.findMany();
    let online = 0;
    let offline = 0;
    let fault = 0;

    for (const device of devices) {
      if (device.status === DeviceStatus.FAULT) {
        fault++;
      } else {
        const isOnline = await this.isDeviceOnline(device.id);
        if (isOnline) {
          online++;
        } else {
          offline++;
        }
      }
    }

    const typeStats = await this.prisma.device.groupBy({
      by: ["type"],
      _count: {
        type: true,
      },
    });

    return {
      total: devices.length,
      online,
      offline,
      fault,
      onlineRate: devices.length > 0 ? (online / devices.length) * 100 : 0,
      types: typeStats.map((t) => ({
        type: t.type,
        count: t._count.type,
      })),
    };
  }
}

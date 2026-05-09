import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDeviceDto, UpdateDeviceDto } from "./dto/device.dto";
import { DeviceType, DeviceStatus } from "@prisma/client";

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

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

  async getOnlineDevices() {
    return this.prisma.device.findMany({
      where: { status: DeviceStatus.ONLINE },
    });
  }

  async getDeviceStats() {
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

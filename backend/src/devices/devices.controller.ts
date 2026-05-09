import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto, UpdateDeviceDto } from "./dto/device.dto";
import { DeviceType } from "@prisma/client";

@UseGuards(AuthGuard("jwt"))
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Get("stats")
  getDeviceStats() {
    return this.devicesService.getDeviceStats();
  }

  @Get("online")
  getOnlineDevices() {
    return this.devicesService.getOnlineDevices();
  }

  @Get("type/:type")
  findByType(@Param("type") type: DeviceType) {
    return this.devicesService.findByType(type);
  }

  @Get("code/:code")
  findByCode(@Param("code") code: string) {
    return this.devicesService.findByCode(code);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.devicesService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(+id, updateDeviceDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.devicesService.remove(+id);
  }
}

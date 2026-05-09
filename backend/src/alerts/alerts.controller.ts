import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AlertsService } from "./alerts.service";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertDto,
} from "./dto/alert.dto";
import { DeviceType } from "@prisma/client";

@UseGuards(AuthGuard("jwt"))
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post("rules")
  createRule(@Body() createAlertRuleDto: CreateAlertRuleDto) {
    return this.alertsService.createRule(createAlertRuleDto);
  }

  @Get("rules")
  findAllRules() {
    return this.alertsService.findAllRules();
  }

  @Get("rules/:deviceType")
  findRuleByDeviceType(@Param("deviceType") deviceType: DeviceType) {
    return this.alertsService.findRuleByDeviceType(deviceType);
  }

  @Patch("rules/:deviceType")
  updateRule(
    @Param("deviceType") deviceType: DeviceType,
    @Body() updateAlertRuleDto: UpdateAlertRuleDto,
  ) {
    return this.alertsService.updateRule(deviceType, updateAlertRuleDto);
  }

  @Delete("rules/:deviceType")
  deleteRule(@Param("deviceType") deviceType: DeviceType) {
    return this.alertsService.deleteRule(deviceType);
  }

  @Get("stats")
  getAlertStats() {
    return this.alertsService.getAlertStats();
  }

  @Get("trend")
  getDailyAlertTrend(@Query("days") days?: string) {
    return this.alertsService.getDailyAlertTrend(days ? parseInt(days) : 7);
  }

  @Get()
  findAll(@Query() queryDto: QueryAlertDto) {
    return this.alertsService.findAll(queryDto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.alertsService.findOne(+id);
  }

  @Patch(":id/confirm")
  confirmAlert(@Param("id") id: string) {
    return this.alertsService.confirmAlert(+id);
  }

  @Patch(":id/resolve")
  resolveAlert(@Param("id") id: string) {
    return this.alertsService.resolveAlert(+id);
  }
}

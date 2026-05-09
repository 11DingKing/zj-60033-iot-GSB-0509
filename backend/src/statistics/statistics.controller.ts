import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { StatisticsService } from "./statistics.service";

@UseGuards(AuthGuard("jwt"))
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("overview")
  getOverviewStats() {
    return this.statisticsService.getOverviewStats();
  }

  @Get("device-types")
  getDeviceTypeDistribution() {
    return this.statisticsService.getDeviceTypeDistribution();
  }

  @Get("alert-levels")
  getAlertLevelDistribution() {
    return this.statisticsService.getAlertLevelDistribution();
  }

  @Get("alert-trend")
  getDailyAlertTrend(@Query("days") days?: string) {
    return this.statisticsService.getDailyAlertTrend(days ? parseInt(days) : 7);
  }

  @Get("device-online-rate")
  getDeviceOnlineRate() {
    return this.statisticsService.getDeviceOnlineRate();
  }

  @Get("recent-alerts")
  getRecentAlerts(@Query("limit") limit?: string) {
    return this.statisticsService.getRecentAlerts(limit ? parseInt(limit) : 10);
  }
}

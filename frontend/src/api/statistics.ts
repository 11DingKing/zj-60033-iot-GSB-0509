import request from "./request";
import type { DeviceStats, AlertStats, DailyAlertTrend, Alert } from "@/types";

export const statisticsApi = {
  getOverview() {
    return request.get<
      any,
      {
        devices: DeviceStats;
        alerts: {
          total: number;
          unprocessed: number;
          confirmed: number;
          resolved: number;
        };
      }
    >("/statistics/overview");
  },

  getDeviceTypeDistribution() {
    return request.get<any, { name: string; type: string; value: number }[]>(
      "/statistics/device-types",
    );
  },

  getAlertLevelDistribution() {
    return request.get<any, { name: string; level: string; count: number }[]>(
      "/statistics/alert-levels",
    );
  },

  getDailyAlertTrend(days: number = 7) {
    return request.get<any, DailyAlertTrend[]>("/statistics/alert-trend", {
      params: { days },
    });
  },

  getDeviceOnlineRate() {
    return request.get<any, DeviceStats>("/statistics/device-online-rate");
  },

  getRecentAlerts(limit: number = 10) {
    return request.get<any, Alert[]>("/statistics/recent-alerts", {
      params: { limit },
    });
  },
};

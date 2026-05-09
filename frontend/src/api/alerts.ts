import request from "./request";
import type { Alert, AlertRule, AlertStats, DailyAlertTrend } from "@/types";
import { DeviceType, AlertLevel, AlertStatus, AlertCondition } from "@/types";

export const alertsApi = {
  getAll(options?: {
    level?: AlertLevel;
    status?: AlertStatus;
    deviceId?: number;
    limit?: number;
    timeRange?: string;
  }) {
    return request.get<any, Alert[]>("/alerts", { params: options });
  },

  getById(id: number) {
    return request.get<any, Alert>(`/alerts/${id}`);
  },

  confirm(id: number) {
    return request.patch<any, Alert>(`/alerts/${id}/confirm`);
  },

  resolve(id: number) {
    return request.patch<any, Alert>(`/alerts/${id}/resolve`);
  },

  getStats() {
    return request.get<any, AlertStats>("/alerts/stats");
  },

  getTrend(days: number = 7) {
    return request.get<any, DailyAlertTrend[]>("/alerts/trend", {
      params: { days },
    });
  },
};

export const alertRulesApi = {
  getAll() {
    return request.get<any, AlertRule[]>("/alerts/rules");
  },

  getByDeviceType(deviceType: DeviceType) {
    return request.get<any, AlertRule>(`/alerts/rules/${deviceType}`);
  },

  create(data: {
    deviceType: DeviceType;
    threshold: number;
    condition: AlertCondition;
    level: AlertLevel;
    description?: string;
  }) {
    return request.post<any, AlertRule>("/alerts/rules", data);
  },

  update(
    deviceType: DeviceType,
    data: {
      threshold?: number;
      condition?: AlertCondition;
      level?: AlertLevel;
      description?: string;
    },
  ) {
    return request.patch<any, AlertRule>(`/alerts/rules/${deviceType}`, data);
  },

  delete(deviceType: DeviceType) {
    return request.delete<any>(`/alerts/rules/${deviceType}`);
  },
};

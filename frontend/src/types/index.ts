export interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export enum DeviceType {
  TEMPERATURE = "TEMPERATURE",
  HUMIDITY = "HUMIDITY",
  CAMERA = "CAMERA",
  SMOKE = "SMOKE",
}

export enum DeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  FAULT = "FAULT",
}

export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  location: string;
  code: string;
  status: DeviceStatus;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceLatestData {
  deviceId: number;
  deviceName: string;
  deviceType: DeviceType;
  deviceCode: string;
  location: string;
  x: number;
  y: number;
  value: number;
  timestamp: string | null;
  status: DeviceStatus;
}

export interface DataRecord {
  id: number;
  deviceId: number;
  value: number;
  timestamp: string;
}

export enum AlertLevel {
  EMERGENCY = "EMERGENCY",
  WARNING = "WARNING",
  INFO = "INFO",
}

export enum AlertCondition {
  GREATER_THAN = "GREATER_THAN",
  LESS_THAN = "LESS_THAN",
}

export enum AlertStatus {
  UNPROCESSED = "UNPROCESSED",
  CONFIRMED = "CONFIRMED",
  RESOLVED = "RESOLVED",
}

export interface AlertRule {
  id: number;
  deviceType: DeviceType;
  threshold: number;
  condition: AlertCondition;
  level: AlertLevel;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: number;
  deviceId: number;
  level: AlertLevel;
  message: string;
  status: AlertStatus;
  triggeredAt: string;
  confirmedAt: string | null;
  resolvedAt: string | null;
  device: Device;
}

export interface AlertStats {
  total: number;
  unprocessed: number;
  confirmed: number;
  resolved: number;
  levels: { level: AlertLevel; count: number }[];
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  fault: number;
  onlineRate: number;
  types: { type: DeviceType; count: number }[];
}

export interface DailyAlertTrend {
  date: string;
  count: number;
}

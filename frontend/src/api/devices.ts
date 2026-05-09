import request from "./request";
import type {
  Device,
  DeviceStats,
  DeviceLatestData,
  DataRecord,
} from "@/types";
import { DeviceType, DeviceStatus } from "@/types";

export const devicesApi = {
  getAll() {
    return request.get<any, Device[]>("/devices");
  },

  getById(id: number) {
    return request.get<any, Device>(`/devices/${id}`);
  },

  getByCode(code: string) {
    return request.get<any, Device>(`/devices/code/${code}`);
  },

  getByType(type: DeviceType) {
    return request.get<any, Device[]>(`/devices/type/${type}`);
  },

  getStats() {
    return request.get<any, DeviceStats>("/devices/stats");
  },

  create(data: Partial<Device>) {
    return request.post<any, Device>("/devices", data);
  },

  update(id: number, data: Partial<Device>) {
    return request.patch<any, Device>(`/devices/${id}`, data);
  },

  delete(id: number) {
    return request.delete<any>(`/devices/${id}`);
  },
};

export const dataRecordsApi = {
  getLatest(deviceId?: number) {
    const params = deviceId ? { deviceId } : {};
    return request.get<any, DeviceLatestData[]>("/data-records/latest", {
      params,
    });
  },

  getByDeviceId(
    deviceId: number,
    options?: {
      timeRange?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
    },
  ) {
    return request.get<any, DataRecord[]>(`/data-records/device/${deviceId}`, {
      params: options,
    });
  },
};

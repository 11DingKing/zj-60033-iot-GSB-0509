import { defineStore } from "pinia";
import { ref } from "vue";
import type { DeviceLatestData, Alert, DeviceStats, AlertStats } from "@/types";
import { dataRecordsApi } from "@/api/devices";
import { statisticsApi } from "@/api/statistics";

export const useDashboardStore = defineStore("dashboard", () => {
  const latestData = ref<DeviceLatestData[]>([]);
  const recentAlerts = ref<Alert[]>([]);
  const deviceStats = ref<DeviceStats | null>(null);
  const alertStats = ref<AlertStats | null>(null);
  const loading = ref(false);

  async function fetchLatestData() {
    try {
      const data = await dataRecordsApi.getLatest();
      latestData.value = data;
    } catch (error) {
      console.error("获取最新数据失败:", error);
    }
  }

  async function fetchRecentAlerts() {
    try {
      const data = await statisticsApi.getRecentAlerts(10);
      recentAlerts.value = data;
    } catch (error) {
      console.error("获取最近告警失败:", error);
    }
  }

  async function fetchDeviceStats() {
    try {
      const data = await statisticsApi.getDeviceOnlineRate();
      deviceStats.value = data;
    } catch (error) {
      console.error("获取设备统计失败:", error);
    }
  }

  async function fetchAlertStats() {
    try {
      const data = await statisticsApi.getOverview();
      alertStats.value = {
        total: data.alerts.total,
        unprocessed: data.alerts.unprocessed,
        confirmed: data.alerts.confirmed,
        resolved: data.alerts.resolved,
        levels: [],
      };
    } catch (error) {
      console.error("获取告警统计失败:", error);
    }
  }

  async function fetchAllDashboardData() {
    loading.value = true;
    try {
      await Promise.all([
        fetchLatestData(),
        fetchRecentAlerts(),
        fetchDeviceStats(),
        fetchAlertStats(),
      ]);
    } finally {
      loading.value = false;
    }
  }

  return {
    latestData,
    recentAlerts,
    deviceStats,
    alertStats,
    loading,
    fetchLatestData,
    fetchRecentAlerts,
    fetchDeviceStats,
    fetchAlertStats,
    fetchAllDashboardData,
  };
});

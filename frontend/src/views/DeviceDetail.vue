<template>
  <div class="device-detail-container" v-loading="loading">
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span>设备详情</span>
        </div>
      </template>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="设备名称">{{
          device?.name
        }}</el-descriptions-item>
        <el-descriptions-item label="设备编号">{{
          device?.code
        }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">
          <el-tag :type="getTypeTagType(device?.type)">
            {{ getTypeText(device?.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="设备状态">
          <el-tag :type="getStatusTagType(device?.status)">
            {{ getStatusText(device?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="安装位置">{{
          device?.location
        }}</el-descriptions-item>
        <el-descriptions-item label="坐标位置"
          >({{ device?.x }}, {{ device?.y }})</el-descriptions-item
        >
        <el-descriptions-item label="创建时间">{{
          formatTime(device?.createdAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{
          formatTime(device?.updatedAt)
        }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>数据趋势图</span>
              <el-radio-group
                v-model="timeRange"
                size="small"
                @change="fetchDataRecords"
              >
                <el-radio-button label="1h">1小时</el-radio-button>
                <el-radio-button label="6h">6小时</el-radio-button>
                <el-radio-button label="24h">24小时</el-radio-button>
                <el-radio-button label="7d">7天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="lineChartRef" class="line-chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="alerts-card">
          <template #header>
            <span>历史告警</span>
          </template>
          <el-table :data="deviceAlerts" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="level" label="告警级别" width="100">
              <template #default="{ row }">
                <el-tag :type="getAlertLevelTagType(row.level)" size="small">
                  {{ getAlertLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="告警信息" min-width="250" />
            <el-table-column prop="status" label="处理状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getAlertStatusTagType(row.status)" size="small">
                  {{ getAlertStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="triggeredAt" label="触发时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.triggeredAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'UNPROCESSED'"
                  type="primary"
                  link
                  size="small"
                  @click="confirmAlert(row.id)"
                >
                  确认
                </el-button>
                <el-button
                  v-if="row.status !== 'RESOLVED'"
                  type="success"
                  link
                  size="small"
                  @click="resolveAlert(row.id)"
                >
                  解决
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as echarts from "echarts";
import { ElMessage } from "element-plus";
import { devicesApi, dataRecordsApi } from "@/api/devices";
import { alertsApi } from "@/api/alerts";
import type {
  Device,
  DataRecord,
  Alert,
  DeviceType,
  DeviceStatus,
  AlertLevel,
  AlertStatus,
} from "@/types";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const device = ref<Device | null>(null);
const dataRecords = ref<DataRecord[]>([]);
const deviceAlerts = ref<Alert[]>([]);
const timeRange = ref("24h");
const lineChartRef = ref<HTMLElement>();
let lineChart: echarts.ECharts | null = null;

const deviceId = computed(() => parseInt(route.params.id as string));

const getTypeText = (type?: DeviceType) => {
  if (!type) return "";
  const texts: Record<DeviceType, string> = {
    TEMPERATURE: "温度传感器",
    HUMIDITY: "湿度传感器",
    CAMERA: "摄像头",
    SMOKE: "烟雾报警器",
  };
  return texts[type] || type;
};

const getTypeTagType = (type?: DeviceType) => {
  if (!type) return "info";
  const types: Record<DeviceType, string> = {
    TEMPERATURE: "primary",
    HUMIDITY: "success",
    CAMERA: "warning",
    SMOKE: "danger",
  };
  return types[type] || "info";
};

const getStatusText = (status?: DeviceStatus) => {
  if (!status) return "";
  const texts: Record<DeviceStatus, string> = {
    ONLINE: "在线",
    OFFLINE: "离线",
    FAULT: "故障",
  };
  return texts[status] || status;
};

const getStatusTagType = (status?: DeviceStatus) => {
  if (!status) return "info";
  const types: Record<DeviceStatus, string> = {
    ONLINE: "success",
    OFFLINE: "info",
    FAULT: "danger",
  };
  return types[status] || "info";
};

const getAlertLevelText = (level: AlertLevel) => {
  const texts: Record<AlertLevel, string> = {
    EMERGENCY: "紧急",
    WARNING: "警告",
    INFO: "提示",
  };
  return texts[level] || level;
};

const getAlertLevelTagType = (level: AlertLevel) => {
  const types: Record<AlertLevel, string> = {
    EMERGENCY: "danger",
    WARNING: "warning",
    INFO: "info",
  };
  return types[level] || "info";
};

const getAlertStatusText = (status: AlertStatus) => {
  const texts: Record<AlertStatus, string> = {
    UNPROCESSED: "未处理",
    CONFIRMED: "已确认",
    RESOLVED: "已解决",
  };
  return texts[status] || status;
};

const getAlertStatusTagType = (status: AlertStatus) => {
  const types: Record<AlertStatus, string> = {
    UNPROCESSED: "danger",
    CONFIRMED: "warning",
    RESOLVED: "success",
  };
  return types[status] || "info";
};

const formatTime = (time?: string) => {
  if (!time) return "";
  return new Date(time).toLocaleString("zh-CN");
};

const goBack = () => {
  router.back();
};

const fetchDevice = async () => {
  loading.value = true;
  try {
    device.value = await devicesApi.getById(deviceId.value);
  } catch (error) {
    console.error("获取设备信息失败:", error);
  } finally {
    loading.value = false;
  }
};

const fetchDataRecords = async () => {
  try {
    dataRecords.value = await dataRecordsApi.getByDeviceId(deviceId.value, {
      timeRange: timeRange.value,
    });
    await nextTick();
    initLineChart();
  } catch (error) {
    console.error("获取数据记录失败:", error);
  }
};

const fetchDeviceAlerts = async () => {
  try {
    deviceAlerts.value = await alertsApi.getAll({
      deviceId: deviceId.value,
    });
  } catch (error) {
    console.error("获取设备告警失败:", error);
  }
};

const confirmAlert = async (alertId: number) => {
  try {
    await alertsApi.confirm(alertId);
    ElMessage.success("确认成功");
    fetchDeviceAlerts();
  } catch (error) {
    console.error("确认告警失败:", error);
  }
};

const resolveAlert = async (alertId: number) => {
  try {
    await alertsApi.resolve(alertId);
    ElMessage.success("解决成功");
    fetchDeviceAlerts();
  } catch (error) {
    console.error("解决告警失败:", error);
  }
};

const initLineChart = () => {
  if (!lineChartRef.value) return;

  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value);
  }

  const xAxisData = dataRecords.value.map((r) => {
    const date = new Date(r.timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  });

  const yAxisData = dataRecords.value.map((r) => r.value);

  const unit = getUnit(device.value?.type);
  const typeText = getTypeText(device.value?.type);

  const option: echarts.EChartsOption = {
    title: {
      text: `${typeText} 数据趋势`,
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const data = params[0];
        return `${data.axisValue}<br/>${typeText}: ${data.value.toFixed(2)} ${unit}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: xAxisData,
      axisLabel: {
        rotate: 45,
        interval: Math.floor(xAxisData.length / 10),
      },
    },
    yAxis: {
      type: "value",
      name: unit,
    },
    series: [
      {
        name: typeText,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        sampling: "lttb",
        itemStyle: {
          color: "#409eff",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(64, 158, 255, 0.3)" },
            { offset: 1, color: "rgba(64, 158, 255, 0.05)" },
          ]),
        },
        data: yAxisData,
      },
    ],
  };

  lineChart.setOption(option, true);

  window.addEventListener("resize", () => {
    lineChart?.resize();
  });
};

const getUnit = (type?: DeviceType) => {
  if (!type) return "";
  const units: Record<DeviceType, string> = {
    TEMPERATURE: "℃",
    HUMIDITY: "%",
    CAMERA: "状态",
    SMOKE: "状态",
  };
  return units[type] || "";
};

onMounted(async () => {
  await fetchDevice();
  await fetchDataRecords();
  await fetchDeviceAlerts();
});

onUnmounted(() => {
  if (lineChart) {
    lineChart.dispose();
  }
});
</script>

<style scoped lang="scss">
.device-detail-container {
  .info-card {
    .card-header {
      display: flex;
      align-items: center;
      gap: 15px;

      span {
        font-size: 16px;
        font-weight: 500;
      }
    }
  }

  .chart-card {
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .line-chart {
      height: 350px;
      width: 100%;
    }
  }

  .alerts-card {
    :deep(.el-card__body) {
      padding: 0;
    }
  }
}
</style>

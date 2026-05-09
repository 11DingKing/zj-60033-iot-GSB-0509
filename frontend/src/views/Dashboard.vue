<template>
  <div class="dashboard-container">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div
              class="stat-icon"
              style="background: linear-gradient(135deg, #409eff, #66b1ff)"
            >
              <el-icon :size="30"><Cpu /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ deviceStats?.total || 0 }}</div>
              <div class="stat-label">设备总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div
              class="stat-icon"
              style="background: linear-gradient(135deg, #67c23a, #85ce61)"
            >
              <el-icon :size="30"><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value status-online">
                {{ deviceStats?.online || 0 }}
              </div>
              <div class="stat-label">在线设备</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div
              class="stat-icon"
              style="background: linear-gradient(135deg, #e6a23c, #ebb563)"
            >
              <el-icon :size="30"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value alert-warning">
                {{ alertStats?.unprocessed || 0 }}
              </div>
              <div class="stat-label">未处理告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div
              class="stat-icon"
              style="background: linear-gradient(135deg, #f56c6c, #f78989)"
            >
              <el-icon :size="30"><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value alert-emergency">
                {{ alertStats?.total || 0 }}
              </div>
              <div class="stat-label">告警总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>实时设备数据</span>
              <el-tag size="small" type="info">每10秒自动刷新</el-tag>
            </div>
          </template>
          <el-row :gutter="15">
            <el-col
              :span="8"
              v-for="device in latestData"
              :key="device.deviceId"
            >
              <div
                class="device-card"
                @click="goToDeviceDetail(device.deviceId)"
              >
                <div class="device-header">
                  <span class="device-name">{{ device.deviceName }}</span>
                  <el-tag :type="getStatusType(device.status)" size="small">
                    {{ getStatusText(device.status) }}
                  </el-tag>
                </div>
                <div class="device-content">
                  <div class="device-value">
                    <span class="value">{{
                      formatValue(device.value, device.deviceType)
                    }}</span>
                    <span class="unit">{{ getUnit(device.deviceType) }}</span>
                  </div>
                  <div class="device-info">
                    <span class="location">{{ device.location }}</span>
                    <span class="code">{{ device.deviceCode }}</span>
                  </div>
                </div>
                <div class="status-indicator">
                  <div
                    class="indicator-dot"
                    :class="`status-${device.status.toLowerCase()}`"
                  ></div>
                  <span class="indicator-text">{{
                    getTypeText(device.deviceType)
                  }}</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="section-card">
          <template #header>
            <span>最近告警</span>
          </template>
          <div class="alert-list">
            <div
              class="alert-item"
              v-for="alert in recentAlerts"
              :key="alert.id"
              :class="`alert-${alert.level.toLowerCase()}`"
            >
              <div class="alert-icon">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-meta">
                  <el-tag :type="getAlertStatusType(alert.status)" size="small">
                    {{ getAlertStatusText(alert.status) }}
                  </el-tag>
                  <span class="alert-time">{{
                    formatTime(alert.triggeredAt)
                  }}</span>
                </div>
              </div>
            </div>
            <el-empty v-if="recentAlerts.length === 0" description="暂无告警" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="section-card">
          <template #header>
            <span>设备分布地图</span>
          </template>
          <div ref="mapChartRef" class="map-chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import * as echarts from "echarts";
import { useDashboardStore } from "@/stores/dashboard";
import { DeviceStatus, DeviceType, AlertStatus, AlertLevel } from "@/types";

const router = useRouter();
const dashboardStore = useDashboardStore();

const mapChartRef = ref<HTMLElement>();
let mapChart: echarts.ECharts | null = null;
let refreshInterval: number | null = null;

const latestData = ref(dashboardStore.latestData);
const recentAlerts = ref(dashboardStore.recentAlerts);
const deviceStats = ref(dashboardStore.deviceStats);
const alertStats = ref(dashboardStore.alertStats);

const getStatusType = (status: DeviceStatus) => {
  const types: Record<DeviceStatus, string> = {
    [DeviceStatus.ONLINE]: "success",
    [DeviceStatus.OFFLINE]: "info",
    [DeviceStatus.FAULT]: "danger",
  };
  return types[status];
};

const getStatusText = (status: DeviceStatus) => {
  const texts: Record<DeviceStatus, string> = {
    [DeviceStatus.ONLINE]: "在线",
    [DeviceStatus.OFFLINE]: "离线",
    [DeviceStatus.FAULT]: "故障",
  };
  return texts[status];
};

const getTypeText = (type: DeviceType) => {
  const texts: Record<DeviceType, string> = {
    [DeviceType.TEMPERATURE]: "温度传感器",
    [DeviceType.HUMIDITY]: "湿度传感器",
    [DeviceType.CAMERA]: "摄像头",
    [DeviceType.SMOKE]: "烟雾报警器",
  };
  return texts[type];
};

const getUnit = (type: DeviceType) => {
  const units: Record<DeviceType, string> = {
    [DeviceType.TEMPERATURE]: "℃",
    [DeviceType.HUMIDITY]: "%",
    [DeviceType.CAMERA]: "",
    [DeviceType.SMOKE]: "",
  };
  return units[type];
};

const formatValue = (value: number, type: DeviceType) => {
  if (type === DeviceType.CAMERA) {
    return value > 0.5 ? "正常" : "离线";
  }
  if (type === DeviceType.SMOKE) {
    return value > 0.5 ? "检测到" : "正常";
  }
  return value.toFixed(1);
};

const getAlertStatusType = (status: AlertStatus) => {
  const types: Record<AlertStatus, string> = {
    [AlertStatus.UNPROCESSED]: "danger",
    [AlertStatus.CONFIRMED]: "warning",
    [AlertStatus.RESOLVED]: "success",
  };
  return types[status];
};

const getAlertStatusText = (status: AlertStatus) => {
  const texts: Record<AlertStatus, string> = {
    [AlertStatus.UNPROCESSED]: "未处理",
    [AlertStatus.CONFIRMED]: "已确认",
    [AlertStatus.RESOLVED]: "已解决",
  };
  return texts[status];
};

const formatTime = (time: string) => {
  const date = new Date(time);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

const goToDeviceDetail = (deviceId: number) => {
  router.push(`/devices/${deviceId}`);
};

const initMapChart = () => {
  if (!mapChartRef.value) return;

  mapChart = echarts.init(mapChartRef.value);

  const updateChart = () => {
    const data = latestData.value.map((device) => ({
      name: device.deviceName,
      value: [device.x, device.y, device.value],
      status: device.status,
      type: device.deviceType,
    }));

    const option: echarts.EChartsOption = {
      title: {
        text: "设备位置分布图",
        left: "center",
        textStyle: {
          fontSize: 16,
          fontWeight: "normal",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const device = latestData.value.find(
            (d) => d.deviceName === params.name,
          );
          return `
            <div style="font-weight: bold;">${params.name}</div>
            <div>类型: ${getTypeText(device?.deviceType || DeviceType.TEMPERATURE)}</div>
            <div>状态: ${getStatusText(device?.status || DeviceStatus.OFFLINE)}</div>
            <div>当前值: ${formatValue(params.value[2], device?.deviceType || DeviceType.TEMPERATURE)}${getUnit(device?.deviceType || DeviceType.TEMPERATURE)}</div>
          `;
        },
      },
      grid: {
        left: "5%",
        right: "5%",
        top: "15%",
        bottom: "10%",
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 600,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 400,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 20,
          data: data,
          itemStyle: {
            color: (params: any) => {
              const status = params.data.status;
              const colors: Record<DeviceStatus, string> = {
                [DeviceStatus.ONLINE]: "#67c23a",
                [DeviceStatus.OFFLINE]: "#909399",
                [DeviceStatus.FAULT]: "#f56c6c",
              };
              return colors[status];
            },
          },
          label: {
            show: true,
            formatter: "{b}",
            position: "right",
            fontSize: 12,
            color: "#606266",
          },
          emphasis: {
            scale: true,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
          },
        },
      ],
      graphic: [
        {
          type: "text",
          left: "5%",
          bottom: "5%",
          style: {
            text: "平面图示意",
            fill: "#909399",
            fontSize: 12,
          },
        },
      ],
    };

    mapChart?.setOption(option);
  };

  updateChart();

  window.addEventListener("resize", () => {
    mapChart?.resize();
  });
};

const refreshData = async () => {
  await dashboardStore.fetchAllDashboardData();
  latestData.value = dashboardStore.latestData;
  recentAlerts.value = dashboardStore.recentAlerts;
  deviceStats.value = dashboardStore.deviceStats;
  alertStats.value = dashboardStore.alertStats;

  if (mapChart) {
    mapChart.resize();
  }
};

onMounted(async () => {
  await refreshData();
  await nextTick();
  initMapChart();

  refreshInterval = window.setInterval(refreshData, 10000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (mapChart) {
    mapChart.dispose();
  }
});
</script>

<style scoped lang="scss">
.dashboard-container {
  .stats-row {
    margin-bottom: 20px;
  }

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .stat-info {
        margin-left: 20px;

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
    }
  }

  .section-card {
    :deep(.el-card__header) {
      padding: 15px 20px;
      border-bottom: 1px solid #ebeef5;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    :deep(.el-card__body) {
      padding: 20px;
    }
  }

  .device-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .device-name {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }
    }

    .device-content {
      margin-bottom: 10px;

      .device-value {
        display: flex;
        align-items: baseline;
        margin-bottom: 5px;

        .value {
          font-size: 24px;
          font-weight: bold;
          color: #409eff;
        }

        .unit {
          font-size: 14px;
          color: #909399;
          margin-left: 5px;
        }
      }

      .device-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #909399;

        .code {
          font-family: monospace;
        }
      }
    }

    .status-indicator {
      display: flex;
      align-items: center;
      padding-top: 10px;
      border-top: 1px dashed #ebeef5;

      .indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;

        &.status-online {
          background-color: #67c23a;
          box-shadow: 0 0 6px #67c23a;
        }

        &.status-offline {
          background-color: #909399;
        }

        &.status-fault {
          background-color: #f56c6c;
          box-shadow: 0 0 6px #f56c6c;
        }
      }

      .indicator-text {
        font-size: 12px;
        color: #606266;
      }
    }
  }

  .alert-list {
    max-height: 400px;
    overflow-y: auto;

    .alert-item {
      display: flex;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background-color: #f5f7fa;
      }

      &.alert-emergency {
        border-left: 3px solid #f56c6c;
      }

      &.alert-warning {
        border-left: 3px solid #e6a23c;
      }

      &.alert-info {
        border-left: 3px solid #909399;
      }

      .alert-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;

        .alert-emergency & {
          background-color: #fef0f0;
          color: #f56c6c;
        }

        .alert-warning & {
          background-color: #fdf6ec;
          color: #e6a23c;
        }

        .alert-info & {
          background-color: #f4f4f5;
          color: #909399;
        }
      }

      .alert-content {
        flex: 1;

        .alert-message {
          font-size: 13px;
          color: #303133;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .alert-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .alert-time {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }
  }

  .map-chart {
    height: 350px;
    width: 100%;
  }
}
</style>

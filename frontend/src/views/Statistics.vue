<template>
  <div class="statistics-container">
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
              <div class="stat-value">{{ deviceStats?.onlineRate || 0 }}%</div>
              <div class="stat-label">设备在线率</div>
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
              <div class="stat-value">{{ alertStats?.total || 0 }}</div>
              <div class="stat-label">告警总数</div>
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
              <div class="stat-value">{{ alertStats?.unprocessed || 0 }}</div>
              <div class="stat-label">未处理告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>各类型设备数量</span>
          </template>
          <div ref="pieChartRef" class="pie-chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>告警级别分布</span>
          </template>
          <div ref="barChartRef" class="bar-chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>近7天每日告警数量趋势</span>
              <el-radio-group
                v-model="trendDays"
                size="small"
                @change="fetchAlertTrend"
              >
                <el-radio-button :label="7">7天</el-radio-button>
                <el-radio-button :label="14">14天</el-radio-button>
                <el-radio-button :label="30">30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="lineChartRef" class="line-chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>设备在线率仪表盘</span>
          </template>
          <div ref="gaugeChartRef" class="gauge-chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import * as echarts from "echarts";
import { statisticsApi } from "@/api/statistics";
import type { DeviceStats, AlertStats, DailyAlertTrend } from "@/types";

const deviceStats = ref<DeviceStats | null>(null);
const alertStats = ref<AlertStats | null>(null);
const deviceTypeData = ref<{ name: string; type: string; value: number }[]>([]);
const alertLevelData = ref<{ name: string; level: string; count: number }[]>(
  [],
);
const alertTrendData = ref<DailyAlertTrend[]>([]);
const trendDays = ref(7);

const pieChartRef = ref<HTMLElement>();
const barChartRef = ref<HTMLElement>();
const lineChartRef = ref<HTMLElement>();
const gaugeChartRef = ref<HTMLElement>();

let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;
let lineChart: echarts.ECharts | null = null;
let gaugeChart: echarts.ECharts | null = null;

const fetchOverview = async () => {
  try {
    const data = await statisticsApi.getOverview();
    deviceStats.value = data.devices;
    alertStats.value = {
      total: data.alerts.total,
      unprocessed: data.alerts.unprocessed,
      confirmed: data.alerts.confirmed,
      resolved: data.alerts.resolved,
      levels: [],
    };
  } catch (error) {
    console.error("获取概览数据失败:", error);
  }
};

const fetchDeviceTypeDistribution = async () => {
  try {
    deviceTypeData.value = await statisticsApi.getDeviceTypeDistribution();
    await nextTick();
    initPieChart();
  } catch (error) {
    console.error("获取设备类型分布失败:", error);
  }
};

const fetchAlertLevelDistribution = async () => {
  try {
    alertLevelData.value = await statisticsApi.getAlertLevelDistribution();
    await nextTick();
    initBarChart();
  } catch (error) {
    console.error("获取告警级别分布失败:", error);
  }
};

const fetchAlertTrend = async () => {
  try {
    alertTrendData.value = await statisticsApi.getDailyAlertTrend(
      trendDays.value,
    );
    await nextTick();
    initLineChart();
  } catch (error) {
    console.error("获取告警趋势失败:", error);
  }
};

const fetchOnlineRate = async () => {
  try {
    deviceStats.value = await statisticsApi.getDeviceOnlineRate();
    await nextTick();
    initGaugeChart();
  } catch (error) {
    console.error("获取设备在线率失败:", error);
  }
};

const initPieChart = () => {
  if (!pieChartRef.value) return;

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value);
  }

  const colors = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c"];

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
    },
    series: [
      {
        name: "设备类型",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "bold",
          },
        },
        data: deviceTypeData.value.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };

  pieChart.setOption(option);
};

const initBarChart = () => {
  if (!barChartRef.value) return;

  if (!barChart) {
    barChart = echarts.init(barChartRef.value);
  }

  const xAxisData = alertLevelData.value.map((item) => item.name);
  const yAxisData = alertLevelData.value.map((item) => item.count);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
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
      data: xAxisData,
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "告警数量",
        type: "bar",
        barWidth: "50%",
        data: yAxisData.map((value, index) => ({
          value,
          itemStyle: {
            color:
              index === 0 ? "#f56c6c" : index === 1 ? "#e6a23c" : "#909399",
          },
        })),
      },
    ],
  };

  barChart.setOption(option);
};

const initLineChart = () => {
  if (!lineChartRef.value) return;

  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value);
  }

  const xAxisData = alertTrendData.value.map((item) => item.date);
  const yAxisData = alertTrendData.value.map((item) => item.count);

  const option: echarts.EChartsOption = {
    title: {
      text: "告警数量趋势",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
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
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "告警数量",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(64, 158, 255, 0.3)" },
            { offset: 1, color: "rgba(64, 158, 255, 0.05)" },
          ]),
        },
        lineStyle: {
          color: "#409eff",
          width: 2,
        },
        itemStyle: {
          color: "#409eff",
        },
        data: yAxisData,
      },
    ],
  };

  lineChart.setOption(option);
};

const initGaugeChart = () => {
  if (!gaugeChartRef.value) return;

  if (!gaugeChart) {
    gaugeChart = echarts.init(gaugeChartRef.value);
  }

  const onlineRate = deviceStats.value?.onlineRate || 0;

  const option: echarts.EChartsOption = {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#f56c6c" },
              { offset: 0.5, color: "#e6a23c" },
              { offset: 1, color: "#67c23a" },
            ],
          },
        },
        progress: {
          show: true,
          width: 18,
        },
        pointer: {
          show: true,
          icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
          length: "12%",
          width: 20,
          offsetCenter: [0, "-60%"],
          itemStyle: {
            color: "auto",
          },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[1, "#e6e6e6"]],
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: true,
          distance: 25,
          color: "#999",
          fontSize: 14,
        },
        title: {
          show: true,
          offsetCenter: [0, "20%"],
          fontSize: 16,
          color: "#333",
        },
        detail: {
          valueAnimation: true,
          fontSize: 36,
          offsetCenter: [0, "0%"],
          formatter: "{value}%",
          color: "auto",
        },
        data: [
          {
            value: onlineRate,
            name: "设备在线率",
          },
        ],
      },
    ],
  };

  gaugeChart.setOption(option);
};

const handleResize = () => {
  pieChart?.resize();
  barChart?.resize();
  lineChart?.resize();
  gaugeChart?.resize();
};

onMounted(async () => {
  await Promise.all([
    fetchOverview(),
    fetchDeviceTypeDistribution(),
    fetchAlertLevelDistribution(),
    fetchAlertTrend(),
    fetchOnlineRate(),
  ]);

  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  pieChart?.dispose();
  barChart?.dispose();
  lineChart?.dispose();
  gaugeChart?.dispose();
});
</script>

<style scoped lang="scss">
.statistics-container {
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

  .chart-card {
    :deep(.el-card__header) {
      padding: 15px 20px;
      border-bottom: 1px solid #ebeef5;

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    :deep(.el-card__body) {
      padding: 20px;
    }

    .pie-chart,
    .bar-chart,
    .line-chart,
    .gauge-chart {
      height: 300px;
      width: 100%;
    }
  }
}
</style>

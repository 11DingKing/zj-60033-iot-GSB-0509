<template>
  <div class="alerts-container">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="告警级别">
          <el-select
            v-model="filterForm.level"
            placeholder="全部级别"
            clearable
            style="width: 120px"
          >
            <el-option label="紧急" value="EMERGENCY" />
            <el-option label="警告" value="WARNING" />
            <el-option label="提示" value="INFO" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
          >
            <el-option label="未处理" value="UNPROCESSED" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已解决" value="RESOLVED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchAlerts">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="stats-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ alertStats?.total || 0 }}</div>
            <div class="stat-label">告警总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item unprocessed">
            <div class="stat-value">{{ alertStats?.unprocessed || 0 }}</div>
            <div class="stat-label">未处理</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item confirmed">
            <div class="stat-value">{{ alertStats?.confirmed || 0 }}</div>
            <div class="stat-label">已确认</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item resolved">
            <div class="stat-value">{{ alertStats?.resolved || 0 }}</div>
            <div class="stat-label">已解决</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="alerts" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="device.name" label="设备名称" min-width="150">
          <template #default="{ row }">
            {{ row.device?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="level" label="告警级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getAlertLevelTagType(row.level)" size="small">
              <el-icon v-if="row.level === 'EMERGENCY'" class="level-icon"
                ><WarningFilled
              /></el-icon>
              <el-icon v-else-if="row.level === 'WARNING'" class="level-icon"
                ><Bell
              /></el-icon>
              <el-icon v-else class="level-icon"><InfoFilled /></el-icon>
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
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'UNPROCESSED'"
              type="primary"
              link
              @click="handleConfirm(row.id)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status !== 'RESOLVED'"
              type="success"
              link
              @click="handleResolve(row.id)"
            >
              解决
            </el-button>
            <el-button type="primary" link @click="viewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="告警详情" width="500px">
      <el-descriptions :column="1" border v-if="selectedAlert">
        <el-descriptions-item label="设备名称">
          {{ selectedAlert.device?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="告警级别">
          <el-tag
            :type="getAlertLevelTagType(selectedAlert.level)"
            size="small"
          >
            {{ getAlertLevelText(selectedAlert.level) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="告警信息">{{
          selectedAlert.message
        }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag
            :type="getAlertStatusTagType(selectedAlert.status)"
            size="small"
          >
            {{ getAlertStatusText(selectedAlert.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="触发时间">
          {{ formatTime(selectedAlert.triggeredAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="确认时间" v-if="selectedAlert.confirmedAt">
          {{ formatTime(selectedAlert.confirmedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="解决时间" v-if="selectedAlert.resolvedAt">
          {{ formatTime(selectedAlert.resolvedAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer v-if="selectedAlert">
        <span class="dialog-footer">
          <el-button
            v-if="selectedAlert.status === 'UNPROCESSED'"
            type="primary"
            @click="handleConfirm(selectedAlert.id)"
          >
            确认
          </el-button>
          <el-button
            v-if="selectedAlert.status !== 'RESOLVED'"
            type="success"
            @click="handleResolve(selectedAlert.id)"
          >
            解决
          </el-button>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { alertsApi } from "@/api/alerts";
import type { Alert, AlertLevel, AlertStatus, AlertStats } from "@/types";

const loading = ref(false);
const alerts = ref<Alert[]>([]);
const alertStats = ref<AlertStats | null>(null);
const detailDialogVisible = ref(false);
const selectedAlert = ref<Alert | null>(null);

const filterForm = reactive({
  level: "",
  status: "",
});

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

const fetchAlerts = async () => {
  loading.value = true;
  try {
    const options: any = {};
    if (filterForm.level) options.level = filterForm.level as AlertLevel;
    if (filterForm.status) options.status = filterForm.status as AlertStatus;

    alerts.value = await alertsApi.getAll(options);
  } catch (error) {
    console.error("获取告警列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const fetchAlertStats = async () => {
  try {
    alertStats.value = await alertsApi.getStats();
  } catch (error) {
    console.error("获取告警统计失败:", error);
  }
};

const resetFilter = () => {
  filterForm.level = "";
  filterForm.status = "";
  fetchAlerts();
};

const handleConfirm = async (alertId: number) => {
  ElMessageBox.confirm("确定要确认该告警吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await alertsApi.confirm(alertId);
        ElMessage.success("确认成功");
        detailDialogVisible.value = false;
        fetchAlerts();
        fetchAlertStats();
      } catch (error) {
        console.error("确认告警失败:", error);
      }
    })
    .catch(() => {});
};

const handleResolve = async (alertId: number) => {
  ElMessageBox.confirm("确定要标记该告警为已解决吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await alertsApi.resolve(alertId);
        ElMessage.success("解决成功");
        detailDialogVisible.value = false;
        fetchAlerts();
        fetchAlertStats();
      } catch (error) {
        console.error("解决告警失败:", error);
      }
    })
    .catch(() => {});
};

const viewDetail = (alert: Alert) => {
  selectedAlert.value = alert;
  detailDialogVisible.value = true;
};

onMounted(() => {
  fetchAlerts();
  fetchAlertStats();
});
</script>

<style scoped lang="scss">
.alerts-container {
  .filter-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 15px 20px;
    }
  }

  .stats-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 20px;
    }

    .stat-item {
      text-align: center;
      padding: 15px;
      border-radius: 8px;
      background: #f5f7fa;

      &.unprocessed {
        background: #fef0f0;

        .stat-value {
          color: #f56c6c;
        }
      }

      &.confirmed {
        background: #fdf6ec;

        .stat-value {
          color: #e6a23c;
        }
      }

      &.resolved {
        background: #f0f9eb;

        .stat-value {
          color: #67c23a;
        }
      }

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 5px;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }

  .table-card {
    :deep(.el-card__body) {
      padding: 0;
    }

    .level-icon {
      margin-right: 4px;
      vertical-align: middle;
    }
  }
}
</style>

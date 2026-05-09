<template>
  <div class="rules-container">
    <el-card class="header-card">
      <div class="header-content">
        <span class="title">告警规则管理</span>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
      </div>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12" v-for="rule in rules" :key="rule.id">
        <el-card class="rule-card" :class="`rule-${rule.level.toLowerCase()}`">
          <div class="rule-header">
            <div class="rule-type">
              <el-tag :type="getTypeTagType(rule.deviceType)" size="large">
                {{ getTypeText(rule.deviceType) }}
              </el-tag>
            </div>
            <div class="rule-actions">
              <el-button type="primary" link @click="openEditDialog(rule)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="danger" link @click="handleDelete(rule)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
          <el-divider />
          <div class="rule-content">
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="rule-item">
                  <div class="label">告警阈值</div>
                  <div class="value">
                    {{ rule.threshold }}{{ getUnit(rule.deviceType) }}
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="rule-item">
                  <div class="label">触发条件</div>
                  <div class="value">
                    {{ getConditionText(rule.condition) }}
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="rule-item">
                  <div class="label">告警级别</div>
                  <div class="value">
                    <el-tag
                      :type="getAlertLevelTagType(rule.level)"
                      size="small"
                    >
                      {{ getAlertLevelText(rule.level) }}
                    </el-tag>
                  </div>
                </div>
              </el-col>
            </el-row>
            <div class="rule-description" v-if="rule.description">
              <div class="label">规则描述</div>
              <div class="value">{{ rule.description }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="rules.length === 0" class="empty-card">
      <el-empty description="暂无告警规则，请添加">
        <el-button type="primary" @click="openAddDialog">添加规则</el-button>
      </el-empty>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑告警规则' : '添加告警规则'"
      width="500px"
    >
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="ruleRules"
        label-width="100px"
      >
        <el-form-item label="设备类型" prop="deviceType">
          <el-select
            v-model="ruleForm.deviceType"
            placeholder="请选择设备类型"
            style="width: 100%"
            :disabled="isEdit"
          >
            <el-option label="温度传感器" value="TEMPERATURE" />
            <el-option label="湿度传感器" value="HUMIDITY" />
            <el-option label="摄像头" value="CAMERA" />
            <el-option label="烟雾报警器" value="SMOKE" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警阈值" prop="threshold">
          <el-input-number
            v-model="ruleForm.threshold"
            :min="0"
            :max="100"
            :precision="1"
            style="width: 100%"
          />
          <span class="unit-tip">{{ getUnit(ruleForm.deviceType) }}</span>
        </el-form-item>
        <el-form-item label="触发条件" prop="condition">
          <el-select
            v-model="ruleForm.condition"
            placeholder="请选择触发条件"
            style="width: 100%"
          >
            <el-option label="大于阈值" value="GREATER_THAN" />
            <el-option label="小于阈值" value="LESS_THAN" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警级别" prop="level">
          <el-select
            v-model="ruleForm.level"
            placeholder="请选择告警级别"
            style="width: 100%"
          >
            <el-option label="紧急" value="EMERGENCY" />
            <el-option label="警告" value="WARNING" />
            <el-option label="提示" value="INFO" />
          </el-select>
        </el-form-item>
        <el-form-item label="规则描述" prop="description">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入规则描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="submitLoading"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { alertRulesApi } from "@/api/alerts";
import type {
  AlertRule,
  DeviceType,
  AlertLevel,
  AlertCondition,
} from "@/types";

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const rules = ref<AlertRule[]>([]);
const ruleFormRef = ref<FormInstance>();

const ruleForm = reactive({
  deviceType: "" as DeviceType | "",
  threshold: 0,
  condition: "GREATER_THAN" as AlertCondition,
  level: "WARNING" as AlertLevel,
  description: "",
});

const ruleRules: FormRules = {
  deviceType: [
    { required: true, message: "请选择设备类型", trigger: "change" },
  ],
  threshold: [{ required: true, message: "请输入告警阈值", trigger: "blur" }],
  condition: [{ required: true, message: "请选择触发条件", trigger: "change" }],
  level: [{ required: true, message: "请选择告警级别", trigger: "change" }],
};

const getTypeText = (type: DeviceType) => {
  const texts: Record<DeviceType, string> = {
    TEMPERATURE: "温度传感器",
    HUMIDITY: "湿度传感器",
    CAMERA: "摄像头",
    SMOKE: "烟雾报警器",
  };
  return texts[type] || type;
};

const getTypeTagType = (type: DeviceType) => {
  const types: Record<DeviceType, string> = {
    TEMPERATURE: "primary",
    HUMIDITY: "success",
    CAMERA: "warning",
    SMOKE: "danger",
  };
  return types[type] || "info";
};

const getUnit = (type?: DeviceType | string) => {
  if (!type) return "";
  const units: Record<DeviceType, string> = {
    TEMPERATURE: "℃",
    HUMIDITY: "%",
    CAMERA: "",
    SMOKE: "",
  };
  return units[type as DeviceType] || "";
};

const getConditionText = (condition: AlertCondition) => {
  const texts: Record<AlertCondition, string> = {
    GREATER_THAN: "大于阈值",
    LESS_THAN: "小于阈值",
  };
  return texts[condition] || condition;
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

const fetchRules = async () => {
  loading.value = true;
  try {
    rules.value = await alertRulesApi.getAll();
  } catch (error) {
    console.error("获取告警规则失败:", error);
  } finally {
    loading.value = false;
  }
};

const openAddDialog = () => {
  isEdit.value = false;
  ruleForm.deviceType = "";
  ruleForm.threshold = 0;
  ruleForm.condition = "GREATER_THAN";
  ruleForm.level = "WARNING";
  ruleForm.description = "";
  dialogVisible.value = true;
};

const openEditDialog = (rule: AlertRule) => {
  isEdit.value = true;
  ruleForm.deviceType = rule.deviceType;
  ruleForm.threshold = rule.threshold;
  ruleForm.condition = rule.condition;
  ruleForm.level = rule.level;
  ruleForm.description = rule.description || "";
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!ruleFormRef.value) return;

  await ruleFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        const data = {
          deviceType: ruleForm.deviceType as DeviceType,
          threshold: ruleForm.threshold,
          condition: ruleForm.condition,
          level: ruleForm.level,
          description: ruleForm.description || undefined,
        };

        if (isEdit.value) {
          await alertRulesApi.update(ruleForm.deviceType as DeviceType, {
            threshold: ruleForm.threshold,
            condition: ruleForm.condition,
            level: ruleForm.level,
            description: ruleForm.description || undefined,
          });
          ElMessage.success("编辑成功");
        } else {
          await alertRulesApi.create(data);
          ElMessage.success("添加成功");
        }
        dialogVisible.value = false;
        fetchRules();
      } catch (error) {
        console.error("提交失败:", error);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (rule: AlertRule) => {
  ElMessageBox.confirm(
    `确定要删除 "${getTypeText(rule.deviceType)}" 的告警规则吗？`,
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(async () => {
      try {
        await alertRulesApi.delete(rule.deviceType);
        ElMessage.success("删除成功");
        fetchRules();
      } catch (error) {
        console.error("删除失败:", error);
      }
    })
    .catch(() => {});
};

onMounted(() => {
  fetchRules();
});
</script>

<style scoped lang="scss">
.rules-container {
  .header-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 15px 20px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title {
        font-size: 16px;
        font-weight: 500;
      }
    }
  }

  .empty-card {
    margin-top: 20px;
  }

  .rule-card {
    margin-bottom: 20px;

    &.rule-emergency {
      :deep(.el-card__header) {
        background: linear-gradient(90deg, #fef0f0 0%, #fff 100%);
      }
    }

    &.rule-warning {
      :deep(.el-card__header) {
        background: linear-gradient(90deg, #fdf6ec 0%, #fff 100%);
      }
    }

    &.rule-info {
      :deep(.el-card__header) {
        background: linear-gradient(90deg, #f4f4f5 0%, #fff 100%);
      }
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rule-content {
      .rule-item {
        .label {
          font-size: 12px;
          color: #909399;
          margin-bottom: 5px;
        }

        .value {
          font-size: 16px;
          font-weight: 500;
          color: #303133;
        }
      }

      .rule-description {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px dashed #ebeef5;
      }
    }
  }

  .unit-tip {
    margin-left: 10px;
    color: #909399;
  }
}
</style>

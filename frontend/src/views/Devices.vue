<template>
  <div class="devices-container">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="设备类型">
          <el-select
            v-model="filterForm.type"
            placeholder="全部类型"
            clearable
            style="width: 150px"
          >
            <el-option label="温度传感器" value="TEMPERATURE" />
            <el-option label="湿度传感器" value="HUMIDITY" />
            <el-option label="摄像头" value="CAMERA" />
            <el-option label="烟雾报警器" value="SMOKE" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备状态">
          <el-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 120px"
          >
            <el-option label="在线" value="ONLINE" />
            <el-option label="离线" value="OFFLINE" />
            <el-option label="故障" value="FAULT" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchDevices">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            添加设备
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="devices" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="设备名称" min-width="150" />
        <el-table-column prop="code" label="设备编号" min-width="120" />
        <el-table-column prop="type" label="设备类型" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="安装位置" min-width="120" />
        <el-table-column prop="status" label="设备状态" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              <el-icon v-if="row.status === 'ONLINE'" class="status-dot"
                ><CircleCheck
              /></el-icon>
              <el-icon v-else-if="row.status === 'OFFLINE'" class="status-dot"
                ><CircleClose
              /></el-icon>
              <el-icon v-else class="status-dot"><Warning /></el-icon>
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="150">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row.id)"
              >查看</el-button
            >
            <el-button type="primary" link @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-button type="danger" link @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="500px"
    >
      <el-form
        ref="deviceFormRef"
        :model="deviceForm"
        :rules="deviceRules"
        label-width="100px"
      >
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="deviceForm.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="type">
          <el-select
            v-model="deviceForm.type"
            placeholder="请选择设备类型"
            style="width: 100%"
          >
            <el-option label="温度传感器" value="TEMPERATURE" />
            <el-option label="湿度传感器" value="HUMIDITY" />
            <el-option label="摄像头" value="CAMERA" />
            <el-option label="烟雾报警器" value="SMOKE" />
          </el-select>
        </el-form-item>
        <el-form-item label="安装位置" prop="location">
          <el-input
            v-model="deviceForm.location"
            placeholder="请输入安装位置"
          />
        </el-form-item>
        <el-form-item label="设备编号" prop="code">
          <el-input
            v-model="deviceForm.code"
            placeholder="请输入设备编号"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="设备状态" prop="status">
          <el-select
            v-model="deviceForm.status"
            placeholder="请选择设备状态"
            style="width: 100%"
          >
            <el-option label="在线" value="ONLINE" />
            <el-option label="离线" value="OFFLINE" />
            <el-option label="故障" value="FAULT" />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="X坐标" prop="x">
              <el-input-number
                v-model="deviceForm.x"
                :min="0"
                :max="600"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Y坐标" prop="y">
              <el-input-number
                v-model="deviceForm.y"
                :min="0"
                :max="400"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
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
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { devicesApi } from "@/api/devices";
import type { Device, DeviceType, DeviceStatus } from "@/types";

const router = useRouter();

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const devices = ref<Device[]>([]);
const deviceFormRef = ref<FormInstance>();

const filterForm = reactive({
  type: "",
  status: "",
});

const deviceForm = reactive({
  id: 0,
  name: "",
  type: "" as DeviceType | "",
  location: "",
  code: "",
  status: "ONLINE" as DeviceStatus,
  x: 0,
  y: 0,
});

const deviceRules: FormRules = {
  name: [{ required: true, message: "请输入设备名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择设备类型", trigger: "change" }],
  location: [{ required: true, message: "请输入安装位置", trigger: "blur" }],
  code: [{ required: true, message: "请输入设备编号", trigger: "blur" }],
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

const getStatusText = (status: DeviceStatus) => {
  const texts: Record<DeviceStatus, string> = {
    ONLINE: "在线",
    OFFLINE: "离线",
    FAULT: "故障",
  };
  return texts[status] || status;
};

const getStatusTagType = (status: DeviceStatus) => {
  const types: Record<DeviceStatus, string> = {
    ONLINE: "success",
    OFFLINE: "info",
    FAULT: "danger",
  };
  return types[status] || "info";
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString("zh-CN");
};

const fetchDevices = async () => {
  loading.value = true;
  try {
    let data = await devicesApi.getAll();

    if (filterForm.type) {
      data = data.filter((d) => d.type === filterForm.type);
    }
    if (filterForm.status) {
      data = data.filter((d) => d.status === filterForm.status);
    }

    devices.value = data;
  } catch (error) {
    console.error("获取设备列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  filterForm.type = "";
  filterForm.status = "";
  fetchDevices();
};

const openAddDialog = () => {
  isEdit.value = false;
  deviceForm.id = 0;
  deviceForm.name = "";
  deviceForm.type = "";
  deviceForm.location = "";
  deviceForm.code = "";
  deviceForm.status = "ONLINE";
  deviceForm.x = 100;
  deviceForm.y = 100;
  dialogVisible.value = true;
};

const openEditDialog = (device: Device) => {
  isEdit.value = true;
  deviceForm.id = device.id;
  deviceForm.name = device.name;
  deviceForm.type = device.type;
  deviceForm.location = device.location;
  deviceForm.code = device.code;
  deviceForm.status = device.status;
  deviceForm.x = device.x;
  deviceForm.y = device.y;
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!deviceFormRef.value) return;

  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value) {
          await devicesApi.update(deviceForm.id, {
            name: deviceForm.name,
            type: deviceForm.type as DeviceType,
            location: deviceForm.location,
            status: deviceForm.status,
            x: deviceForm.x,
            y: deviceForm.y,
          });
          ElMessage.success("编辑成功");
        } else {
          await devicesApi.create({
            name: deviceForm.name,
            type: deviceForm.type as DeviceType,
            location: deviceForm.location,
            code: deviceForm.code,
            status: deviceForm.status,
            x: deviceForm.x,
            y: deviceForm.y,
          });
          ElMessage.success("添加成功");
        }
        dialogVisible.value = false;
        fetchDevices();
      } catch (error) {
        console.error("提交失败:", error);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (device: Device) => {
  ElMessageBox.confirm(`确定要删除设备 "${device.name}" 吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await devicesApi.delete(device.id);
        ElMessage.success("删除成功");
        fetchDevices();
      } catch (error) {
        console.error("删除失败:", error);
      }
    })
    .catch(() => {});
};

const viewDetail = (id: number) => {
  router.push(`/devices/${id}`);
};

onMounted(() => {
  fetchDevices();
});
</script>

<style scoped lang="scss">
.devices-container {
  .filter-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 15px 20px;
    }
  }

  .filter-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .table-card {
    :deep(.el-card__body) {
      padding: 0;
    }

    .status-dot {
      margin-right: 4px;
      vertical-align: middle;
    }
  }
}
</style>

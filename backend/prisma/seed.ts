import {
  PrismaClient,
  DeviceType,
  DeviceStatus,
  AlertLevel,
  AlertCondition,
  AlertStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("开始生成种子数据...");

  // 清除现有数据
  await prisma.alert.deleteMany({});
  await prisma.alertRule.deleteMany({});
  await prisma.dataRecord.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.user.deleteMany({});

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });
  console.log("管理员用户创建成功:", admin.username);

  // 创建设备
  const devices = [
    // 温度传感器 (3个)
    {
      name: "温度传感器-1",
      type: DeviceType.TEMPERATURE,
      location: "生产车间A",
      code: "TEMP-001",
      status: DeviceStatus.ONLINE,
      x: 100,
      y: 150,
    },
    {
      name: "温度传感器-2",
      type: DeviceType.TEMPERATURE,
      location: "生产车间B",
      code: "TEMP-002",
      status: DeviceStatus.ONLINE,
      x: 300,
      y: 200,
    },
    {
      name: "温度传感器-3",
      type: DeviceType.TEMPERATURE,
      location: "仓库",
      code: "TEMP-003",
      status: DeviceStatus.OFFLINE,
      x: 500,
      y: 300,
    },
    // 湿度传感器 (3个)
    {
      name: "湿度传感器-1",
      type: DeviceType.HUMIDITY,
      location: "生产车间A",
      code: "HUM-001",
      status: DeviceStatus.ONLINE,
      x: 150,
      y: 180,
    },
    {
      name: "湿度传感器-2",
      type: DeviceType.HUMIDITY,
      location: "生产车间B",
      code: "HUM-002",
      status: DeviceStatus.ONLINE,
      x: 350,
      y: 220,
    },
    {
      name: "湿度传感器-3",
      type: DeviceType.HUMIDITY,
      location: "办公区",
      code: "HUM-003",
      status: DeviceStatus.ONLINE,
      x: 400,
      y: 100,
    },
    // 摄像头 (3个)
    {
      name: "摄像头-1",
      type: DeviceType.CAMERA,
      location: "大门入口",
      code: "CAM-001",
      status: DeviceStatus.ONLINE,
      x: 50,
      y: 50,
    },
    {
      name: "摄像头-2",
      type: DeviceType.CAMERA,
      location: "生产车间A",
      code: "CAM-002",
      status: DeviceStatus.ONLINE,
      x: 200,
      y: 250,
    },
    {
      name: "摄像头-3",
      type: DeviceType.CAMERA,
      location: "仓库",
      code: "CAM-003",
      status: DeviceStatus.FAULT,
      x: 450,
      y: 350,
    },
    // 烟雾报警器 (3个)
    {
      name: "烟雾报警器-1",
      type: DeviceType.SMOKE,
      location: "生产车间A",
      code: "SMOKE-001",
      status: DeviceStatus.ONLINE,
      x: 120,
      y: 200,
    },
    {
      name: "烟雾报警器-2",
      type: DeviceType.SMOKE,
      location: "生产车间B",
      code: "SMOKE-002",
      status: DeviceStatus.ONLINE,
      x: 320,
      y: 250,
    },
    {
      name: "烟雾报警器-3",
      type: DeviceType.SMOKE,
      location: "仓库",
      code: "SMOKE-003",
      status: DeviceStatus.ONLINE,
      x: 520,
      y: 320,
    },
  ];

  const createdDevices = [];
  for (const device of devices) {
    const created = await prisma.device.create({ data: device });
    createdDevices.push(created);
    console.log("设备创建成功:", created.name);
  }

  // 为每个设备生成50条历史数据记录
  const now = new Date();
  for (const device of createdDevices) {
    const dataRecords = [];
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now.getTime() - (50 - i) * 30 * 60 * 1000); // 每30分钟一条数据
      let value: number;

      switch (device.type) {
        case DeviceType.TEMPERATURE:
          value = 20 + Math.random() * 25; // 20-45℃
          break;
        case DeviceType.HUMIDITY:
          value = 30 + Math.random() * 60; // 30-90%
          break;
        case DeviceType.CAMERA:
          value = Math.random() > 0.1 ? 1 : 0; // 90%概率在线
          break;
        case DeviceType.SMOKE:
          value = Math.random() > 0.95 ? 1 : 0; // 5%概率检测到烟雾
          break;
        default:
          value = 0;
      }

      dataRecords.push({
        deviceId: device.id,
        value: parseFloat(value.toFixed(2)),
        timestamp,
      });
    }

    await prisma.dataRecord.createMany({ data: dataRecords });
    console.log(`设备 ${device.name} 生成 ${dataRecords.length} 条历史数据`);
  }

  // 创建告警规则
  const alertRules = [
    {
      deviceType: DeviceType.TEMPERATURE,
      threshold: 40,
      condition: AlertCondition.GREATER_THAN,
      level: AlertLevel.WARNING,
      description: "高温告警：温度超过40℃",
    },
    {
      deviceType: DeviceType.HUMIDITY,
      threshold: 20,
      condition: AlertCondition.LESS_THAN,
      level: AlertLevel.INFO,
      description: "低湿告警：湿度低于20%",
    },
    {
      deviceType: DeviceType.SMOKE,
      threshold: 0.5,
      condition: AlertCondition.GREATER_THAN,
      level: AlertLevel.EMERGENCY,
      description: "烟雾告警：检测到烟雾",
    },
  ];

  for (const rule of alertRules) {
    await prisma.alertRule.create({ data: rule });
    console.log("告警规则创建成功:", rule.description);
  }

  // 创建告警记录
  const alerts = [
    // 紧急告警
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.SMOKE && d.code === "SMOKE-001",
      ).id,
      level: AlertLevel.EMERGENCY,
      message: "生产车间A检测到烟雾，请立即处理！",
      status: AlertStatus.UNPROCESSED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 5),
    },
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.SMOKE && d.code === "SMOKE-002",
      ).id,
      level: AlertLevel.EMERGENCY,
      message: "生产车间B检测到烟雾",
      status: AlertStatus.CONFIRMED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 30),
      confirmedAt: new Date(now.getTime() - 1000 * 60 * 15),
    },
    // 警告告警
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.TEMPERATURE && d.code === "TEMP-001",
      ).id,
      level: AlertLevel.WARNING,
      message: "生产车间A温度过高：42.5℃",
      status: AlertStatus.UNPROCESSED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 10),
    },
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.TEMPERATURE && d.code === "TEMP-002",
      ).id,
      level: AlertLevel.WARNING,
      message: "生产车间B温度过高：41.2℃",
      status: AlertStatus.RESOLVED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 60),
      confirmedAt: new Date(now.getTime() - 1000 * 60 * 45),
      resolvedAt: new Date(now.getTime() - 1000 * 60 * 20),
    },
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.TEMPERATURE && d.code === "TEMP-001",
      ).id,
      level: AlertLevel.WARNING,
      message: "生产车间A温度异常：43.1℃",
      status: AlertStatus.CONFIRMED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 2),
      confirmedAt: new Date(now.getTime() - 1000 * 60 * 1),
    },
    // 提示告警
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.HUMIDITY && d.code === "HUM-003",
      ).id,
      level: AlertLevel.INFO,
      message: "办公区湿度过低：18.5%",
      status: AlertStatus.UNPROCESSED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 20),
    },
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.HUMIDITY && d.code === "HUM-001",
      ).id,
      level: AlertLevel.INFO,
      message: "生产车间A湿度过低：19.2%",
      status: AlertStatus.RESOLVED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 120),
      confirmedAt: new Date(now.getTime() - 1000 * 60 * 90),
      resolvedAt: new Date(now.getTime() - 1000 * 60 * 60),
    },
    {
      deviceId: createdDevices.find(
        (d) => d.type === DeviceType.CAMERA && d.code === "CAM-003",
      ).id,
      level: AlertLevel.WARNING,
      message: "仓库摄像头故障，请检查",
      status: AlertStatus.UNPROCESSED,
      triggeredAt: new Date(now.getTime() - 1000 * 60 * 180),
    },
  ];

  for (const alert of alerts) {
    await prisma.alert.create({ data: alert });
    console.log("告警记录创建成功:", alert.message.substring(0, 30));
  }

  console.log("种子数据生成完成！");
  console.log("\n默认管理员账号: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

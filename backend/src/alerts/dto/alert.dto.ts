import { AlertLevel, AlertCondition, AlertStatus, DeviceType } from "@prisma/client";
import { IsString, IsEnum, IsNumber, IsOptional, IsInt } from "class-validator";

export class CreateAlertRuleDto {
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsNumber()
  threshold: number;

  @IsEnum(AlertCondition)
  condition: AlertCondition;

  @IsEnum(AlertLevel)
  level: AlertLevel;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsEnum(AlertCondition)
  condition?: AlertCondition;

  @IsOptional()
  @IsEnum(AlertLevel)
  level?: AlertLevel;

  @IsOptional()
  @IsString()
  description?: string;
}

export class QueryAlertDto {
  @IsOptional()
  @IsEnum(AlertLevel)
  level?: AlertLevel;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsInt()
  deviceId?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  timeRange?: string;
}

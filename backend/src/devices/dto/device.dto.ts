import { DeviceType, DeviceStatus } from "@prisma/client";
import { IsString, IsEnum, IsNumber, IsOptional } from "class-validator";

export class CreateDeviceDto {
  @IsString()
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsString()
  location: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;
}

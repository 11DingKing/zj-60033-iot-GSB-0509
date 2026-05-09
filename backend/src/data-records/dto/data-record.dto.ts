import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDataRecordDto {
  @IsNumber()
  deviceId: number;

  @IsNumber()
  value: number;

  @IsOptional()
  timestamp?: Date;
}

export class QueryDataRecordDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timeRange?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

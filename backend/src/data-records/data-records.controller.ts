import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DataRecordsService } from "./data-records.service";
import { CreateDataRecordDto, QueryDataRecordDto } from "./dto/data-record.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("data-records")
export class DataRecordsController {
  private readonly logger = new Logger(DataRecordsController.name);
  constructor(private readonly dataRecordsService: DataRecordsService) {}

  @Post()
  async create(@Body() createDataRecordDto: CreateDataRecordDto) {
    try {
      return await this.dataRecordsService.create(createDataRecordDto);
    } catch (error) {
      this.logger.error(
        `接收数据失败: ${error.message}，设备ID: ${createDataRecordDto.deviceId}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "数据接收失败，已保存待重试",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get("latest")
  getLatestData(@Query("deviceId") deviceId?: string) {
    return this.dataRecordsService.getLatestData(
      deviceId ? +deviceId : undefined,
    );
  }

  @Get("device/:deviceId")
  findByDeviceId(
    @Param("deviceId") deviceId: string,
    @Query() queryDto: QueryDataRecordDto,
  ) {
    return this.dataRecordsService.findByDeviceId(+deviceId, queryDto);
  }
}

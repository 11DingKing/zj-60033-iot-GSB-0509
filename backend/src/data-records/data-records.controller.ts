import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DataRecordsService } from "./data-records.service";
import { CreateDataRecordDto, QueryDataRecordDto } from "./dto/data-record.dto";

@Controller("data-records")
export class DataRecordsController {
  private readonly logger = new Logger(DataRecordsController.name);

  constructor(private readonly dataRecordsService: DataRecordsService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post()
  async create(@Body() createDataRecordDto: CreateDataRecordDto) {
    try {
      return await this.dataRecordsService.create(createDataRecordDto);
    } catch (error) {
      this.logger.error(
        `创建数据记录失败: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Post("batch")
  @HttpCode(HttpStatus.ACCEPTED)
  async createBatch(@Body() createDataRecordDtos: CreateDataRecordDto[]) {
    const results = {
      success: 0,
      failed: 0,
    };

    for (const dto of createDataRecordDtos) {
      try {
        await this.dataRecordsService.create(dto);
        results.success++;
      } catch (error) {
        results.failed++;
        this.logger.error(
          `批量创建数据记录失败 (deviceId: ${dto.deviceId}): ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `批量数据接收完成: 成功 ${results.success} 条, 失败 ${results.failed} 条`,
    );

    return results;
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

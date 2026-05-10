import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DataRecordsService } from "./data-records.service";
import { CreateDataRecordDto, QueryDataRecordDto } from "./dto/data-record.dto";
import { RedisService } from "../redis/redis.service";

@UseGuards(AuthGuard("jwt"))
@Controller("data-records")
export class DataRecordsController {
  private readonly logger = new Logger(DataRecordsController.name);

  constructor(
    private readonly dataRecordsService: DataRecordsService,
    private readonly redisService: RedisService,
  ) {}

  @Post()
  async create(@Body() createDataRecordDto: CreateDataRecordDto) {
    try {
      return await this.dataRecordsService.create(createDataRecordDto);
    } catch (error) {
      this.logger.error(`数据记录创建失败，写入DLQ: ${error.message}`);
      await this.redisService.lpush(
        "dlq:data-records",
        JSON.stringify({
          ...createDataRecordDto,
          _failedAt: new Date().toISOString(),
          _error: error.message,
        }),
      );
      throw error;
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

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DataRecordsService } from "./data-records.service";
import { CreateDataRecordDto, QueryDataRecordDto } from "./dto/data-record.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("data-records")
export class DataRecordsController {
  constructor(private readonly dataRecordsService: DataRecordsService) {}

  @Post()
  create(@Body() createDataRecordDto: CreateDataRecordDto) {
    return this.dataRecordsService.create(createDataRecordDto);
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

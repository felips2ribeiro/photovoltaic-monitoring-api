import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InverterAnalyticsQueryDto } from './dto/inverter-analytics-query.dto';
import { DailyMaxPowerResponseDto } from './dto/daily-max-power-response.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseInterceptors(ClassSerializerInterceptor)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('inverters/:inverterId/max-power-by-day')
  @ApiOperation({
    summary:
      'Get maximum active power per day for a specific inverter within a date range.',
  })
  @ApiParam({
    name: 'inverterId',
    type: Number,
    required: true,
    description: 'Internal ID of the inverter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved daily max power data.',
    type: DailyMaxPowerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid parameters (e.g., missing required dates, invalid date format, or invalid date range).',
  })
  @ApiResponse({ status: 404, description: 'Inverter not found.' })
  async getMaxPowerByDay(
    @Param('inverterId', ParseIntPipe) inverterId: number,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      }),
    )
    query: InverterAnalyticsQueryDto,
  ): Promise<DailyMaxPowerResponseDto> {
    this.logger.debug(
      `Query DTO received by controller: data_inicio type: ${typeof query.data_inicio}, value: ${query.data_inicio?.toISOString()}; data_fim type: ${typeof query.data_fim}, value: ${query.data_fim?.toISOString()}`,
    );
    const data = await this.analyticsService.getMaxPowerByDay(
      inverterId,
      query.data_inicio,
      query.data_fim,
    );
    return new DailyMaxPowerResponseDto({ data });
  }
}

import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InverterAnalyticsQueryDto } from './dto/inverter-analytics-query.dto';
import { DailyMaxPowerResponseDto } from './dto/daily-max-power-response.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseInterceptors(ClassSerializerInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('inverters/:inverterId/max-power-by-day')
  @ApiOperation({
    summary:
      'Get maximum active power per day for a specific inverter within a date range.',
  })
  @ApiParam({
    name: 'inverterId',
    type: Number,
    description: 'Internal ID of the inverter',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved daily max power data.',
    type: DailyMaxPowerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid parameters (e.g., missing dates, date format, range).',
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
    const data = await this.analyticsService.getMaxPowerByDay(
      inverterId,
      query.data_inicio,
      query.data_fim,
    );
    return new DailyMaxPowerResponseDto({ data });
  }
}

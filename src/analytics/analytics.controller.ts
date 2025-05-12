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
import { DailyAverageTemperatureResponseDto } from './dto/daily-average-temperature-response.dto';
import { EnergyGenerationResponseDto } from './dto/energy-generation-response.dto';
import { PlantAnalyticsQueryDto } from './dto/plant-analytics-query.dto';

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
      `getMaxPowerByDay called with inverterId: ${inverterId}, query: ${JSON.stringify(query)}`,
    );
    const data = await this.analyticsService.getMaxPowerByDay(
      inverterId,
      query.data_inicio,
      query.data_fim,
    );
    return new DailyMaxPowerResponseDto({ data });
  }

  @Get('inverters/:inverterId/average-temperature-by-day')
  @ApiOperation({
    summary:
      'Get average temperature per day for a specific inverter within a date range.',
  })
  @ApiParam({
    name: 'inverterId',
    type: Number,
    required: true,
    description: 'Internal ID of the inverter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved daily average temperature data.',
    type: DailyAverageTemperatureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid parameters (e.g., missing required dates, invalid date format, or invalid date range).',
  })
  @ApiResponse({ status: 404, description: 'Inverter not found.' })
  async getAverageTemperatureByDay(
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
  ): Promise<DailyAverageTemperatureResponseDto> {
    this.logger.debug(
      `getAverageTemperatureByDay called with inverterId: ${inverterId}, query: ${JSON.stringify(query)}`,
    );
    const data = await this.analyticsService.getAverageTemperatureByDay(
      inverterId,
      query.data_inicio,
      query.data_fim,
    );
    return new DailyAverageTemperatureResponseDto({ data });
  }

  @Get('inverters/:inverterId/generation')
  @ApiOperation({
    summary:
      'Calculate total energy generation for an inverter within a date range.',
  })
  @ApiParam({
    name: 'inverterId',
    type: Number,
    required: true,
    description: 'Internal ID of the inverter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully calculated energy generation.',
    type: EnergyGenerationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid parameters (e.g., missing required dates, date format, range).',
  })
  @ApiResponse({ status: 404, description: 'Inverter not found.' })
  async getInverterEnergyGeneration(
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
  ): Promise<EnergyGenerationResponseDto> {
    this.logger.debug(
      `getInverterEnergyGeneration called for inverterId: ${inverterId}, query: ${JSON.stringify(query)}`,
    );

    return this.analyticsService.getInverterEnergyGeneration(
      inverterId,
      query.data_inicio,
      query.data_fim,
    );
  }

  @Get('plants/:plantId/generation')
  @ApiOperation({
    summary:
      'Calculate total energy generation for a specific plant within a date range.',
  })
  @ApiParam({
    name: 'plantId',
    type: Number,
    required: true,
    description: 'Internal ID of the plant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully calculated energy generation for the plant.',
    type: EnergyGenerationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters.' })
  @ApiResponse({ status: 404, description: 'Plant not found.' })
  async getPlantEnergyGeneration(
    @Param('plantId', ParseIntPipe) plantId: number,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      }),
    )
    query: PlantAnalyticsQueryDto,
  ): Promise<EnergyGenerationResponseDto> {
    this.logger.debug(
      `getPlantEnergyGeneration called for plantId: ${plantId}, query: ${JSON.stringify(query)}`,
    );
    return this.analyticsService.getPlantEnergyGeneration(
      plantId,
      query.data_inicio,
      query.data_fim,
    );
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { Inverter } from '../inverters/entities/inverter.entity';
import { DailyMaxPowerEntryDto } from './dto/daily-max-power-response.dto';
import { DailyAverageTemperatureEntryDto } from './dto/daily-average-temperature-response.dto';
import { EnergyGenerationResponseDto } from './dto/energy-generation-response.dto';
import {
  calculateTotalEnergyGenerationWh,
  EntityWithPower,
} from '../common/utils/energy-calculation.util';
interface AggregatedDailyValue {
  day: string;
  value: number | string | null;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,
    @InjectRepository(Inverter)
    private readonly inverterRepository: Repository<Inverter>,
  ) {}

  private async validateInverterAndDateRange(
    inverterId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Date> {
    const inverter = await this.inverterRepository.findOneBy({
      id: inverterId,
    });
    if (!inverter) {
      throw new NotFoundException(
        `Inverter with ID "${inverterId}" not found.`,
      );
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        'End date must be after or the same as start date.',
      );
    }

    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);
    return adjustedEndDate;
  }

  private async getAggregatedDailyData(params: {
    inverterId: number;
    startDate: Date;
    adjustedEndDate: Date;
    aggregationFunction: string;
    valueAlias: string;
    valueColumnName: string;
  }): Promise<AggregatedDailyValue[]> {
    const queryBuilder = this.metricRepository.createQueryBuilder('metric');

    const results = await queryBuilder
      .select("strftime('%Y-%m-%d', metric.timestamp)", 'day')
      .addSelect(params.aggregationFunction, params.valueAlias)
      .where('metric.inverterId = :inverterId', {
        inverterId: params.inverterId,
      })
      .andWhere('metric.timestamp >= :startDate', {
        startDate: params.startDate,
      })
      .andWhere('metric.timestamp <= :adjustedEndDate', {
        adjustedEndDate: params.adjustedEndDate.toISOString(),
      })
      .andWhere(`metric.${params.valueColumnName} IS NOT NULL`)
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; [key: string]: number | string | null }>();

    return results.map((item) => ({
      day: item.day,
      value: item[params.valueAlias],
    }));
  }

  private formatAggregatedValue(
    rawValue: number | string | null,
  ): number | null {
    if (rawValue !== null && rawValue !== undefined) {
      const numValue = parseFloat(String(rawValue));
      if (!isNaN(numValue)) {
        return parseFloat(numValue.toFixed(2));
      }
    }
    return null;
  }

  async getMaxPowerByDay(
    inverterId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyMaxPowerEntryDto[]> {
    const adjustedEndDate = await this.validateInverterAndDateRange(
      inverterId,
      startDate,
      endDate,
    );

    const aggregatedData = await this.getAggregatedDailyData({
      inverterId,
      startDate,
      adjustedEndDate,
      aggregationFunction: 'MAX(metric.activePower)',
      valueAlias: 'maxActivePower',
      valueColumnName: 'activePower',
    });

    return aggregatedData.map((item) => ({
      day: item.day,
      maxActivePower: this.formatAggregatedValue(item.value),
    }));
  }

  async getAverageTemperatureByDay(
    inverterId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyAverageTemperatureEntryDto[]> {
    const adjustedEndDate = await this.validateInverterAndDateRange(
      inverterId,
      startDate,
      endDate,
    );

    const aggregatedData = await this.getAggregatedDailyData({
      inverterId,
      startDate,
      adjustedEndDate,
      aggregationFunction: 'AVG(metric.temperature)',
      valueAlias: 'averageTemperature',
      valueColumnName: 'temperature',
    });

    return aggregatedData.map((item) => ({
      day: item.day,
      averageTemperature: this.formatAggregatedValue(item.value),
    }));
  }

  async getInverterEnergyGeneration(
    inverterId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<EnergyGenerationResponseDto> {
    const adjustedEndDate = await this.validateInverterAndDateRange(
      inverterId,
      startDate,
      endDate,
    );

    const metrics = await this.metricRepository.find({
      where: {
        inverterId: inverterId,
        timestamp: Between(startDate, adjustedEndDate),
        activePower: Not(IsNull()),
      },
      order: {
        timestamp: 'ASC',
      },
      select: ['timestamp', 'activePower'],
    });

    this.logger.debug(
      `Found ${metrics.length} metrics for inverter ${inverterId} in range for generation calculation.`,
    );

    if (metrics.length < 2) {
      this.logger.log(
        `Not enough metrics (found ${metrics.length}) to calculate generation for inverter ${inverterId}. Returning 0.`,
      );
      return new EnergyGenerationResponseDto({
        totalGenerationWh: 0,
        startDate,
        endDate,
        entityId: inverterId,
        entityType: 'inverter',
      });
    }

    const entityPowerData: EntityWithPower = {
      power: metrics.map((metric) => ({
        value: metric.activePower as number,
        date: metric.timestamp,
      })),
    };

    const generationWh = calculateTotalEnergyGenerationWh([entityPowerData]);

    return new EnergyGenerationResponseDto({
      totalGenerationWh: generationWh,
      startDate,
      endDate,
      entityId: inverterId,
      entityType: 'inverter',
    });
  }
}

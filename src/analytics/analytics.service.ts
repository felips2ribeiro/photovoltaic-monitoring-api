import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { Repository } from 'typeorm';
import { Inverter } from '../inverters/entities/inverter.entity';
import { DailyMaxPowerEntryDto } from './dto/daily-max-power-response.dto';
import { DailyAverageTemperatureEntryDto } from './dto/daily-average-temperature-response.dto';

interface AggregatedDailyValue {
  day: string;
  value: number | string | null;
}

@Injectable()
export class AnalyticsService {
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

  private async getAggregatedDailyData(
    inverterId: number,
    startDate: Date,
    adjustedEndDate: Date,
    aggregationFunction: string,
    valueAlias: string,
    valueColumnName: string,
  ): Promise<AggregatedDailyValue[]> {
    const queryBuilder = this.metricRepository.createQueryBuilder('metric');

    const results = await queryBuilder
      .select("strftime('%Y-%m-%d', metric.timestamp)", 'day')
      .addSelect(aggregationFunction, valueAlias)
      .where('metric.inverterId = :inverterId', { inverterId })
      .andWhere('metric.timestamp >= :startDate', { startDate })
      .andWhere('metric.timestamp <= :adjustedEndDate', {
        adjustedEndDate: adjustedEndDate.toISOString(),
      })
      .andWhere(`metric.${valueColumnName} IS NOT NULL`)
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; [key: string]: number | string | null }>();

    return results.map((item) => ({
      day: item.day,
      value: item[valueAlias],
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

    const aggregatedData = await this.getAggregatedDailyData(
      inverterId,
      startDate,
      adjustedEndDate,
      'MAX(metric.activePower)',
      'maxActivePower',
      'activePower',
    );

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

    const aggregatedData = await this.getAggregatedDailyData(
      inverterId,
      startDate,
      adjustedEndDate,
      'AVG(metric.temperature)',
      'averageTemperature',
      'temperature',
    );

    return aggregatedData.map((item) => ({
      day: item.day,
      averageTemperature: this.formatAggregatedValue(item.value),
    }));
  }
}

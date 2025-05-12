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

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,
    @InjectRepository(Inverter)
    private readonly inverterRepository: Repository<Inverter>,
  ) {}

  async getMaxPowerByDay(
    inverterId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyMaxPowerEntryDto[]> {
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

    const queryBuilder = this.metricRepository.createQueryBuilder('metric');

    const results = await queryBuilder
      .select("strftime('%Y-%m-%d', metric.timestamp)", 'day')
      .addSelect('MAX(metric.activePower)', 'maxActivePower')
      .where('metric.inverterId = :inverterId', { inverterId })
      .andWhere('metric.timestamp >= :startDate', { startDate })
      .andWhere('metric.timestamp <= :adjustedEndDate', {
        adjustedEndDate: adjustedEndDate.toISOString(),
      })
      .andWhere('metric.activePower IS NOT NULL')
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; maxActivePower: string | number | null }>();

    return results.map((item) => {
      let finalMaxPower: number | null = null;

      if (item.maxActivePower !== null && item.maxActivePower !== undefined) {
        const numPower = parseFloat(String(item.maxActivePower));
        if (!isNaN(numPower)) {
          finalMaxPower = parseFloat(numPower.toFixed(2));
        }
      }

      return {
        day: item.day,
        maxActivePower: finalMaxPower,
      };
    });
  }
}

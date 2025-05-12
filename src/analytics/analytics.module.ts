import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { Inverter } from '../inverters/entities/inverter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Metric, Inverter])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

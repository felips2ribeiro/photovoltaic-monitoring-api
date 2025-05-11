import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MetricsModule } from '../metrics/metrics.module';
import { InvertersModule } from '../inverters/inverters.module';
import { PlantsModule } from '../plants/plants.module';

@Module({
  imports: [MetricsModule, InvertersModule, PlantsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

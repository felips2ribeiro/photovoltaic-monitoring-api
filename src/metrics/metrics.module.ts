import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { Metric } from './entities/metric.entity';
import { InvertersModule } from '../inverters/inverters.module';

@Module({
  imports: [TypeOrmModule.forFeature([Metric]), InvertersModule],

  providers: [MetricsService],
  exports: [MetricsService, TypeOrmModule],
})
export class MetricsModule {}

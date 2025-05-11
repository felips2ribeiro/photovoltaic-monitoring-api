import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvertersService } from './inverters.service';
import { InvertersController } from './inverters.controller';
import { Inverter } from './entities/inverter.entity';
import { PlantsModule } from '../plants/plants.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inverter]), PlantsModule],
  controllers: [InvertersController],
  providers: [InvertersService],
  exports: [InvertersService, TypeOrmModule],
})
export class InvertersModule {}

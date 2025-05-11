import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantsService } from './plants.service';
import { PlantsController } from './plants.controller';
import { Plant } from './entities/plant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plant])],
  controllers: [PlantsController],
  providers: [PlantsService],
  exports: [PlantsService, TypeOrmModule],
})
export class PlantsModule {}

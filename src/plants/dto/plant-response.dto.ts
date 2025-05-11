import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Plant } from '../entities/plant.entity';

export class PlantResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the plant.',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'The name of the power plant.',
    example: 'Solar Plant Alpha',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'The date and time the plant record was created.',
  })
  @Expose()
  createdAt: Date;

  constructor(partial: Partial<PlantResponseDto | Plant>) {
    Object.assign(this, partial);
  }
}

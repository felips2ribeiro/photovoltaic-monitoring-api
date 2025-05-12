import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class EnergyGenerationResponseDto {
  @ApiProperty({
    example: 1500.75,
    description:
      'Total energy generated in Watt-hours (Wh) within the specified period.',
  })
  @Expose()
  totalGenerationWh: number;

  @ApiProperty({
    example: '2023-10-26T00:00:00Z',
    description: 'Start date of the period considered.',
  })
  @Expose()
  startDate: Date;

  @ApiProperty({
    example: '2023-10-27T23:59:59Z',
    description: 'End date of the period considered.',
  })
  @Expose()
  endDate: Date;

  @ApiProperty({
    example: 1,
    description:
      'ID of the entity (inverter or plant) for which generation was calculated.',
    required: false,
  })
  @Expose()
  entityId?: number;

  @ApiProperty({
    example: 'inverter',
    description: 'Type of the entity (inverter or plant).',
    required: false,
  })
  @Expose()
  entityType?: 'inverter' | 'plant';

  constructor(partial: Partial<EnergyGenerationResponseDto>) {
    Object.assign(this, partial);
  }
}

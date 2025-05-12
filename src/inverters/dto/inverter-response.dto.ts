import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class InverterResponseDto {
  @ApiProperty({
    description: 'The unique internal identifier of the inverter.',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'The external identifier of the inverter.',
    example: 5,
  })
  @Expose()
  externalId: number;

  @ApiProperty({
    description: 'The name of the inverter.',
    example: 'Inverter B-01',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'The ID of the plant this inverter belongs to.',
    example: 2,
  })
  @Expose()
  plantId: number;

  @ApiProperty({
    description: 'The name of the plant this inverter belongs to.',
    example: 'Solar Plant Beta',
  })
  @Expose()
  plantName?: string;

  @ApiProperty({
    description: 'The date and time the inverter record was created.',
  })
  @Expose()
  createdAt: Date;

  constructor(
    partial: Partial<InverterResponseDto & { plant?: { name: string } }>,
  ) {
    Object.assign(this, partial);
    if (partial.plant && partial.plant.name) {
      this.plantName = partial.plant.name;
    }
  }
}

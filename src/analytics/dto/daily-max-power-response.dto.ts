import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class DailyMaxPowerEntryDto {
  @ApiProperty({
    example: '2023-10-26',
    description: 'Date in YYYY-MM-DD format',
  })
  @Expose()
  day: string;

  @ApiProperty({
    example: 7500.5,
    description:
      'Maximum active power recorded on this day in Watts (W). Can be null if no valid data for the day.',
    nullable: true,
  })
  @Expose()
  maxActivePower: number | null;
}

export class DailyMaxPowerResponseDto {
  @ApiProperty({ type: [DailyMaxPowerEntryDto] })
  @Expose()
  @Type(() => DailyMaxPowerEntryDto)
  data: DailyMaxPowerEntryDto[];

  constructor(partial: Partial<DailyMaxPowerResponseDto>) {
    Object.assign(this, partial);
  }
}

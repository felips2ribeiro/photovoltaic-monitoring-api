import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class DailyAverageTemperatureEntryDto {
  @ApiProperty({
    example: '2023-10-26',
    description: 'Date in YYYY-MM-DD format',
  })
  @Expose()
  day: string;

  @ApiProperty({
    example: 25.5,
    description:
      'Average temperature recorded on this day in Celsius (°C). Can be null if no valid temperature data for the day.',
    nullable: true,
  })
  @Expose()
  averageTemperature: number | null;
}

export class DailyAverageTemperatureResponseDto {
  @ApiProperty({ type: [DailyAverageTemperatureEntryDto] })
  @Expose()
  @Type(() => DailyAverageTemperatureEntryDto)
  data: DailyAverageTemperatureEntryDto[];

  constructor(partial: Partial<DailyAverageTemperatureResponseDto>) {
    Object.assign(this, partial);
  }
}

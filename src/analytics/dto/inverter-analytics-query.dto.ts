import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { DateRangeQueryDto } from './date-range-query.dto';

export class InverterAnalyticsQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsNotEmpty({ message: 'data_inicio is required.' })
  @Transform(({ value }: { value: string }) =>
    value ? new Date(value) : undefined,
  )
  @IsDate({ message: 'data_inicio must transform into a valid Date object' })
  declare data_inicio: Date;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2023-01-31T23:59:59Z',
  })
  @IsNotEmpty({ message: 'data_fim is required.' })
  @Transform(({ value }: { value: string }) =>
    value ? new Date(value) : undefined,
  )
  @IsDate({ message: 'data_fim must transform into a valid Date object' })
  declare data_fim: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class InverterAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date (ISO 8601 string will be transformed to Date)',
    example: '2023-01-01T00:00:00Z',
    type: String,
  })
  @IsNotEmpty({ message: 'data_inicio is required.' })
  @Type(() => Date)
  @IsDate({ message: 'data_inicio must be a valid Date object.' })
  data_inicio: Date;

  @ApiProperty({
    description: 'End date (ISO 8601 string will be transformed to Date)',
    example: '2023-01-31T23:59:59Z',
    type: String,
  })
  @IsNotEmpty({ message: 'data_fim is required.' })
  @Type(() => Date)
  @IsDate({ message: 'data_fim must be a valid Date object.' })
  data_fim: Date;
}

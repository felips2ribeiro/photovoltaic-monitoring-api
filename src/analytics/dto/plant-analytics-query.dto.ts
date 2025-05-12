import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDate } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export class PlantAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date (ISO 8601 string)',
    example: '2023-01-01T00:00:00Z',
    type: String,
  })
  @IsNotEmpty({ message: 'data_inicio is required.' })
  @Transform(({ value }: TransformFnParams): Date | undefined => {
    if (typeof value === 'string' && value.trim() !== '') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return value;
  })
  @IsDate({ message: 'data_inicio must resolve to a valid Date object.' })
  data_inicio: Date;

  @ApiProperty({
    description: 'End date (ISO 8601 string)',
    example: '2023-01-31T23:59:59Z',
    type: String,
  })
  @IsNotEmpty({ message: 'data_fim is required.' })
  @Transform(({ value }: TransformFnParams): Date | undefined => {
    if (typeof value === 'string' && value.trim() !== '') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return value;
  })
  @IsDate({ message: 'data_fim must resolve to a valid Date object.' })
  data_fim: Date;
}

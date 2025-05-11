import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, ValidateIf, IsDate } from 'class-validator';

export class DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for the range (ISO 8601 format)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'data_inicio must be a valid ISO 8601 date string' },
  )
  @Transform(({ value }: { value: string }) =>
    value ? new Date(value) : undefined,
  )
  @IsDate({ message: 'data_inicio must transform into a valid Date object' })
  data_inicio?: Date;

  @ApiPropertyOptional({
    description: 'End date for the range (ISO 8601 format)',
    example: '2023-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'data_fim must be a valid ISO 8601 date string' })
  @Transform(({ value }: { value: string }) =>
    value ? new Date(value) : undefined,
  )
  @IsDate({ message: 'data_fim must transform into a valid Date object' })
  @ValidateIf((object: DateRangeQueryDto) => !!object.data_inicio)
  data_fim?: Date;
}

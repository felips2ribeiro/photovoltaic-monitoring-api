import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { DateRangeQueryDto } from './date-range-query.dto';

export class PlantAnalyticsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'ID of the power plant',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : undefined,
  )
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'usina_id must be a valid number' },
  )
  @IsInt({ message: 'usina_id must be an integer' })
  @Min(1, { message: 'usina_id must be at least 1' })
  usina_id?: number;
}

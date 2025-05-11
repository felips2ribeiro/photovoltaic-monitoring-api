import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { DateRangeQueryDto } from './date-range-query.dto';

export class InverterAnalyticsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'ID of the inverter (our internal ID, not externalId)',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : undefined,
  )
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'inversor_id must be a valid number' },
  )
  @IsInt({ message: 'inversor_id must be an integer' })
  @Min(1, { message: 'inversor_id must be at least 1' })
  inversor_id?: number;
}

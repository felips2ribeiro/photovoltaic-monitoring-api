import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsDate,
  IsOptional,
  Min,
  ValidateNested,
  IsISO8601,
  IsObject,
} from 'class-validator';

class DateTimeDto {
  @ApiProperty({
    description: 'Timestamp of the reading in ISO 8601 format',
    example: '2023-10-26T10:00:00Z',
  })
  @IsISO8601(
    {},
    { message: 'Timestamp $date must be a valid ISO 8601 date string' },
  )
  @IsNotEmpty({ message: 'Timestamp $date should not be empty' })
  $date: string;
}

export class IngestMetricRecordDto {
  @ApiProperty({
    description: 'Nested datetime object containing the ISO 8601 timestamp',
    type: () => DateTimeDto,
    example: { $date: '2025-01-01T03:05:22.733Z' },
  })
  @IsNotEmpty({ message: 'datetime object should not be empty' })
  @IsObject({ message: 'datetime must be an object' })
  @ValidateNested({ message: 'Invalid datetime object structure' })
  @Type(() => DateTimeDto)
  @Transform(
    ({ value }: { value: DateTimeDto }) => {
      if (value && value.$date) {
        const dateObj = new Date(value.$date);
        return isNaN(dateObj.getTime()) ? undefined : dateObj;
      }
      return undefined;
    },
    { toClassOnly: true },
  )
  @IsDate({ message: 'datetime must transform into a valid Date object' })
  datetime: Date;

  @ApiProperty({ description: 'External Inverter ID', example: 1 })
  @IsNumber({}, { message: 'inversor_id must be a number' })
  @IsInt({ message: 'inversor_id must be an integer' })
  @Min(1, { message: 'inversor_id must be at least 1' })
  @IsNotEmpty({ message: 'inversor_id should not be empty' })
  inversor_id: number;

  @ApiProperty({ description: 'Active power in Watts (W)', example: 5000.0 })
  @IsNumber({}, { message: 'potencia_ativa_watt must be a number' })
  @IsNotEmpty({ message: 'potencia_ativa_watt should not be empty' })
  potencia_ativa_watt: number;

  @ApiPropertyOptional({
    description: 'Temperature in Celsius (°C)',
    example: 45.5,
    nullable: true,
  })
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'temperatura_celsius must be a number or null' },
  )
  temperatura_celsius?: number | null;
}

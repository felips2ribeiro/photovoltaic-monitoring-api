import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'isInstanceOfDate', async: false })
export class IsInstanceOfDateConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown) {
    return value instanceof Date && !isNaN(value.getTime());
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid Date object.`;
  }
}

interface DateTimeInputValue {
  $date: string;
}

function isDateTimeInputValue(value: unknown): value is DateTimeInputValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const potential = value as Record<string, unknown>;
  return typeof potential.$date === 'string';
}

export class IngestMetricRecordDto {
  @ApiProperty({
    description:
      'Nested datetime object { "$date": "ISO_STRING" }, will be transformed to Date',
    example: { $date: '2023-10-26T10:00:00Z' },
  })
  @IsNotEmpty({ message: 'datetime field should not be empty' })
  @Transform(
    ({ value }: TransformFnParams): Date | undefined => {
      if (isDateTimeInputValue(value)) {
        const dateObj = new Date(value.$date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj;
        }
      }
      return undefined;
    },
    { toClassOnly: true },
  )
  @Validate(IsInstanceOfDateConstraint)
  datetime: Date;

  @ApiProperty({ description: 'External Inverter ID', example: 1 })
  @IsNumber({}, { message: 'inversor_id must be a number' })
  @IsInt({ message: 'inversor_id must be an integer' })
  @Min(1, { message: 'inversor_id must be at least 1.' })
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

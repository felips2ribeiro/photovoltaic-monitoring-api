import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateInverterDto {
  @ApiProperty({
    description:
      'The external ID of the inverter (as in the source data, e.g., 1 to 8). Must be unique.',
    example: 1,
  })
  @IsNumber({}, { message: 'External ID must be a number.' })
  @IsInt({ message: 'External ID must be an integer.' })
  @Min(1, { message: 'External ID must be at least 1.' })
  @IsNotEmpty({ message: 'External ID should not be empty.' })
  externalId: number;

  @ApiProperty({
    description: 'A descriptive name for the inverter.',
    example: 'Inverter Sector A-01',
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name should not be empty.' })
  @MaxLength(100, { message: 'Name cannot be longer than 100 characters.' })
  name: string;

  @ApiProperty({
    description: 'The ID of the plant this inverter belongs to.',
    example: 1,
  })
  @IsNumber({}, { message: 'Plant ID must be a number.' })
  @IsInt({ message: 'Plant ID must be an integer.' })
  @Min(1, { message: 'Plant ID must be at least 1.' })
  @IsNotEmpty({ message: 'Plant ID should not be empty.' })
  plantId: number;
}

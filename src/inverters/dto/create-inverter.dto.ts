import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsInt, Min } from 'class-validator';

export class CreateInverterDto {
  @ApiProperty({
    description: 'The external ID of the inverter (as in the source data)',
    example: 1,
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  externalId: number;

  @ApiProperty({
    description: 'A descriptive name for the inverter',
    example: 'Inversor Principal Setor A',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The ID of the plant this inverter belongs to',
    example: 1,
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  plantId: number;
}

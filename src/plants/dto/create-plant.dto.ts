import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePlantDto {
  @ApiProperty({
    description: 'The name of the power plant',
    example: 'Usina Solar Alpha',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
}

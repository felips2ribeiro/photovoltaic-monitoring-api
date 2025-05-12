import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindAllInvertersQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional. Filter inverters by the ID of the plant they belong to.',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Plant ID (query) must be an integer.' })
  @Min(1, { message: 'Plant ID (query) must be at least 1.' })
  plantId?: number;
}

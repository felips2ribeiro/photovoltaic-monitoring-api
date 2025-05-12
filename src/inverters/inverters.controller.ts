import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { InvertersService } from './inverters.service';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { InverterResponseDto } from './dto/inverter-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FindAllInvertersQueryDto } from './dto/find-all-inverters-query.dto';
import { Inverter } from './entities/inverter.entity';

@ApiTags('inverters')
@Controller('inverters')
@UseInterceptors(ClassSerializerInterceptor)
export class InvertersController {
  constructor(private readonly invertersService: InvertersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inverter' })
  @ApiResponse({
    status: 201,
    description: 'The inverter was successfully created.',
    type: InverterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data (e.g., plantId not found, validation error).',
  })
  @ApiResponse({
    status: 409,
    description: 'An inverter with this externalId already exists.',
  })
  async create(
    @Body() createInverterDto: CreateInverterDto,
  ): Promise<InverterResponseDto> {
    const inverterEntity: Inverter =
      await this.invertersService.create(createInverterDto);
    return new InverterResponseDto({
      ...inverterEntity,
      plantName: inverterEntity.plant?.name,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all inverters, optionally filtered by plant ID',
  })
  @ApiQuery({
    name: 'plantId',
    type: Number,
    required: false,
    description: 'Filter by plant ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all registered inverters.',
    type: [InverterResponseDto],
  })
  async findAll(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: FindAllInvertersQueryDto,
  ): Promise<InverterResponseDto[]> {
    const inverters = await this.invertersService.findAll(query.plantId);
    return inverters.map(
      (inverter) =>
        new InverterResponseDto({
          ...inverter,
          plantName: inverter.plant?.name,
        }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific inverter by its internal ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric internal ID of the inverter to retrieve',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed information about the inverter.',
    type: InverterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Inverter not found for the provided ID.',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InverterResponseDto> {
    const inverter = await this.invertersService.findOne(id);
    return new InverterResponseDto({
      ...inverter,
      plantName: inverter.plant?.name,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing inverter' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric internal ID of the inverter to update',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'The inverter was successfully updated.',
    type: InverterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data for update (e.g., new plantId not found).',
  })
  @ApiResponse({ status: 404, description: 'Inverter not found for update.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict when trying to update the inverter (e.g., externalId duplicate).',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInverterDto: UpdateInverterDto,
  ): Promise<InverterResponseDto> {
    const inverter = await this.invertersService.update(id, updateInverterDto);
    const updatedInverterWithPlant = await this.invertersService.findOne(
      inverter.id,
    );

    return new InverterResponseDto({
      ...updatedInverterWithPlant,
      plantName: updatedInverterWithPlant.plant?.name,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an inverter by its internal ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric internal ID of the inverter to remove',
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'The inverter was successfully removed.',
  })
  @ApiResponse({ status: 404, description: 'Inverter not found for removal.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.invertersService.remove(id);
  }
}

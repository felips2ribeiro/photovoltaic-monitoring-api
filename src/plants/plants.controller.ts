import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantResponseDto } from './dto/plant-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('plants')
@Controller('plants')
@UseInterceptors(ClassSerializerInterceptor)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new power plant' })
  @ApiResponse({
    status: 201,
    description: 'The power plant was successfully created.',
    type: PlantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'A power plant with this name already exists.',
  })
  async create(
    @Body() createPlantDto: CreatePlantDto,
  ): Promise<PlantResponseDto> {
    const plant = await this.plantsService.create(createPlantDto);
    return new PlantResponseDto(plant);
  }

  @Get()
  @ApiOperation({ summary: 'Get all power plants' })
  @ApiResponse({
    status: 200,
    description: 'List of all registered power plants.',
    type: [PlantResponseDto],
  })
  async findAll(): Promise<PlantResponseDto[]> {
    const plants = await this.plantsService.findAll();
    return plants.map((plant) => new PlantResponseDto(plant));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific power plant by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric ID of the power plant to retrieve',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed information about the power plant.',
    type: PlantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Power plant not found for the provided ID.',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlantResponseDto> {
    const plant = await this.plantsService.findOne(id);
    return new PlantResponseDto(plant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing power plant' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric ID of the power plant to update',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'The power plant was successfully updated.',
    type: PlantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data for update.' })
  @ApiResponse({
    status: 404,
    description: 'Power plant not found for update.',
  })
  @ApiResponse({
    status: 409,
    description: 'Name conflict when trying to update the power plant.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlantDto: UpdatePlantDto,
  ): Promise<PlantResponseDto> {
    const plant = await this.plantsService.update(id, updatePlantDto);
    return new PlantResponseDto(plant);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a power plant by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Numeric ID of the power plant to remove',
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'The power plant was successfully removed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Power plant not found for removal.',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.plantsService.remove(id);
  }
}

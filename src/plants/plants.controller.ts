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
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Plant } from './entities/plant.entity';

@ApiTags('plants')
@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new power plant' })
  @ApiResponse({
    status: 201,
    description: 'The plant has been successfully created.',
    type: Plant,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Plant name already exists.',
  })
  create(@Body() createPlantDto: CreatePlantDto) {
    return this.plantsService.create(createPlantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all power plants' })
  @ApiResponse({
    status: 200,
    description: 'List of all plants.',
    type: [Plant],
  })
  findAll() {
    return this.plantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a power plant by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the plant to retrieve',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'The plant data.', type: Plant })
  @ApiResponse({ status: 404, description: 'Plant not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a power plant by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the plant to update',
    type: Number,
  })
  @ApiBody({ type: UpdatePlantDto })
  @ApiResponse({
    status: 200,
    description: 'The plant has been successfully updated.',
    type: Plant,
  })
  @ApiResponse({ status: 404, description: 'Plant not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict. New plant name already exists.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlantDto: UpdatePlantDto,
  ) {
    return this.plantsService.update(id, updatePlantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a power plant by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the plant to delete',
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'The plant has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Plant not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.plantsService.remove(id);
  }
}

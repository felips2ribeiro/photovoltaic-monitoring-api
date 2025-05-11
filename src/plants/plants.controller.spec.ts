import { Test, TestingModule } from '@nestjs/testing';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { Plant } from './entities/plant.entity';
import { PlantResponseDto } from './dto/plant-response.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPlantsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('PlantsController', () => {
  let controller: PlantsController;

  const mockPlantEntity: Plant = {
    id: 1,
    name: 'Usina Teste Entidade',
    inverters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlantsController],
      providers: [
        {
          provide: PlantsService,
          useValue: mockPlantsService,
        },
      ],
    }).compile();

    controller = module.get<PlantsController>(PlantsController);

    mockPlantsService.create.mockClear();
    mockPlantsService.findAll.mockClear();
    mockPlantsService.findOne.mockClear();
    mockPlantsService.update.mockClear();
    mockPlantsService.remove.mockClear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return a PlantResponseDto', async () => {
      const createPlantDto: CreatePlantDto = { name: 'Nova Usina' };
      const serviceResultEntity: Plant = {
        ...mockPlantEntity,
        ...createPlantDto,
        id: 2,
      };
      mockPlantsService.create.mockResolvedValue(serviceResultEntity);

      const result = await controller.create(createPlantDto);

      expect(mockPlantsService.create).toHaveBeenCalledWith(createPlantDto);
      expect(result).toBeInstanceOf(PlantResponseDto);
      expect(result.id).toEqual(serviceResultEntity.id);
      expect(result.name).toEqual(serviceResultEntity.name);
      expect(result.createdAt).toEqual(serviceResultEntity.createdAt);
    });

    it('should propagate ConflictException from service', async () => {
      const createPlantDto: CreatePlantDto = { name: 'Usina Conflitante' };
      mockPlantsService.create.mockRejectedValue(
        new ConflictException('Test conflict'),
      );

      await expect(controller.create(createPlantDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPlantsService.create).toHaveBeenCalledWith(createPlantDto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return an array of PlantResponseDto', async () => {
      const serviceResultEntities: Plant[] = [mockPlantEntity];
      mockPlantsService.findAll.mockResolvedValue(serviceResultEntities);

      const result = await controller.findAll();

      expect(mockPlantsService.findAll).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBeInstanceOf(PlantResponseDto);
      expect(result[0].id).toEqual(serviceResultEntities[0].id);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return a PlantResponseDto', async () => {
      const plantId = 1;
      mockPlantsService.findOne.mockResolvedValue(mockPlantEntity);

      const result = await controller.findOne(plantId);

      expect(mockPlantsService.findOne).toHaveBeenCalledWith(plantId);
      expect(result).toBeInstanceOf(PlantResponseDto);
      expect(result.id).toEqual(mockPlantEntity.id);
    });

    it('should propagate NotFoundException from service', async () => {
      const plantId = 999;
      mockPlantsService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(plantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should call service.update and return an updated PlantResponseDto', async () => {
      const plantId = 1;
      const updatePlantDto: UpdatePlantDto = { name: 'Usina Atualizada' };
      const serviceResultEntity: Plant = {
        ...mockPlantEntity,
        ...updatePlantDto,
      };
      mockPlantsService.update.mockResolvedValue(serviceResultEntity);

      const result = await controller.update(plantId, updatePlantDto);

      expect(mockPlantsService.update).toHaveBeenCalledWith(
        plantId,
        updatePlantDto,
      );
      expect(result).toBeInstanceOf(PlantResponseDto);
      expect(result.name).toEqual(updatePlantDto.name);
    });

    it('should propagate NotFoundException from service', async () => {
      const plantId = 1;
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Ruim' };
      mockPlantsService.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update(plantId, updatePlantDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and not throw an error on success', async () => {
      const plantId = 1;
      mockPlantsService.remove.mockResolvedValue(undefined);

      await expect(controller.remove(plantId)).resolves.toBeUndefined();
      expect(mockPlantsService.remove).toHaveBeenCalledWith(plantId);
    });

    it('should propagate NotFoundException from service during remove', async () => {
      const plantId = 999;
      mockPlantsService.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove(plantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

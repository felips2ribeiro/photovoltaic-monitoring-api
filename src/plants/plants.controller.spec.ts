import { Test, TestingModule } from '@nestjs/testing';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { Plant } from './entities/plant.entity';
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
    name: 'Usina Teste Controller',
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
    it('should call service.create and return the created plant', async () => {
      const createPlantDto: CreatePlantDto = {
        name: 'Nova Usina via Controller',
      };
      const expectedResult = { ...mockPlantEntity, ...createPlantDto };

      mockPlantsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createPlantDto);

      expect(mockPlantsService.create).toHaveBeenCalledWith(createPlantDto);
      expect(result).toEqual(expectedResult);
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
    it('should call service.findAll and return an array of plants', async () => {
      const expectedResult = [mockPlantEntity];
      mockPlantsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(mockPlantsService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and return a plant', async () => {
      const plantId = 1;
      mockPlantsService.findOne.mockResolvedValue(mockPlantEntity);

      const result = await controller.findOne(plantId);

      expect(mockPlantsService.findOne).toHaveBeenCalledWith(plantId);
      expect(result).toEqual(mockPlantEntity);
    });

    it('should propagate NotFoundException from service', async () => {
      const plantId = 999;
      mockPlantsService.findOne.mockRejectedValue(
        new NotFoundException('Test not found'),
      );

      await expect(controller.findOne(plantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlantsService.findOne).toHaveBeenCalledWith(plantId);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto, and return the updated plant', async () => {
      const plantId = 1;
      const updatePlantDto: UpdatePlantDto = {
        name: 'Usina Atualizada via Controller',
      };
      const expectedResult = { ...mockPlantEntity, ...updatePlantDto };

      mockPlantsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(plantId, updatePlantDto);

      expect(mockPlantsService.update).toHaveBeenCalledWith(
        plantId,
        updatePlantDto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate exceptions from service during update', async () => {
      const plantId = 1;
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Ruim' };
      mockPlantsService.update.mockRejectedValue(
        new NotFoundException('Test update not found'),
      );

      await expect(controller.update(plantId, updatePlantDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlantsService.update).toHaveBeenCalledWith(
        plantId,
        updatePlantDto,
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
      mockPlantsService.remove.mockRejectedValue(
        new NotFoundException('Test remove not found'),
      );

      await expect(controller.remove(plantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPlantsService.remove).toHaveBeenCalledWith(plantId);
    });
  });
});

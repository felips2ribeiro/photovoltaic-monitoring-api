import { Test, TestingModule } from '@nestjs/testing';
import { PlantsService } from './plants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Plant } from './entities/plant.entity';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

type MockedQueryBuilder<T extends ObjectLiteral> = Pick<
  SelectQueryBuilder<T>,
  'where' | 'andWhere' | 'getOne' | 'getMany'
>;

type MockPlantRepository = jest.Mocked<
  Pick<
    Repository<Plant>,
    'findOneBy' | 'create' | 'save' | 'find' | 'findOne' | 'preload' | 'remove'
  >
> & {
  createQueryBuilder: jest.Mock<
    jest.Mocked<MockedQueryBuilder<Plant>>,
    [string?]
  >;
  _mockQueryBuilder: jest.Mocked<MockedQueryBuilder<Plant>>;
};

const createMockPlantRepository = (): MockPlantRepository => {
  const mockQb: jest.Mocked<MockedQueryBuilder<Plant>> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  return {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQb),
    _mockQueryBuilder: mockQb,
  };
};

describe('PlantsService', () => {
  let service: PlantsService;
  let plantRepository: MockPlantRepository;

  const mockPlant: Plant = {
    id: 1,
    name: 'Usina Solar Teste',
    inverters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantsService,
        {
          provide: getRepositoryToken(Plant),
          useValue: createMockPlantRepository(),
        },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
    plantRepository = module.get<MockPlantRepository>(
      getRepositoryToken(Plant),
    );

    plantRepository.createQueryBuilder.mockClear();
    plantRepository._mockQueryBuilder.where.mockClear().mockReturnThis();
    plantRepository._mockQueryBuilder.getOne.mockClear();
    plantRepository.preload.mockClear();
    plantRepository.save.mockClear();
    plantRepository.findOneBy.mockClear();
    plantRepository.findOne.mockClear();
    plantRepository.find.mockClear();
    plantRepository.create.mockClear();
    plantRepository.remove.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a plant', async () => {
      const createPlantDto: CreatePlantDto = { name: 'Nova Usina' };
      plantRepository.findOneBy.mockResolvedValue(null);
      plantRepository.create.mockReturnValue(mockPlant);
      plantRepository.save.mockResolvedValue(mockPlant);

      const result = await service.create(createPlantDto);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        name: createPlantDto.name,
      });
      expect(plantRepository.create).toHaveBeenCalledWith(createPlantDto);
      expect(plantRepository.save).toHaveBeenCalledWith(mockPlant);
      expect(result).toEqual(mockPlant);
    });

    it('should throw a ConflictException if plant name already exists', async () => {
      const createPlantDto: CreatePlantDto = { name: 'Usina Existente' };
      plantRepository.findOneBy.mockResolvedValue(mockPlant);

      await expect(service.create(createPlantDto)).rejects.toThrow(
        ConflictException,
      );
      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        name: createPlantDto.name,
      });
    });
  });
  describe('findAll', () => {
    it('should return an array of plants', async () => {
      const plantsArray = [
        mockPlant,
        { ...mockPlant, id: 2, name: 'Outra Usina' } as Plant,
      ];
      plantRepository.find.mockResolvedValue(plantsArray);

      const result = await service.findAll();
      expect(result).toEqual(plantsArray);
      expect(plantRepository.find).toHaveBeenCalledWith({
        relations: ['inverters'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a single plant if found', async () => {
      plantRepository.findOne.mockResolvedValue(mockPlant);

      const result = await service.findOne(mockPlant.id);
      expect(result).toEqual(mockPlant);
      expect(plantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPlant.id },
        relations: ['inverters'],
      });
    });

    it('should throw a NotFoundException if plant is not found', async () => {
      plantRepository.findOne.mockResolvedValue(null);
      const nonExistentId = 999;

      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      expect(plantRepository.findOne).toHaveBeenCalledWith({
        where: { id: nonExistentId },
        relations: ['inverters'],
      });
    });
  });

  describe('update', () => {
    it('should update and return a plant when name is different and not conflicting', async () => {
      const updatePlantDto: UpdatePlantDto = { name: 'Usina Atualizada' };
      const plantAsInDb = { ...mockPlant, name: 'Nome Antigo No Banco' };

      const preloadedPlant = { ...plantAsInDb, ...updatePlantDto };
      const savedPlant = { ...preloadedPlant };

      plantRepository.findOneBy.mockResolvedValue(plantAsInDb);
      plantRepository.preload.mockResolvedValue(preloadedPlant);
      plantRepository.save.mockResolvedValue(savedPlant);
      plantRepository._mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.update(mockPlant.id, updatePlantDto);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: mockPlant.id,
      });
      expect(plantRepository.createQueryBuilder).toHaveBeenCalledWith('plant');
      expect(plantRepository._mockQueryBuilder.where).toHaveBeenCalledWith(
        'plant.name = :name AND plant.id != :id',
        { name: updatePlantDto.name, id: mockPlant.id },
      );
      expect(plantRepository._mockQueryBuilder.getOne).toHaveBeenCalledTimes(1);
      expect(plantRepository.preload).toHaveBeenCalledWith({
        id: mockPlant.id,
        ...updatePlantDto,
      });
      expect(plantRepository.save).toHaveBeenCalledWith(preloadedPlant);
      expect(result).toEqual(savedPlant);
    });

    it('should update and return a plant if name in DTO is the same as current name', async () => {
      const plantAsInDb = { ...mockPlant, id: 1, name: 'Nome Identico' };
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Identico' };
      const preloadedPlant = { ...plantAsInDb, ...updatePlantDto };
      const savedPlant = { ...preloadedPlant };

      plantRepository.findOneBy.mockResolvedValue(plantAsInDb);
      plantRepository.preload.mockResolvedValue(preloadedPlant);
      plantRepository.save.mockResolvedValue(savedPlant);

      const result = await service.update(plantAsInDb.id, updatePlantDto);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: plantAsInDb.id,
      });
      expect(plantRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(plantRepository.preload).toHaveBeenCalledWith({
        id: plantAsInDb.id,
        ...updatePlantDto,
      });
      expect(plantRepository.save).toHaveBeenCalledWith(preloadedPlant);
      expect(result).toEqual(savedPlant);
    });

    it('should throw NotFoundException if plant to update is not found by findOneBy', async () => {
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Qualquer' };
      plantRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, updatePlantDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(plantRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(plantRepository.preload).not.toHaveBeenCalled();
      expect(plantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if updated name already exists for another plant', async () => {
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Conflitante' };
      const plantAsInDb = {
        ...mockPlant,
        id: 1,
        name: 'Nome Original No Banco',
      };
      const conflictingPlant = { id: 2, name: 'Nome Conflitante' } as Plant;

      plantRepository.findOneBy.mockResolvedValue(plantAsInDb);
      plantRepository._mockQueryBuilder.getOne.mockResolvedValue(
        conflictingPlant,
      );

      await expect(
        service.update(plantAsInDb.id, updatePlantDto),
      ).rejects.toThrow(ConflictException);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: plantAsInDb.id,
      });
      expect(plantRepository.createQueryBuilder).toHaveBeenCalledWith('plant');
      expect(plantRepository._mockQueryBuilder.where).toHaveBeenCalledWith(
        'plant.name = :name AND plant.id != :id',
        { name: updatePlantDto.name, id: plantAsInDb.id },
      );
      expect(plantRepository._mockQueryBuilder.getOne).toHaveBeenCalledTimes(1);
      expect(plantRepository.preload).not.toHaveBeenCalled();
      expect(plantRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should call remove on the repository if plant is found', async () => {
      plantRepository.findOne.mockResolvedValue(mockPlant);
      plantRepository.remove.mockResolvedValue(mockPlant);

      await service.remove(mockPlant.id);

      expect(plantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPlant.id },
        relations: ['inverters'],
      });
      expect(plantRepository.remove).toHaveBeenCalledWith(mockPlant);
    });

    it('should throw NotFoundException if plant to remove is not found', async () => {
      plantRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(plantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['inverters'],
      });
    });
  });
});

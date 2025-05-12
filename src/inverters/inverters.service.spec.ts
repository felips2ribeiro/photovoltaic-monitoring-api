import { Test, TestingModule } from '@nestjs/testing';
import { InvertersService } from './inverters.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inverter } from './entities/inverter.entity';
import { Plant } from '../plants/entities/plant.entity';
import { Repository } from 'typeorm';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

type MockInverterRepository = jest.Mocked<
  Pick<
    Repository<Inverter>,
    | 'findOneBy'
    | 'create'
    | 'save'
    | 'find'
    | 'findOne'
    | 'preload'
    | 'remove'
    | 'createQueryBuilder'
  >
>;

type MockPlantRepository = jest.Mocked<Pick<Repository<Plant>, 'findOneBy'>>;

const createMockInverterRepository = (): MockInverterRepository => {
  return {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as MockInverterRepository;
};

const createMockPlantRepository = (): MockPlantRepository => {
  return {
    findOneBy: jest.fn(),
  } as unknown as MockPlantRepository;
};

describe('InvertersService', () => {
  let service: InvertersService;
  let inverterRepository: MockInverterRepository;
  let plantRepository: MockPlantRepository;

  const mockPlant: Plant = {
    id: 1,
    name: 'Usina Mãe',
    inverters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInverterEntity: Inverter = {
    id: 1,
    externalId: 101,
    name: 'Inversor Alpha',
    plantId: mockPlant.id,
    plant: mockPlant,
    metrics: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvertersService,
        {
          provide: getRepositoryToken(Inverter),
          useValue: createMockInverterRepository(),
        },
        {
          provide: getRepositoryToken(Plant),
          useValue: createMockPlantRepository(),
        },
      ],
    }).compile();

    service = module.get<InvertersService>(InvertersService);
    inverterRepository = module.get<MockInverterRepository>(
      getRepositoryToken(Inverter),
    );
    plantRepository = module.get<MockPlantRepository>(
      getRepositoryToken(Plant),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createInverterDto: CreateInverterDto = {
      name: 'Novo Inversor',
      externalId: 102,
      plantId: mockPlant.id,
    };

    it('should create and return an inverter if plant exists and externalId is unique', async () => {
      plantRepository.findOneBy.mockResolvedValue(mockPlant);
      inverterRepository.findOneBy.mockResolvedValue(null);

      const createdInverterData = {
        name: createInverterDto.name,
        externalId: createInverterDto.externalId,
        plantId: createInverterDto.plantId,
        plant: mockPlant,
      };
      const savedInverterEntity = {
        ...mockInverterEntity,
        ...createdInverterData,
        id: 2,
      };

      inverterRepository.create.mockReturnValue(savedInverterEntity);
      inverterRepository.save.mockResolvedValue(savedInverterEntity);

      const result = await service.create(createInverterDto);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: createInverterDto.plantId,
      });
      expect(inverterRepository.findOneBy).toHaveBeenCalledWith({
        externalId: createInverterDto.externalId,
      });
      expect(inverterRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createInverterDto.name,
          externalId: createInverterDto.externalId,
          plantId: createInverterDto.plantId,
          plant: mockPlant,
        }),
      );
      expect(inverterRepository.save).toHaveBeenCalledWith(savedInverterEntity);
      expect(result).toEqual(savedInverterEntity);
    });

    it('should throw BadRequestException if plantId does not exist', async () => {
      plantRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(createInverterDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: createInverterDto.plantId,
      });
      expect(inverterRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if externalId already exists', async () => {
      plantRepository.findOneBy.mockResolvedValue(mockPlant);
      inverterRepository.findOneBy.mockResolvedValue(mockInverterEntity);

      await expect(service.create(createInverterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(inverterRepository.findOneBy).toHaveBeenCalledWith({
        externalId: createInverterDto.externalId,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of inverters with their plants', async () => {
      const invertersArray = [mockInverterEntity];
      inverterRepository.find.mockResolvedValue(invertersArray);

      const result = await service.findAll();

      expect(inverterRepository.find).toHaveBeenCalledWith({
        relations: { plant: true },
      });
      expect(result).toEqual(invertersArray);
    });

    it('should return an array of inverters filtered by plantId', async () => {
      const targetPlantId = mockPlant.id;
      const filteredInvertersArray = [mockInverterEntity];
      inverterRepository.find.mockResolvedValue(filteredInvertersArray);

      const result = await service.findAll(targetPlantId);

      expect(inverterRepository.find).toHaveBeenCalledWith({
        where: { plantId: targetPlantId },
        relations: { plant: true },
      });
      expect(result).toEqual(filteredInvertersArray);
    });
  });

  describe('findOne', () => {
    it('should return a single inverter with its plant if found', async () => {
      inverterRepository.findOne.mockResolvedValue(mockInverterEntity);
      const inverterId = mockInverterEntity.id;

      const result = await service.findOne(inverterId);

      expect(inverterRepository.findOne).toHaveBeenCalledWith({
        where: { id: inverterId },
        relations: { plant: true },
      });
      expect(result).toEqual(mockInverterEntity);
    });

    it('should throw NotFoundException if inverter is not found', async () => {
      inverterRepository.findOne.mockResolvedValue(null);
      const inverterId = 999;

      await expect(service.findOne(inverterId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByExternalId', () => {
    it('should return an inverter if found by externalId', async () => {
      const externalId = mockInverterEntity.externalId;
      inverterRepository.findOne.mockResolvedValue(mockInverterEntity);

      const result = await service.findByExternalId(externalId);

      expect(inverterRepository.findOne).toHaveBeenCalledWith({
        where: { externalId: externalId },
        relations: { plant: true },
      });
      expect(result).toEqual(mockInverterEntity);
    });

    it('should return null if inverter is not found by externalId', async () => {
      const externalId = 9999;
      inverterRepository.findOne.mockResolvedValue(null);

      const result = await service.findByExternalId(externalId);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const inverterId = mockInverterEntity.id;
    const baseUpdateDto: UpdateInverterDto = {
      name: 'Inversor Atualizado Delta',
    };

    const originalInverter = { ...mockInverterEntity };

    it('should update and return an inverter if found and valid data (name change only)', async () => {
      const preloadedInverter = { ...originalInverter, ...baseUpdateDto };
      const savedInverter = { ...preloadedInverter };

      inverterRepository.findOneBy.mockResolvedValue(originalInverter);
      inverterRepository.preload.mockResolvedValue(preloadedInverter);
      inverterRepository.save.mockResolvedValue(savedInverter);

      const result = await service.update(inverterId, baseUpdateDto);

      expect(inverterRepository.findOneBy).toHaveBeenCalledWith({
        id: inverterId,
      });
      expect(inverterRepository.preload).toHaveBeenCalledWith({
        id: inverterId,
        ...baseUpdateDto,
      });
      expect(inverterRepository.save).toHaveBeenCalledWith(preloadedInverter);
      expect(result).toEqual(savedInverter);
    });

    it('should throw NotFoundException if inverter to update is not found', async () => {
      inverterRepository.findOneBy.mockResolvedValue(null);
      await expect(service.update(999, baseUpdateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate and update plantId if provided and plant exists', async () => {
      const newPlantId = 2;
      const newPlant = { ...mockPlant, id: newPlantId, name: 'Nova Usina' };
      const dtoWithNewPlant: UpdateInverterDto = {
        ...baseUpdateDto,
        plantId: newPlantId,
      };
      const preloadedWithNewPlant = { ...originalInverter, ...dtoWithNewPlant };
      const savedWithNewPlant = { ...preloadedWithNewPlant };

      inverterRepository.findOneBy.mockResolvedValue(originalInverter);
      plantRepository.findOneBy.mockResolvedValue(newPlant);
      inverterRepository.preload.mockResolvedValue(preloadedWithNewPlant);
      inverterRepository.save.mockResolvedValue(savedWithNewPlant);

      const result = await service.update(inverterId, dtoWithNewPlant);

      expect(plantRepository.findOneBy).toHaveBeenCalledWith({
        id: newPlantId,
      });
      expect(result.plantId).toEqual(newPlantId);
    });

    it('should throw BadRequestException if new plantId does not exist', async () => {
      const dtoWithInvalidPlant: UpdateInverterDto = {
        ...baseUpdateDto,
        plantId: 999,
      };
      inverterRepository.findOneBy.mockResolvedValue(originalInverter);
      plantRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(inverterId, dtoWithInvalidPlant),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate and update externalId if provided and not conflicting', async () => {
      const newExternalId = 202;
      const dtoWithNewExternalId: UpdateInverterDto = {
        ...baseUpdateDto,
        externalId: newExternalId,
      };
      const preloadedWithNewExtId = {
        ...originalInverter,
        ...dtoWithNewExternalId,
      };
      const savedWithNewExtId = { ...preloadedWithNewExtId };

      inverterRepository.findOneBy.mockResolvedValueOnce(originalInverter);
      inverterRepository.findOneBy.mockResolvedValueOnce(null);
      inverterRepository.preload.mockResolvedValue(preloadedWithNewExtId);
      inverterRepository.save.mockResolvedValue(savedWithNewExtId);

      const result = await service.update(inverterId, dtoWithNewExternalId);
      expect(result.externalId).toEqual(newExternalId);
    });

    it('should throw ConflictException if new externalId conflicts with another inverter', async () => {
      const newExternalId = 202;
      const conflictingInverter = {
        ...mockInverterEntity,
        id: 50,
        externalId: newExternalId,
      };
      const dtoWithConflictingExternalId: UpdateInverterDto = {
        ...baseUpdateDto,
        externalId: newExternalId,
      };

      inverterRepository.findOneBy.mockResolvedValueOnce(originalInverter);
      inverterRepository.findOneBy.mockResolvedValueOnce(conflictingInverter);

      await expect(
        service.update(inverterId, dtoWithConflictingExternalId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if preload fails', async () => {
      inverterRepository.findOneBy.mockResolvedValue(originalInverter);
      inverterRepository.preload.mockResolvedValue(undefined);

      await expect(service.update(inverterId, baseUpdateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove the inverter if found', async () => {
      inverterRepository.findOne.mockResolvedValue(mockInverterEntity);
      inverterRepository.remove.mockResolvedValue(mockInverterEntity);

      await service.remove(mockInverterEntity.id);

      expect(inverterRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockInverterEntity.id },
        relations: { plant: true },
      });
      expect(inverterRepository.remove).toHaveBeenCalledWith(
        mockInverterEntity,
      );
    });

    it('should throw NotFoundException if inverter to remove is not found', async () => {
      inverterRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

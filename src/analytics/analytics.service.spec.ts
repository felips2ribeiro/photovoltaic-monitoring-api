import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { Inverter } from '../inverters/entities/inverter.entity';
import { Plant } from '../plants/entities/plant.entity';
import { ObjectLiteral, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EnergyGenerationResponseDto } from './dto/energy-generation-response.dto';

interface MockQueryBuilderMethods {
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  getRawMany: jest.Mock;
}

type MockRepository<T extends ObjectLiteral = any> = {
  [K in keyof Repository<T>]?: jest.Mock;
} & {
  createQueryBuilder: jest.Mock<MockQueryBuilderMethods, [string?]>;
};

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => {
  const mockQbMethods: MockQueryBuilderMethods = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  return {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQbMethods),
  } as any as MockRepository<T>;
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let metricRepository: MockRepository<Metric>;
  let inverterRepository: MockRepository<Inverter>;
  let plantRepository: MockRepository<Plant>;
  let mockQueryBuilder: MockQueryBuilderMethods;

  const mockInverter: Pick<Inverter, 'id'> = { id: 1 };
  const mockPlant: Pick<Plant, 'id' | 'name'> = { id: 1, name: 'Test Plant' };
  const mockInverter1ForPlant: Pick<Inverter, 'id'> = { id: 10 };
  const mockInverter2ForPlant: Pick<Inverter, 'id'> = { id: 11 };

  const mockPlantEntityWithInverters: Plant = {
    ...mockPlant,
    id: mockPlant.id,
    inverters: [
      mockInverter1ForPlant as Inverter,
      mockInverter2ForPlant as Inverter,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockPlantEntityNoInverters: Plant = {
    ...mockPlant,
    id: 2,
    name: 'Plant No Inverters',
    inverters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const startDate = new Date('2023-01-15T00:00:00Z');
  const endDate = new Date('2023-01-16T23:59:59Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Metric),
          useValue: createMockRepository<Metric>(),
        },
        {
          provide: getRepositoryToken(Inverter),
          useValue: createMockRepository<Inverter>(),
        },
        {
          provide: getRepositoryToken(Plant),
          useValue: createMockRepository<Plant>(),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    metricRepository = module.get(getRepositoryToken(Metric));
    inverterRepository = module.get(getRepositoryToken(Inverter));
    plantRepository = module.get(getRepositoryToken(Plant));

    mockQueryBuilder =
      metricRepository.createQueryBuilder() as unknown as MockQueryBuilderMethods;

    (metricRepository.createQueryBuilder as jest.Mock).mockClear();
    (inverterRepository.findOneBy as jest.Mock)?.mockClear();
    (plantRepository.findOne as jest.Mock)?.mockClear();
    (metricRepository.find as jest.Mock)?.mockClear();

    mockQueryBuilder.select.mockClear().mockReturnThis();
    mockQueryBuilder.addSelect.mockClear().mockReturnThis();
    mockQueryBuilder.where.mockClear().mockReturnThis();
    mockQueryBuilder.andWhere.mockClear().mockReturnThis();
    mockQueryBuilder.groupBy.mockClear().mockReturnThis();
    mockQueryBuilder.orderBy.mockClear().mockReturnThis();
    mockQueryBuilder.getRawMany.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMaxPowerByDay', () => {
    it('should return daily max power', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockInverter as Inverter,
      );
      const rawQueryResult = [{ day: '2023-01-15', maxActivePower: '500.50' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResult);

      const result = await service.getMaxPowerByDay(
        mockInverter.id,
        startDate,
        endDate,
      );

      expect(metricRepository.createQueryBuilder).toHaveBeenCalledWith(
        'metric',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "strftime('%Y-%m-%d', metric.timestamp)",
        'day',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'MAX(metric.activePower)',
        'maxActivePower',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'metric.inverterId = :inverterId',
        { inverterId: mockInverter.id },
      );
      const expectedEndDateString = new Date(endDate);
      expectedEndDateString.setHours(23, 59, 59, 999);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp <= :adjustedEndDate',
        { adjustedEndDate: expectedEndDateString.toISOString() },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.activePower IS NOT NULL',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('day');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('day', 'ASC');
      expect(result).toEqual([{ day: '2023-01-15', maxActivePower: 500.5 }]);
    });

    it('should throw NotFoundException if inverter not found', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getMaxPowerByDay(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if date range is invalid', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockInverter as Inverter,
      );
      await expect(
        service.getMaxPowerByDay(mockInverter.id, endDate, startDate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAverageTemperatureByDay', () => {
    it('should return daily average temperature', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockInverter as Inverter,
      );
      const rawQueryResult = [
        { day: '2023-01-15', averageTemperature: '25.50' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResult);

      const result = await service.getAverageTemperatureByDay(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(metricRepository.createQueryBuilder).toHaveBeenCalledWith(
        'metric',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'AVG(metric.temperature)',
        'averageTemperature',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.temperature IS NOT NULL',
      );
      expect(result).toEqual([{ day: '2023-01-15', averageTemperature: 25.5 }]);
    });
    it('should throw NotFoundException if inverter not found', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getAverageTemperatureByDay(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInverterEnergyGeneration', () => {
    const mockMetrics: Partial<Metric>[] = [
      {
        timestamp: new Date(startDate.getTime() + 1000 * 60 * 10),
        activePower: 1000,
      },
      {
        timestamp: new Date(startDate.getTime() + 1000 * 60 * 20),
        activePower: 2000,
      },
    ];
    it('should calculate inverter energy generation', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockInverter as Inverter,
      );
      (metricRepository.find as jest.Mock).mockResolvedValue(
        mockMetrics as Metric[],
      );

      const result = await service.getInverterEnergyGeneration(
        mockInverter.id,
        startDate,
        endDate,
      );
      const expectedGenerationWh = parseFloat(
        (((1000 + 2000) / 2) * (10 / 60)).toFixed(3),
      );
      expect(result.totalGenerationWh).toBeCloseTo(expectedGenerationWh, 3);
      expect(result.entityId).toEqual(mockInverter.id);
      expect(result.entityType).toEqual('inverter');
    });
    it('should return 0 generation if less than 2 metrics found', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(
        mockInverter as Inverter,
      );
      (metricRepository.find as jest.Mock).mockResolvedValue([
        mockMetrics[0],
      ] as Metric[]);
      const result = await service.getInverterEnergyGeneration(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(result.totalGenerationWh).toEqual(0);
    });
    it('should throw NotFoundException if inverter not found', async () => {
      (inverterRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getInverterEnergyGeneration(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlantEnergyGeneration', () => {
    it('should return total generation for a plant with inverters', async () => {
      (plantRepository.findOne as jest.Mock).mockResolvedValue(
        mockPlantEntityWithInverters,
      );
      const getInverterGenerationSpy = jest.spyOn(
        service,
        'getInverterEnergyGeneration',
      );

      getInverterGenerationSpy
        .mockResolvedValueOnce(
          new EnergyGenerationResponseDto({
            totalGenerationWh: 100,
            startDate,
            endDate,
            entityId: mockInverter1ForPlant.id,
            entityType: 'inverter',
          }),
        )
        .mockResolvedValueOnce(
          new EnergyGenerationResponseDto({
            totalGenerationWh: 150,
            startDate,
            endDate,
            entityId: mockInverter2ForPlant.id,
            entityType: 'inverter',
          }),
        );

      const result = await service.getPlantEnergyGeneration(
        mockPlantEntityWithInverters.id,
        startDate,
        endDate,
      );

      expect(plantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPlantEntityWithInverters.id },
        relations: { inverters: true },
      });
      expect(getInverterGenerationSpy).toHaveBeenCalledTimes(2);
      expect(result.totalGenerationWh).toEqual(250);
      expect(result.entityId).toEqual(mockPlantEntityWithInverters.id);
      expect(result.entityType).toEqual('plant');
      getInverterGenerationSpy.mockRestore();
    });

    it('should return 0 generation if plant has no inverters', async () => {
      (plantRepository.findOne as jest.Mock).mockResolvedValue(
        mockPlantEntityNoInverters,
      );
      const getInverterGenerationSpy = jest.spyOn(
        service,
        'getInverterEnergyGeneration',
      );
      const result = await service.getPlantEnergyGeneration(
        mockPlantEntityNoInverters.id,
        startDate,
        endDate,
      );
      expect(getInverterGenerationSpy).not.toHaveBeenCalled();
      expect(result.totalGenerationWh).toEqual(0);
      getInverterGenerationSpy.mockRestore();
    });

    it('should throw NotFoundException if plant is not found', async () => {
      (plantRepository.findOne as jest.Mock).mockResolvedValue(null);
      const getInverterGenerationSpy = jest.spyOn(
        service,
        'getInverterEnergyGeneration',
      );
      await expect(
        service.getPlantEnergyGeneration(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
      expect(getInverterGenerationSpy).not.toHaveBeenCalled();
      getInverterGenerationSpy.mockRestore();
    });
  });
});

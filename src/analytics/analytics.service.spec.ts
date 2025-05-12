import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Metric } from '../metrics/entities/metric.entity';
import { Inverter } from '../inverters/entities/inverter.entity';

import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

type MockedSelectQueryBuilder<T extends ObjectLiteral> = jest.Mocked<
  Pick<
    SelectQueryBuilder<T>,
    | 'select'
    | 'addSelect'
    | 'where'
    | 'andWhere'
    | 'groupBy'
    | 'orderBy'
    | 'getRawMany'
  >
>;

type MockMetricRepository = jest.Mocked<
  Pick<Repository<Metric>, 'createQueryBuilder'>
> & {
  createQueryBuilder: jest.Mock<MockedSelectQueryBuilder<Metric>, [string?]>;
};

type MockInverterRepository = jest.Mocked<
  Pick<Repository<Inverter>, 'findOneBy'>
>;

const createMockMetricRepository = (): MockMetricRepository => {
  const mockQbInstance: MockedSelectQueryBuilder<Metric> = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  return {
    createQueryBuilder: jest.fn(() => mockQbInstance),
  } as unknown as MockMetricRepository;
};

const createMockInverterRepository = (): MockInverterRepository => {
  return {
    findOneBy: jest.fn(),
  } as unknown as MockInverterRepository;
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let metricRepository: MockMetricRepository;
  let inverterRepository: MockInverterRepository;
  let mockQueryBuilder: MockedSelectQueryBuilder<Metric>;

  const mockInverter: Pick<Inverter, 'id' | 'externalId' | 'name' | 'plantId'> =
    {
      id: 1,
      externalId: 101,
      name: 'Test Inverter',
      plantId: 1,
    };

  const startDate = new Date('2023-01-15T00:00:00Z');
  const endDate = new Date('2023-01-16T23:59:59Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Metric),
          useValue: createMockMetricRepository(),
        },
        {
          provide: getRepositoryToken(Inverter),
          useValue: createMockInverterRepository(),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    metricRepository = module.get<MockMetricRepository>(
      getRepositoryToken(Metric),
    );
    inverterRepository = module.get<MockInverterRepository>(
      getRepositoryToken(Inverter),
    );

    mockQueryBuilder =
      metricRepository.createQueryBuilder() as unknown as MockedSelectQueryBuilder<Metric>;

    inverterRepository.findOneBy.mockReset();

    metricRepository.createQueryBuilder.mockClear();
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
    it('should return daily max power for a valid inverter and date range', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const rawQueryResult = [
        { day: '2023-01-15', maxActivePower: '500.50' },
        { day: '2023-01-16', maxActivePower: '600.75' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResult);

      const result = await service.getMaxPowerByDay(
        mockInverter.id,
        startDate,
        endDate,
      );

      expect(inverterRepository.findOneBy).toHaveBeenCalledWith({
        id: mockInverter.id,
      });
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
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp >= :startDate',
        { startDate },
      );

      const expectedEndDateString = new Date(endDate);
      expectedEndDateString.setHours(23, 59, 59, 999);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp <= :adjustedEndDate',
        { adjustedEndDate: expectedEndDateString.toISOString() },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.activePower IS NOT NULL',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('day');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('day', 'ASC');
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();

      expect(result).toEqual([
        { day: '2023-01-15', maxActivePower: 500.5 },
        { day: '2023-01-16', maxActivePower: 600.75 },
      ]);
    });

    it('should throw NotFoundException if inverter is not found', async () => {
      inverterRepository.findOneBy.mockResolvedValue(null);
      await expect(
        service.getMaxPowerByDay(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const invalidEndDate = new Date('2023-01-14T00:00:00Z');
      await expect(
        service.getMaxPowerByDay(mockInverter.id, startDate, invalidEndDate),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return an empty array if no metrics are found in the date range', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      const result = await service.getMaxPowerByDay(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(result).toEqual([]);
    });

    it('should handle metrics with null activePower correctly (MAX should ignore them)', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const rawQueryResult = [{ day: '2023-01-15', maxActivePower: '500.00' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResult);
      await service.getMaxPowerByDay(mockInverter.id, startDate, endDate);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.activePower IS NOT NULL',
      );
    });

    it('should return maxActivePower as null if all activePower values are null for a day and MAX returns null', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const rawQueryResultWithAllNulls = [
        { day: '2023-01-15', maxActivePower: null },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResultWithAllNulls);
      const result = await service.getMaxPowerByDay(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(result[0].maxActivePower).toBeNull();
    });
  });

  describe('getAverageTemperatureByDay', () => {
    it('should return daily average temperature for a valid inverter and date range', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const rawQueryResult = [
        { day: '2023-01-15', averageTemperature: '25.50' },
        { day: '2023-01-16', averageTemperature: '28.75' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResult);

      const result = await service.getAverageTemperatureByDay(
        mockInverter.id,
        startDate,
        endDate,
      );

      expect(inverterRepository.findOneBy).toHaveBeenCalledWith({
        id: mockInverter.id,
      });
      expect(metricRepository.createQueryBuilder).toHaveBeenCalledWith(
        'metric',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "strftime('%Y-%m-%d', metric.timestamp)",
        'day',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'AVG(metric.temperature)',
        'averageTemperature',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'metric.inverterId = :inverterId',
        { inverterId: mockInverter.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp >= :startDate',
        { startDate },
      );

      const expectedEndDateString = new Date(endDate);
      expectedEndDateString.setHours(23, 59, 59, 999);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.timestamp <= :adjustedEndDate',
        expect.objectContaining({
          adjustedEndDate: expectedEndDateString.toISOString(),
        }),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.temperature IS NOT NULL',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('day');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('day', 'ASC');
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();

      expect(result).toEqual([
        { day: '2023-01-15', averageTemperature: 25.5 },
        { day: '2023-01-16', averageTemperature: 28.75 },
      ]);
    });

    it('should throw NotFoundException if inverter is not found', async () => {
      inverterRepository.findOneBy.mockResolvedValue(null);
      await expect(
        service.getAverageTemperatureByDay(999, startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const invalidEndDate = new Date('2023-01-14T00:00:00Z');
      await expect(
        service.getAverageTemperatureByDay(
          mockInverter.id,
          startDate,
          invalidEndDate,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return an empty array if no metrics with temperature are found', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getAverageTemperatureByDay(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(result).toEqual([]);
    });

    it('should return averageTemperature as null if AVG of only NULLs returns null', async () => {
      inverterRepository.findOneBy.mockResolvedValue(mockInverter as Inverter);
      const rawQueryResultWithAllNulls = [
        { day: '2023-01-15', averageTemperature: null },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rawQueryResultWithAllNulls);

      const result = await service.getAverageTemperatureByDay(
        mockInverter.id,
        startDate,
        endDate,
      );
      expect(result[0].averageTemperature).toBeNull();
    });
  });
});

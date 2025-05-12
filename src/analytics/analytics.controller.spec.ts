import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { InverterAnalyticsQueryDto } from './dto/inverter-analytics-query.dto';

import {
  DailyMaxPowerResponseDto,
  DailyMaxPowerEntryDto,
} from './dto/daily-max-power-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DailyAverageTemperatureEntryDto,
  DailyAverageTemperatureResponseDto,
} from './dto/daily-average-temperature-response.dto';
import { EnergyGenerationResponseDto } from './dto/energy-generation-response.dto';

const mockAnalyticsService = {
  getMaxPowerByDay: jest.fn(),
  getAverageTemperatureByDay: jest.fn(),
  getInverterEnergyGeneration: jest.fn(),
  getPlantEnergyGeneration: jest.fn(),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockInverterId = 1;
  const mockPlantId = 1;

  const mockDateQuery: InverterAnalyticsQueryDto = {
    data_inicio: new Date('2023-01-15T00:00:00Z'),
    data_fim: new Date('2023-01-16T23:59:59Z'),
  };

  const mockDailyMaxPowerEntries: DailyMaxPowerEntryDto[] = [
    { day: '2023-01-15', maxActivePower: 5000 },
    { day: '2023-01-16', maxActivePower: 5500 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);

    mockAnalyticsService.getMaxPowerByDay.mockClear();
    mockAnalyticsService.getAverageTemperatureByDay.mockClear();
    mockAnalyticsService.getInverterEnergyGeneration.mockClear();
    mockAnalyticsService.getPlantEnergyGeneration.mockClear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMaxPowerByDay', () => {
    it('should call analyticsService.getMaxPowerByDay and return a DailyMaxPowerResponseDto', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockResolvedValue(
        mockDailyMaxPowerEntries,
      );

      const result = await controller.getMaxPowerByDay(
        mockInverterId,
        mockDateQuery,
      );

      expect(mockAnalyticsService.getMaxPowerByDay).toHaveBeenCalledWith(
        mockInverterId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toBeInstanceOf(DailyMaxPowerResponseDto);
      expect(result.data).toEqual(mockDailyMaxPowerEntries);
    });

    it('should correctly handle empty data from service', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockResolvedValue([]);

      const result = await controller.getMaxPowerByDay(
        mockInverterId,
        mockDateQuery,
      );

      expect(mockAnalyticsService.getMaxPowerByDay).toHaveBeenCalledWith(
        mockInverterId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toBeInstanceOf(DailyMaxPowerResponseDto);
      expect(result.data).toEqual([]);
    });

    it('should propagate NotFoundException from service', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockRejectedValue(
        new NotFoundException('Inverter not found'),
      );

      await expect(
        controller.getMaxPowerByDay(mockInverterId, mockDateQuery),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from service (e.g., invalid date range)', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockRejectedValue(
        new BadRequestException('Invalid date range'),
      );

      await expect(
        controller.getMaxPowerByDay(mockInverterId, mockDateQuery),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAverageTemperatureByDay', () => {
    const mockDailyAverageTemperatureEntries: DailyAverageTemperatureEntryDto[] =
      [
        { day: '2023-01-15', averageTemperature: 25.5 },
        { day: '2023-01-16', averageTemperature: 26.0 },
      ];

    it('should call analyticsService.getAverageTemperatureByDay and return a DailyAverageTemperatureResponseDto', async () => {
      mockAnalyticsService.getAverageTemperatureByDay.mockResolvedValue(
        mockDailyAverageTemperatureEntries,
      );

      const result = await controller.getAverageTemperatureByDay(
        mockInverterId,
        mockDateQuery,
      );

      expect(
        mockAnalyticsService.getAverageTemperatureByDay,
      ).toHaveBeenCalledWith(
        mockInverterId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toBeInstanceOf(DailyAverageTemperatureResponseDto);
      expect(result.data).toEqual(mockDailyAverageTemperatureEntries);
    });

    it('should correctly handle empty temperature data from service', async () => {
      mockAnalyticsService.getAverageTemperatureByDay.mockResolvedValue([]);

      const result = await controller.getAverageTemperatureByDay(
        mockInverterId,
        mockDateQuery,
      );

      expect(
        mockAnalyticsService.getAverageTemperatureByDay,
      ).toHaveBeenCalledWith(
        mockInverterId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toBeInstanceOf(DailyAverageTemperatureResponseDto);
      expect(result.data).toEqual([]);
    });

    it('should propagate NotFoundException from getAverageTemperatureByDay service', async () => {
      mockAnalyticsService.getAverageTemperatureByDay.mockRejectedValue(
        new NotFoundException('Inverter not found for avg temp'),
      );

      await expect(
        controller.getAverageTemperatureByDay(mockInverterId, mockDateQuery),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from getAverageTemperatureByDay service (e.g., invalid date range)', async () => {
      mockAnalyticsService.getAverageTemperatureByDay.mockRejectedValue(
        new BadRequestException('Invalid date range for avg temp'),
      );

      await expect(
        controller.getAverageTemperatureByDay(mockInverterId, mockDateQuery),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInverterEnergyGeneration', () => {
    const mockEnergyGenerationResponse: EnergyGenerationResponseDto =
      new EnergyGenerationResponseDto({
        totalGenerationWh: 1234.56,
        startDate: mockDateQuery.data_inicio,
        endDate: mockDateQuery.data_fim,
        entityId: mockInverterId,
        entityType: 'inverter',
      });

    it('should call analyticsService.getInverterEnergyGeneration and return an EnergyGenerationResponseDto', async () => {
      mockAnalyticsService.getInverterEnergyGeneration.mockResolvedValue(
        mockEnergyGenerationResponse,
      );

      const result = await controller.getInverterEnergyGeneration(
        mockInverterId,
        mockDateQuery,
      );

      expect(
        mockAnalyticsService.getInverterEnergyGeneration,
      ).toHaveBeenCalledWith(
        mockInverterId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toEqual(mockEnergyGenerationResponse);
    });

    it('should return 0 generation if service returns 0', async () => {
      const zeroGenerationResponse = new EnergyGenerationResponseDto({
        totalGenerationWh: 0,
        startDate: mockDateQuery.data_inicio,
        endDate: mockDateQuery.data_fim,
        entityId: mockInverterId,
        entityType: 'inverter',
      });
      mockAnalyticsService.getInverterEnergyGeneration.mockResolvedValue(
        zeroGenerationResponse,
      );

      const result = await controller.getInverterEnergyGeneration(
        mockInverterId,
        mockDateQuery,
      );

      expect(result.totalGenerationWh).toEqual(0);
      expect(result).toEqual(zeroGenerationResponse);
    });

    it('should propagate NotFoundException from getInverterEnergyGeneration service', async () => {
      mockAnalyticsService.getInverterEnergyGeneration.mockRejectedValue(
        new NotFoundException('Inverter not found for generation'),
      );

      await expect(
        controller.getInverterEnergyGeneration(mockInverterId, mockDateQuery),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from getInverterEnergyGeneration service', async () => {
      mockAnalyticsService.getInverterEnergyGeneration.mockRejectedValue(
        new BadRequestException('Invalid date range for generation'),
      );

      await expect(
        controller.getInverterEnergyGeneration(mockInverterId, mockDateQuery),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlantEnergyGeneration', () => {
    const mockPlantEnergyGenerationResponse = new EnergyGenerationResponseDto({
      totalGenerationWh: 5678.9,
      startDate: mockDateQuery.data_inicio,
      endDate: mockDateQuery.data_fim,
      entityId: mockPlantId,
      entityType: 'plant',
    });

    it('should call analyticsService.getPlantEnergyGeneration and return an EnergyGenerationResponseDto', async () => {
      mockAnalyticsService.getPlantEnergyGeneration.mockResolvedValue(
        mockPlantEnergyGenerationResponse,
      );

      const result = await controller.getPlantEnergyGeneration(
        mockPlantId,
        mockDateQuery,
      );

      expect(
        mockAnalyticsService.getPlantEnergyGeneration,
      ).toHaveBeenCalledWith(
        mockPlantId,
        mockDateQuery.data_inicio,
        mockDateQuery.data_fim,
      );
      expect(result).toEqual(mockPlantEnergyGenerationResponse);
    });

    it('should return 0 plant generation if service returns 0', async () => {
      const zeroGenerationResponse = new EnergyGenerationResponseDto({
        totalGenerationWh: 0,
        startDate: mockDateQuery.data_inicio,
        endDate: mockDateQuery.data_fim,
        entityId: mockPlantId,
        entityType: 'plant',
      });
      mockAnalyticsService.getPlantEnergyGeneration.mockResolvedValue(
        zeroGenerationResponse,
      );

      const result = await controller.getPlantEnergyGeneration(
        mockPlantId,
        mockDateQuery,
      );

      expect(result.totalGenerationWh).toEqual(0);
      expect(result).toEqual(zeroGenerationResponse);
    });

    it('should propagate NotFoundException from getPlantEnergyGeneration service', async () => {
      mockAnalyticsService.getPlantEnergyGeneration.mockRejectedValue(
        new NotFoundException('Plant not found for generation'),
      );

      await expect(
        controller.getPlantEnergyGeneration(mockPlantId, mockDateQuery),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException from getPlantEnergyGeneration service', async () => {
      mockAnalyticsService.getPlantEnergyGeneration.mockRejectedValue(
        new BadRequestException('Invalid date range for plant generation'),
      );

      await expect(
        controller.getPlantEnergyGeneration(mockPlantId, mockDateQuery),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

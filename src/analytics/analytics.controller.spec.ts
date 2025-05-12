import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { InverterAnalyticsQueryDto } from './dto/inverter-analytics-query.dto';
import {
  DailyMaxPowerResponseDto,
  DailyMaxPowerEntryDto,
} from './dto/daily-max-power-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockAnalyticsService = {
  getMaxPowerByDay: jest.fn(),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockInverterId = 1;
  const mockQueryDto: InverterAnalyticsQueryDto = {
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
        mockQueryDto,
      );

      expect(mockAnalyticsService.getMaxPowerByDay).toHaveBeenCalledWith(
        mockInverterId,
        mockQueryDto.data_inicio,
        mockQueryDto.data_fim,
      );
      expect(result).toBeInstanceOf(DailyMaxPowerResponseDto);
      expect(result.data).toEqual(mockDailyMaxPowerEntries);
    });

    it('should correctly handle empty data from service', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockResolvedValue([]);

      const result = await controller.getMaxPowerByDay(
        mockInverterId,
        mockQueryDto,
      );

      expect(mockAnalyticsService.getMaxPowerByDay).toHaveBeenCalledWith(
        mockInverterId,
        mockQueryDto.data_inicio,
        mockQueryDto.data_fim,
      );
      expect(result).toBeInstanceOf(DailyMaxPowerResponseDto);
      expect(result.data).toEqual([]);
    });

    it('should propagate NotFoundException from service', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockRejectedValue(
        new NotFoundException('Inverter not found'),
      );

      await expect(
        controller.getMaxPowerByDay(mockInverterId, mockQueryDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockAnalyticsService.getMaxPowerByDay).toHaveBeenCalledWith(
        mockInverterId,
        mockQueryDto.data_inicio,
        mockQueryDto.data_fim,
      );
    });

    it('should propagate BadRequestException from service (e.g., invalid date range)', async () => {
      mockAnalyticsService.getMaxPowerByDay.mockRejectedValue(
        new BadRequestException('Invalid date range'),
      );

      await expect(
        controller.getMaxPowerByDay(mockInverterId, mockQueryDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

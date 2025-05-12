import { Test, TestingModule } from '@nestjs/testing';
import { InvertersController } from './inverters.controller';
import { InvertersService } from './inverters.service';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { InverterResponseDto } from './dto/inverter-response.dto';
import { FindAllInvertersQueryDto } from './dto/find-all-inverters-query.dto';
import { Inverter } from './entities/inverter.entity';
import { Plant } from '../plants/entities/plant.entity';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

const mockInvertersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('InvertersController', () => {
  let controller: InvertersController;

  const mockPlant: Plant = {
    id: 1,
    name: 'Usina de Teste para Inversor',
    inverters: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInverterEntity: Inverter = {
    id: 1,
    externalId: 101,
    name: 'Inversor Entidade Teste',
    plantId: mockPlant.id,
    plant: mockPlant,
    metrics: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvertersController],
      providers: [
        {
          provide: InvertersService,
          useValue: mockInvertersService,
        },
      ],
    }).compile();

    controller = module.get<InvertersController>(InvertersController);

    mockInvertersService.create.mockClear();
    mockInvertersService.findAll.mockClear();
    mockInvertersService.findOne.mockClear();
    mockInvertersService.update.mockClear();
    mockInvertersService.remove.mockClear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return an InverterResponseDto with plantName', async () => {
      const createDto: CreateInverterDto = {
        name: 'Novo Inversor',
        externalId: 102,
        plantId: mockPlant.id,
      };

      const serviceResultEntity: Inverter = {
        ...mockInverterEntity,
        ...createDto,
        id: 2,
        plant: mockPlant,
      };
      mockInvertersService.create.mockResolvedValue(serviceResultEntity);

      const result = await controller.create(createDto);

      expect(mockInvertersService.create).toHaveBeenCalledWith(createDto);
      expect(result).toBeInstanceOf(InverterResponseDto);
      expect(result.id).toEqual(serviceResultEntity.id);
      expect(result.name).toEqual(serviceResultEntity.name);
      expect(result.plantId).toEqual(serviceResultEntity.plantId);
      expect(result.plantName).toEqual(mockPlant.name);
    });

    it('should propagate BadRequestException from service', async () => {
      const createDto: CreateInverterDto = {
        name: 'Inversor Ruim',
        externalId: 103,
        plantId: 999,
      };
      mockInvertersService.create.mockRejectedValue(
        new BadRequestException('Plant not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return an array of InverterResponseDto with plantNames', async () => {
      const queryDto = new FindAllInvertersQueryDto();
      const serviceResultEntities: Inverter[] = [
        { ...mockInverterEntity, plant: mockPlant },
        {
          ...mockInverterEntity,
          id: 2,
          externalId: 104,
          plant: { ...mockPlant, id: 2, name: 'Outra Usina' },
        },
      ];
      mockInvertersService.findAll.mockResolvedValue(serviceResultEntities);

      const result = await controller.findAll(queryDto);

      expect(mockInvertersService.findAll).toHaveBeenCalledWith(
        queryDto.plantId,
      );
      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(InverterResponseDto);
      expect(result[0].plantName).toEqual(serviceResultEntities[0].plant.name);
      expect(result[1].plantName).toEqual(serviceResultEntities[1].plant.name);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return an InverterResponseDto with plantName', async () => {
      const inverterId = 1;
      const serviceResultEntity: Inverter = {
        ...mockInverterEntity,
        plant: mockPlant,
      };
      mockInvertersService.findOne.mockResolvedValue(serviceResultEntity);

      const result = await controller.findOne(inverterId);

      expect(mockInvertersService.findOne).toHaveBeenCalledWith(inverterId);
      expect(result).toBeInstanceOf(InverterResponseDto);
      expect(result.id).toEqual(serviceResultEntity.id);
      expect(result.plantName).toEqual(serviceResultEntity.plant.name);
    });

    it('should propagate NotFoundException from service', async () => {
      const inverterId = 999;
      mockInvertersService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(inverterId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should call service.update and return an updated InverterResponseDto with plantName', async () => {
      const inverterId = 1;
      const updateDto: UpdateInverterDto = { name: 'Inversor Modificado' };

      const updatedEntityFromService: Partial<Inverter> = {
        id: inverterId,
        name: updateDto.name,
      };
      const reloadedEntityWithPlant: Inverter = {
        ...mockInverterEntity,
        ...updatedEntityFromService,
        plant: mockPlant,
      };

      mockInvertersService.update.mockResolvedValue(
        updatedEntityFromService as Inverter,
      );
      mockInvertersService.findOne.mockResolvedValue(reloadedEntityWithPlant);

      const result = await controller.update(inverterId, updateDto);

      expect(mockInvertersService.update).toHaveBeenCalledWith(
        inverterId,
        updateDto,
      );
      expect(mockInvertersService.findOne).toHaveBeenCalledWith(inverterId);
      expect(result).toBeInstanceOf(InverterResponseDto);
      expect(result.name).toEqual(updateDto.name);
      expect(result.plantName).toEqual(reloadedEntityWithPlant.plant.name);
    });

    it('should propagate exceptions from service during update', async () => {
      const inverterId = 1;
      const updateDto: UpdateInverterDto = { name: 'Nome Conflitante' };
      mockInvertersService.update.mockRejectedValue(new ConflictException());
      await expect(controller.update(inverterId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      const inverterId = 1;
      mockInvertersService.remove.mockResolvedValue(undefined);

      await expect(controller.remove(inverterId)).resolves.toBeUndefined();
      expect(mockInvertersService.remove).toHaveBeenCalledWith(inverterId);
    });

    it('should propagate NotFoundException from service during remove', async () => {
      const inverterId = 999;
      mockInvertersService.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove(inverterId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

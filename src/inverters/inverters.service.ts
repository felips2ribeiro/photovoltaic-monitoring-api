import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Inverter } from './entities/inverter.entity';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { Plant } from '../plants/entities/plant.entity';

@Injectable()
export class InvertersService {
  constructor(
    @InjectRepository(Inverter)
    private readonly inverterRepository: Repository<Inverter>,
    @InjectRepository(Plant)
    private readonly plantRepository: Repository<Plant>,
  ) {}

  async create(createInverterDto: CreateInverterDto): Promise<Inverter> {
    const plant = await this.plantRepository.findOneBy({
      id: createInverterDto.plantId,
    });
    if (!plant) {
      throw new BadRequestException(
        `Plant with ID "${createInverterDto.plantId}" not found. Cannot create inverter.`,
      );
    }

    const existingInverterByExternalId =
      await this.inverterRepository.findOneBy({
        externalId: createInverterDto.externalId,
      });
    if (existingInverterByExternalId) {
      throw new ConflictException(
        `Inverter with external ID "${createInverterDto.externalId}" already exists.`,
      );
    }

    const inverter = this.inverterRepository.create({
      ...createInverterDto,
      plant: plant,
    });

    return this.inverterRepository.save(inverter);
  }

  async findAll(plantId?: number): Promise<Inverter[]> {
    const findOptions: FindManyOptions<Inverter> = {
      relations: { plant: true },
    };
    if (plantId) {
      findOptions.where = { plantId: plantId };
    }
    return this.inverterRepository.find(findOptions);
  }

  async findOne(id: number): Promise<Inverter> {
    const inverter = await this.inverterRepository.findOne({
      where: { id },
      relations: { plant: true },
    });
    if (!inverter) {
      throw new NotFoundException(`Inverter with ID "${id}" not found.`);
    }
    return inverter;
  }

  async findByExternalId(externalId: number): Promise<Inverter | null> {
    return this.inverterRepository.findOne({
      where: { externalId },
      relations: { plant: true },
    });
  }

  async update(
    id: number,
    updateInverterDto: UpdateInverterDto,
  ): Promise<Inverter> {
    const inverterToUpdate = await this.inverterRepository.findOneBy({ id });
    if (!inverterToUpdate) {
      throw new NotFoundException(
        `Inverter with ID "${id}" not found for update.`,
      );
    }

    if (
      updateInverterDto.plantId &&
      updateInverterDto.plantId !== inverterToUpdate.plantId
    ) {
      const newPlant = await this.plantRepository.findOneBy({
        id: updateInverterDto.plantId,
      });
      if (!newPlant) {
        throw new BadRequestException(
          `New plant with ID "${updateInverterDto.plantId}" not found. Cannot update inverter's plant.`,
        );
      }
    }

    if (
      updateInverterDto.externalId &&
      updateInverterDto.externalId !== inverterToUpdate.externalId
    ) {
      const existingInverterByExternalId =
        await this.inverterRepository.findOneBy({
          externalId: updateInverterDto.externalId,
        });

      if (
        existingInverterByExternalId &&
        existingInverterByExternalId.id !== id
      ) {
        throw new ConflictException(
          `Inverter with external ID "${updateInverterDto.externalId}" already exists.`,
        );
      }
    }

    const preloadedInverter = await this.inverterRepository.preload({
      id: id,
      ...updateInverterDto,
    });

    if (!preloadedInverter) {
      throw new NotFoundException(
        `Failed to preload inverter with ID "${id}" for update.`,
      );
    }

    return this.inverterRepository.save(preloadedInverter);
  }

  async remove(id: number): Promise<void> {
    const inverterToRemove = await this.findOne(id);
    await this.inverterRepository.remove(inverterToRemove);
  }
}

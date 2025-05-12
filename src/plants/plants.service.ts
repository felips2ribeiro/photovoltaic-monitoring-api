import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './entities/plant.entity';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepository: Repository<Plant>,
  ) {}

  async create(createPlantDto: CreatePlantDto): Promise<Plant> {
    const existingPlant = await this.plantRepository.findOneBy({
      name: createPlantDto.name,
    });
    if (existingPlant) {
      throw new ConflictException(
        `Plant with name "${createPlantDto.name}" already exists.`,
      );
    }

    const plantEntity = this.plantRepository.create(createPlantDto);
    return this.plantRepository.save(plantEntity);
  }

  async findAll(): Promise<Plant[]> {
    return this.plantRepository.find({ relations: { inverters: true } });
  }

  async findOne(id: number): Promise<Plant> {
    const plant = await this.plantRepository.findOne({
      where: { id },
      relations: { inverters: true },
    });
    if (!plant) {
      throw new NotFoundException(`Plant with ID "${id}" not found.`);
    }
    return plant;
  }

  async update(id: number, updatePlantDto: UpdatePlantDto): Promise<Plant> {
    const plantLoaded = await this.plantRepository.findOneBy({ id });
    if (!plantLoaded) {
      throw new NotFoundException(`Plant with ID "${id}" not found.`);
    }

    if (updatePlantDto.name && updatePlantDto.name !== plantLoaded.name) {
      const existingPlantWithNewName = await this.plantRepository
        .createQueryBuilder('plant')
        .where('plant.name = :name AND plant.id != :id', {
          name: updatePlantDto.name,
          id,
        })
        .getOne();
      if (existingPlantWithNewName) {
        throw new ConflictException(
          `Another plant with name "${updatePlantDto.name}" already exists.`,
        );
      }
    }

    const plantToUpdate = await this.plantRepository.preload({
      id: id,
      ...updatePlantDto,
    });

    if (!plantToUpdate) {
      throw new NotFoundException(
        `Plant with ID "${id}" not found during preload.`,
      );
    }

    return this.plantRepository.save(plantToUpdate);
  }

  async remove(id: number): Promise<void> {
    const plantToRemove = await this.findOne(id);
    await this.plantRepository.remove(plantToRemove);
  }

  async findOneByName(name: string): Promise<Plant | null> {
    return this.plantRepository.findOneBy({ name });
  }
}

// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreatePlantDto } from '../src/plants/dto/create-plant.dto';
import { UpdatePlantDto } from '../src/plants/dto/update-plant.dto';
import { PlantResponseDto } from '../src/plants/dto/plant-response.dto';
import { CreateInverterDto } from '../src/inverters/dto/create-inverter.dto';
import { UpdateInverterDto } from '../src/inverters/dto/update-inverter.dto';
import { InverterResponseDto } from '../src/inverters/dto/inverter-response.dto';
import { Server } from 'http';
// import { getRepositoryToken } from '@nestjs/typeorm'; // Para limpeza de DB
// import { Plant } from '../src/plants/entities/plant.entity';
// import { Inverter } from '../src/inverters/entities/inverter.entity';

describe('Application End-to-End Tests', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    // app.setGlobalPrefix('api/v1');
    await app.init();
    httpServer = app.getHttpServer() as Server;

    // Limpeza global inicial do banco (opcional, mas bom para consistência)
    // Ex:
    // const plantRepository = moduleFixture.get(getRepositoryToken(Plant));
    // const inverterRepository = moduleFixture.get(getRepositoryToken(Inverter));
    // await inverterRepository.delete({}); // Ordem importa
    // await plantRepository.delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  // =======================================================================
  // Testes para PlantsController
  // =======================================================================
  describe('PlantsController (e2e)', () => {
    let createdPlantId: number;
    const plantBaseName = `Usina E2E Plants - ${Date.now()}`; // Nome base único
    let currentPlantName = plantBaseName;

    // POST
    it('/plants (POST) - should create a new plant', async () => {
      const createDto: CreatePlantDto = { name: plantBaseName };
      const response = await request(httpServer)
        .post('/plants')
        .send(createDto)
        .expect(HttpStatus.CREATED);
      const body = response.body as PlantResponseDto;
      expect(body.id).toBeDefined();
      expect(body.name).toEqual(plantBaseName);
      createdPlantId = body.id;
      currentPlantName = body.name; // Atualiza o nome atual
    });

    it('/plants (POST) - should return 400 if name is missing', () => {
      return request(httpServer)
        .post('/plants')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants (POST) - should return 409 if plant name already exists', async () => {
      // Garante que a usina do primeiro teste exista para testar o conflito
      expect(createdPlantId).toBeDefined();
      const createDto: CreatePlantDto = { name: plantBaseName };
      return request(httpServer)
        .post('/plants')
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    // GET ALL
    it('/plants (GET) - should get all plants', async () => {
      expect(createdPlantId).toBeDefined(); // Garante que pelo menos uma usina existe
      const response = await request(httpServer)
        .get('/plants')
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const foundPlant = body.find((p) => p.id === createdPlantId);
      expect(foundPlant).toBeDefined();
      if (foundPlant) {
        expect(foundPlant.name).toEqual(currentPlantName);
      }
    });

    // GET ONE
    it('/plants/:id (GET) - should get a specific plant by id', async () => {
      expect(createdPlantId).toBeDefined();
      const response = await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto;
      expect(body.id).toEqual(createdPlantId);
      expect(body.name).toEqual(currentPlantName);
    });

    it('/plants/:id (GET) - should return 404 if plant not found', () => {
      return request(httpServer)
        .get('/plants/99999')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/plants/:id (GET) - should return 400 if id is not a number', () => {
      return request(httpServer)
        .get('/plants/abc')
        .expect(HttpStatus.BAD_REQUEST);
    });

    // PATCH
    it('/plants/:id (PATCH) - should update a plant', async () => {
      expect(createdPlantId).toBeDefined();
      const newName = `Usina E2E Plants Atualizada - ${Date.now()}`;
      const updateDto: UpdatePlantDto = { name: newName };
      const response = await request(httpServer)
        .patch(`/plants/${createdPlantId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto;
      expect(body.id).toEqual(createdPlantId);
      expect(body.name).toEqual(newName);
      currentPlantName = newName; // Atualiza o nome atual para o próximo teste

      // Verificar GET após PATCH
      const getResponse = await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.OK);
      expect((getResponse.body as PlantResponseDto).name).toEqual(newName);
    });

    it('/plants/:id (PATCH) - should return 404 if plant to update not found', () => {
      return request(httpServer)
        .patch('/plants/99999')
        .send({ name: 'Teste' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/plants/:id (PATCH) - should return 400 if name is invalid', () => {
      expect(createdPlantId).toBeDefined();
      return request(httpServer)
        .patch(`/plants/${createdPlantId}`)
        .send({ name: 'U' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    // DELETE
    it('/plants/:id (DELETE) - should delete a plant', async () => {
      expect(createdPlantId).toBeDefined();
      await request(httpServer)
        .delete(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NO_CONTENT);
      // Tentar buscar para confirmar 404
      await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NOT_FOUND);
      createdPlantId = 0; // Marcar como deletado para não interferir no afterAll dos Inverters
    });

    it('/plants/:id (DELETE) - should return 404 if plant to delete not found', () => {
      return request(httpServer)
        .delete('/plants/99999')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // =======================================================================
  // Testes para InvertersController
  // =======================================================================
  describe('InvertersController (e2e)', () => {
    let testPlantForInverters: PlantResponseDto; // Usina específica para estes testes
    let createdInverterId: number;
    const baseInverterExternalId = 9000; // Base para IDs externos únicos
    let currentInverterName: string;

    beforeAll(async () => {
      // Criar uma usina dedicada para os testes de inversores
      const plantName = `Test Plant for Inverters - ${Date.now()}`;
      const createPlantDto: CreatePlantDto = { name: plantName };
      const response = await request(httpServer)
        .post('/plants')
        .send(createPlantDto)
        .expect(HttpStatus.CREATED);
      testPlantForInverters = response.body as PlantResponseDto;
      expect(testPlantForInverters.id).toBeDefined();
    });

    afterAll(async () => {
      // Limpar a usina criada para estes testes
      if (testPlantForInverters && testPlantForInverters.id) {
        await request(httpServer)
          .delete(`/plants/${testPlantForInverters.id}`)
          .catch(() => {});
      }
    });

    // POST
    it('/inverters (POST) - should create a new inverter', async () => {
      currentInverterName = `Inverter E2E - ${Date.now()}`;
      const createDto: CreateInverterDto = {
        name: currentInverterName,
        externalId: baseInverterExternalId + 1,
        plantId: testPlantForInverters.id,
      };
      const response = await request(httpServer)
        .post('/inverters')
        .send(createDto)
        .expect(HttpStatus.CREATED);
      const body = response.body as InverterResponseDto;
      expect(body.id).toBeDefined();
      expect(body.name).toEqual(currentInverterName);
      expect(body.externalId).toEqual(createDto.externalId);
      expect(body.plantId).toEqual(testPlantForInverters.id);
      expect(body.plantName).toEqual(testPlantForInverters.name);
      createdInverterId = body.id;
    });

    it('/inverters (POST) - should return 400 if plantId does not exist', () => {
      const createDto: CreateInverterDto = {
        name: 'Bad Inverter',
        externalId: baseInverterExternalId + 2,
        plantId: 99999,
      };
      return request(httpServer)
        .post('/inverters')
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/inverters (POST) - should return 409 if externalId already exists', async () => {
      // Primeiro, crie um inversor para garantir que o externalId existe
      const uniqueExternalId = baseInverterExternalId + 3;
      const firstCreateDto: CreateInverterDto = {
        name: `Inv Conflict Test ${Date.now()}`,
        externalId: uniqueExternalId,
        plantId: testPlantForInverters.id,
      };
      await request(httpServer)
        .post('/inverters')
        .send(firstCreateDto)
        .expect(HttpStatus.CREATED);

      // Tente criar outro com o mesmo externalId
      const secondCreateDto: CreateInverterDto = {
        name: 'Inv Conflict Test 2',
        externalId: uniqueExternalId,
        plantId: testPlantForInverters.id,
      };
      return request(httpServer)
        .post('/inverters')
        .send(secondCreateDto)
        .expect(HttpStatus.CONFLICT);
    });

    // GET ALL
    it('/inverters (GET) - should get all inverters', async () => {
      expect(createdInverterId).toBeDefined(); // Garante que um inversor foi criado
      const response = await request(httpServer)
        .get('/inverters')
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((inv) => inv.id === createdInverterId);
      expect(found).toBeDefined();
    });

    // GET ALL with plantId filter
    it('/inverters (GET) - should filter inverters by plantId', async () => {
      expect(createdInverterId).toBeDefined();
      const response = await request(httpServer)
        .get('/inverters')
        .query({ plantId: testPlantForInverters.id })
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1); // Pelo menos o nosso inversor de teste
      body.forEach((inv) =>
        expect(inv.plantId).toEqual(testPlantForInverters.id),
      );
    });

    // GET ONE
    it('/inverters/:id (GET) - should get a specific inverter', async () => {
      expect(createdInverterId).toBeDefined();
      const response = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.id).toEqual(createdInverterId);
      expect(body.name).toEqual(currentInverterName); // ou o nome mais recente se atualizado
      expect(body.plantName).toEqual(testPlantForInverters.name);
    });

    // PATCH
    it('/inverters/:id (PATCH) - should update an inverter', async () => {
      expect(createdInverterId).toBeDefined();
      const newName = `Updated Inverter E2E - ${Date.now()}`;
      const updateDto: UpdateInverterDto = { name: newName };
      const response = await request(httpServer)
        .patch(`/inverters/${createdInverterId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.name).toEqual(newName);
      currentInverterName = newName; // Atualiza para o próximo teste, se houver

      // Verificar com GET
      const getResponse = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      expect((getResponse.body as InverterResponseDto).name).toEqual(newName);
    });

    // DELETE
    it('/inverters/:id (DELETE) - should delete an inverter', async () => {
      expect(createdInverterId).toBeDefined();
      await request(httpServer)
        .delete(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NO_CONTENT);
      // Verificar com GET
      await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});

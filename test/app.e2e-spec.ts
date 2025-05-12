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
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PlantsController (e2e)', () => {
    let createdPlantId: number;
    const plantBaseName = `Usina E2E Plants - ${Date.now()}`;
    let currentPlantName = plantBaseName;

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
      currentPlantName = body.name;
    });

    it('/plants (POST) - should return 400 if name is missing', () => {
      return request(httpServer)
        .post('/plants')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants (POST) - should return 409 if plant name already exists', async () => {
      expect(createdPlantId).toBeDefined();
      const createDto: CreatePlantDto = { name: plantBaseName };
      return request(httpServer)
        .post('/plants')
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    it('/plants (GET) - should get all plants', async () => {
      expect(createdPlantId).toBeDefined();
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
      currentPlantName = newName;

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

    it('/plants/:id (DELETE) - should delete a plant', async () => {
      expect(createdPlantId).toBeDefined();
      await request(httpServer)
        .delete(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NO_CONTENT);

      await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NOT_FOUND);
      createdPlantId = 0;
    });

    it('/plants/:id (DELETE) - should return 404 if plant to delete not found', () => {
      return request(httpServer)
        .delete('/plants/99999')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('InvertersController (e2e)', () => {
    let testPlantForInverters: PlantResponseDto;
    let createdInverterId: number;
    const baseInverterExternalId = 9000;
    let currentInverterName: string;

    beforeAll(async () => {
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
      if (testPlantForInverters && testPlantForInverters.id) {
        await request(httpServer)
          .delete(`/plants/${testPlantForInverters.id}`)
          .catch(() => {});
      }
    });

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

    it('/inverters (GET) - should get all inverters', async () => {
      expect(createdInverterId).toBeDefined();
      const response = await request(httpServer)
        .get('/inverters')
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((inv) => inv.id === createdInverterId);
      expect(found).toBeDefined();
    });

    it('/inverters (GET) - should filter inverters by plantId', async () => {
      expect(createdInverterId).toBeDefined();
      const response = await request(httpServer)
        .get('/inverters')
        .query({ plantId: testPlantForInverters.id })
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      body.forEach((inv) =>
        expect(inv.plantId).toEqual(testPlantForInverters.id),
      );
    });

    it('/inverters/:id (GET) - should get a specific inverter', async () => {
      expect(createdInverterId).toBeDefined();
      const response = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.id).toEqual(createdInverterId);
      expect(body.name).toEqual(currentInverterName);
      expect(body.plantName).toEqual(testPlantForInverters.name);
    });

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
      currentInverterName = newName;

      const getResponse = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      expect((getResponse.body as InverterResponseDto).name).toEqual(newName);
    });

    it('/inverters/:id (DELETE) - should delete an inverter', async () => {
      expect(createdInverterId).toBeDefined();
      await request(httpServer)
        .delete(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NO_CONTENT);
      await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});

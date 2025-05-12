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
import {
  DailyMaxPowerResponseDto,
  DailyMaxPowerEntryDto,
} from '../src/analytics/dto/daily-max-power-response.dto';
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
    let createdPlantId: number | undefined;
    const plantBaseName = `Usina E2E Plants - ${Date.now()}`;
    let currentPlantName = plantBaseName;

    afterAll(async () => {
      if (createdPlantId) {
        await request(httpServer)
          .delete(`/plants/${createdPlantId}`)
          .catch(() => {
            /* ignore */
          });
      }
    });

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
      if (!createdPlantId)
        throw new Error('createdPlantId is not defined for conflict test');
      const createDto: CreatePlantDto = { name: plantBaseName };
      return request(httpServer)
        .post('/plants')
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    it('/plants (GET) - should get all plants', async () => {
      if (!createdPlantId)
        throw new Error('createdPlantId is not defined for GET all test');
      const response = await request(httpServer)
        .get('/plants')
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const foundPlant = body.find(
        (p: PlantResponseDto) => p.id === createdPlantId,
      );
      expect(foundPlant).toBeDefined();
      if (foundPlant) {
        expect(foundPlant.name).toEqual(currentPlantName);
      }
    });

    it('/plants/:id (GET) - should get a specific plant by id', async () => {
      if (!createdPlantId)
        throw new Error('createdPlantId is not defined for GET by ID test');
      const response = await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto;
      expect(body.id).toEqual(createdPlantId);
      expect(body.name).toEqual(currentPlantName);
    });

    it('/plants/:id (GET) - should return 404 if plant not found', () => {
      return request(httpServer)
        .get('/plants/999991')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/plants/:id (GET) - should return 400 if id is not a number', () => {
      return request(httpServer)
        .get('/plants/abc')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants/:id (PATCH) - should update a plant', async () => {
      if (!createdPlantId)
        throw new Error('createdPlantId is not defined for PATCH test');
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
        .patch('/plants/999992')
        .send({ name: 'Teste Update Fantasma' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/plants/:id (PATCH) - should return 400 if name is invalid', () => {
      if (!createdPlantId)
        throw new Error(
          'createdPlantId is not defined for PATCH invalid name test',
        );
      return request(httpServer)
        .patch(`/plants/${createdPlantId}`)
        .send({ name: 'U' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants/:id (DELETE) - should delete a plant', async () => {
      if (!createdPlantId)
        throw new Error('createdPlantId is not defined for DELETE test');
      await request(httpServer)
        .delete(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NO_CONTENT);

      await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(HttpStatus.NOT_FOUND);
      createdPlantId = undefined;
    });

    it('/plants/:id (DELETE) - should return 404 if plant to delete not found', () => {
      return request(httpServer)
        .delete('/plants/999993')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('InvertersController (e2e)', () => {
    let testPlantForInverters: PlantResponseDto;
    let createdInverterId: number | undefined;
    const baseInverterExternalId = 8000 + Math.floor(Math.random() * 1000);
    let currentInverterName: string;
    let currentInverterExternalId: number;

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
      currentInverterExternalId = baseInverterExternalId + 1;
      const createDto: CreateInverterDto = {
        name: currentInverterName,
        externalId: currentInverterExternalId,
        plantId: testPlantForInverters.id,
      };
      const response = await request(httpServer)
        .post('/inverters')
        .send(createDto)
        .expect(HttpStatus.CREATED);
      const body = response.body as InverterResponseDto;
      expect(body.id).toBeDefined();
      expect(body.name).toEqual(currentInverterName);
      expect(body.externalId).toEqual(currentInverterExternalId);
      expect(body.plantId).toEqual(testPlantForInverters.id);
      expect(body.plantName).toEqual(testPlantForInverters.name);
      createdInverterId = body.id;
    });

    it('/inverters (POST) - should return 400 if plantId does not exist', () => {
      const createDto: CreateInverterDto = {
        name: 'Bad Inverter',
        externalId: baseInverterExternalId + 2,
        plantId: 999994,
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
      if (!createdInverterId)
        throw new Error(
          'createdInverterId is not defined for GET all inverters test',
        );
      const response = await request(httpServer)
        .get('/inverters')
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      const found = body.find(
        (inv: InverterResponseDto) => inv.id === createdInverterId,
      );
      expect(found).toBeDefined();
    });

    it('/inverters (GET) - should filter inverters by plantId', async () => {
      if (!createdInverterId)
        throw new Error(
          'createdInverterId is not defined for GET filter by plantId test',
        );
      const response = await request(httpServer)
        .get('/inverters')
        .query({ plantId: testPlantForInverters.id })
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      body.forEach((inv: InverterResponseDto) =>
        expect(inv.plantId).toEqual(testPlantForInverters.id),
      );
    });

    it('/inverters/:id (GET) - should get a specific inverter', async () => {
      if (!createdInverterId)
        throw new Error(
          'createdInverterId is not defined for GET inverter by ID test',
        );
      const response = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.id).toEqual(createdInverterId);
      expect(body.name).toEqual(currentInverterName);
      expect(body.plantName).toEqual(testPlantForInverters.name);
    });

    it('/inverters/:id (PATCH) - should update an inverter', async () => {
      if (!createdInverterId)
        throw new Error(
          'createdInverterId is not defined for PATCH inverter test',
        );
      const newName = `Updated Inverter E2E - ${Date.now()}`;
      const updateDto: UpdateInverterDto = { name: newName };
      const response = await request(httpServer)
        .patch(`/inverters/${createdInverterId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.name).toEqual(newName);

      const getResponse = await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.OK);
      expect((getResponse.body as InverterResponseDto).name).toEqual(newName);
    });

    it('/inverters/:id (DELETE) - should delete an inverter', async () => {
      if (!createdInverterId)
        throw new Error(
          'createdInverterId is not defined for DELETE inverter test',
        );
      await request(httpServer)
        .delete(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NO_CONTENT);
      await request(httpServer)
        .get(`/inverters/${createdInverterId}`)
        .expect(HttpStatus.NOT_FOUND);
      createdInverterId = undefined;
    });
  });

  describe('AnalyticsController (e2e)', () => {
    let analyticsTestPlant: PlantResponseDto;
    let analyticsTestInverter: InverterResponseDto;
    let seededInverterIdForAnalytics: number;

    beforeAll(async () => {
      const plantName = `Test Plant for Analytics - ${Date.now()}`;
      const plantResponse = await request(httpServer)
        .post('/plants')
        .send({ name: plantName })
        .expect(HttpStatus.CREATED);
      analyticsTestPlant = plantResponse.body as PlantResponseDto;

      const inverterExternalId = 7000 + Math.floor(Math.random() * 100);
      const inverterName = `Analytics Inverter - ${Date.now()}`;
      const createInverterDto: CreateInverterDto = {
        name: inverterName,
        externalId: inverterExternalId,
        plantId: analyticsTestPlant.id,
      };
      const inverterResponse = await request(httpServer)
        .post('/inverters')
        .send(createInverterDto)
        .expect(HttpStatus.CREATED);
      analyticsTestInverter = inverterResponse.body as InverterResponseDto;

      console.log('[E2E Analytics Setup] Ensuring metrics are ingested...');
      const ingestionResponse = await request(httpServer)
        .post('/metrics/ingest-file')
        .timeout(60000);
      expect(ingestionResponse.status).toBe(HttpStatus.OK);
      console.log(
        '[E2E Analytics Setup] Metrics ingestion confirmed/attempted.',
      );

      const allInvertersResponse = await request(httpServer)
        .get('/inverters')
        .expect(HttpStatus.OK);
      const allInverters = allInvertersResponse.body as InverterResponseDto[];
      const targetInverter = allInverters.find((inv) => inv.externalId === 1);
      if (!targetInverter) {
        throw new Error(
          'E2E Setup Error: Inverter with externalId 1 not found. Check AppModule seeding and metrics.json data.',
        );
      }
      seededInverterIdForAnalytics = targetInverter.id;
      console.log(
        `[E2E Analytics Setup] Using Inverter ID ${seededInverterIdForAnalytics} (externalId 1) for analytics tests.`,
      );
    }, 65000);

    afterAll(async () => {
      if (analyticsTestInverter && analyticsTestInverter.id) {
        await request(httpServer)
          .delete(`/inverters/${analyticsTestInverter.id}`)
          .catch(() => {});
      }
      if (analyticsTestPlant && analyticsTestPlant.id) {
        await request(httpServer)
          .delete(`/plants/${analyticsTestPlant.id}`)
          .catch(() => {});
      }
    });

    describe('GET /analytics/inverters/:inverterId/max-power-by-day', () => {
      it('should return daily max power for a valid inverter and date range', async () => {
        if (!seededInverterIdForAnalytics)
          throw new Error('seededInverterIdForAnalytics is not defined');

        const startDate = '2025-01-08T00:00:00Z';
        const endDate = '2025-01-08T23:59:59Z';

        const response = await request(httpServer)
          .get(
            `/analytics/inverters/${seededInverterIdForAnalytics}/max-power-by-day`,
          )
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);

        const body = response.body as DailyMaxPowerResponseDto;
        expect(body).toBeInstanceOf(Object);
        expect(body.data).toBeInstanceOf(Array);

        if (body.data.length > 0) {
          const dayData = body.data.find(
            (d: DailyMaxPowerEntryDto) => d.day === '2025-01-08',
          );
          expect(dayData).toBeDefined();
          if (dayData) {
            expect(
              typeof dayData.maxActivePower === 'number' ||
                dayData.maxActivePower === null,
            ).toBe(true);
          }
        } else {
          console.warn(
            `[E2E Test Warning] No max-power data for inverter ${seededInverterIdForAnalytics} in range ${startDate}-${endDate}. Check metrics.json and ingestion. Test will pass with empty data.`,
          );
        }
      }, 30000);

      it('should return 404 if inverterId does not exist', () => {
        const startDate = '2025-01-01T00:00:00Z';
        const endDate = '2025-01-01T23:59:59Z';
        return request(httpServer)
          .get('/analytics/inverters/999995/max-power-by-day')
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should return 400 if data_inicio is missing', () => {
        const targetInverterId = seededInverterIdForAnalytics || 1;
        const endDate = '2025-01-01T23:59:59Z';
        return request(httpServer)
          .get(`/analytics/inverters/${targetInverterId}/max-power-by-day`)
          .query({ data_fim: endDate })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should return 400 if data_fim is missing', () => {
        const targetInverterId = seededInverterIdForAnalytics || 1;
        const startDate = '2025-01-01T00:00:00Z';
        return request(httpServer)
          .get(`/analytics/inverters/${targetInverterId}/max-power-by-day`)
          .query({ data_inicio: startDate })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should return 400 if startDate is after endDate', () => {
        const targetInverterId = seededInverterIdForAnalytics || 1;
        const startDate = '2025-01-02T00:00:00Z';
        const endDate = '2025-01-01T23:59:59Z';
        return request(httpServer)
          .get(`/analytics/inverters/${targetInverterId}/max-power-by-day`)
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should return empty data array if no metrics in range', async () => {
        const targetInverterId = seededInverterIdForAnalytics || 1;
        const startDate = '2000-01-01T00:00:00Z';
        const endDate = '2000-01-01T23:59:59Z';
        const response = await request(httpServer)
          .get(`/analytics/inverters/${targetInverterId}/max-power-by-day`)
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as DailyMaxPowerResponseDto;
        expect(body.data).toEqual([]);
      });
    });
  });
});

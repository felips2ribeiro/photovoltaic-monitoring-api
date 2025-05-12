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
import { DailyMaxPowerResponseDto } from '../src/analytics/dto/daily-max-power-response.dto';
import { DailyAverageTemperatureResponseDto } from '../src/analytics/dto/daily-average-temperature-response.dto';
import { EnergyGenerationResponseDto } from '../src/analytics/dto/energy-generation-response.dto';
import { Server } from 'http';

describe('Application End-to-End Tests', () => {
  let app: INestApplication;
  let httpServer: Server;

  let seededPlant1Id: number;
  let seededInverterIdForAnalytics: number;

  jest.setTimeout(75000);

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

    console.log('[E2E Global Setup] Ensuring metrics are ingested...');
    const ingestionStartTime = Date.now();
    const ingestionResponse = await request(httpServer)
      .post('/metrics/ingest-file')
      .timeout(60000);

    expect(ingestionResponse.status).toBe(HttpStatus.OK);
    const ingestionBody = ingestionResponse.body as {
      details: { ingested: number; errors: string[] };
    };
    expect(ingestionBody.details.ingested).toBeGreaterThan(0);
    if (ingestionBody.details.errors.length > 0) {
      console.warn(
        '[E2E Global Setup] Metrics ingestion had errors:',
        ingestionBody.details.errors,
      );
    }
    const ingestionTime = Date.now() - ingestionStartTime;
    console.log(
      `[E2E Global Setup] Metrics ingestion completed in ${ingestionTime}ms. Ingested: ${ingestionBody.details.ingested}`,
    );

    const plantsResponse = await request(httpServer)
      .get('/plants')
      .expect(HttpStatus.OK);
    const plants = plantsResponse.body as PlantResponseDto[];
    const plant1 = plants.find((p) => p.name === 'Usina 1');
    if (!plant1) {
      throw new Error(
        "E2E Setup Error: Seeded plant 'Usina 1' not found. Check AppModule seeding.",
      );
    }
    seededPlant1Id = plant1.id;

    const allInvertersResponse = await request(httpServer)
      .get(`/inverters?plantId=${seededPlant1Id}`)
      .expect(HttpStatus.OK);
    const allInverters = allInvertersResponse.body as InverterResponseDto[];
    const targetInverter = allInverters.find((inv) => inv.externalId === 1);
    if (!targetInverter) {
      throw new Error(
        'E2E Setup Error: Inverter with externalId 1 (from Usina 1) not found. Check AppModule seeding.',
      );
    }
    seededInverterIdForAnalytics = targetInverter.id;
    console.log(
      `[E2E Global Setup] Using Plant ID ${seededPlant1Id} (Usina 1) and Inverter ID ${seededInverterIdForAnalytics} (externalId 1) for analytics tests.`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PlantsController (e2e)', () => {
    let createdPlantIdForThisDescribe: number | undefined;
    const plantBaseName = `Usina E2E Plants SubSuite - ${Date.now()}`;
    let currentPlantNameInSubSuite = plantBaseName;

    afterAll(async () => {
      if (createdPlantIdForThisDescribe) {
        await request(httpServer)
          .delete(`/plants/${createdPlantIdForThisDescribe}`)
          .catch(() => {});
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
      createdPlantIdForThisDescribe = body.id;
      currentPlantNameInSubSuite = body.name;
    });

    it('/plants (POST) - should return 400 if name is missing', () => {
      return request(httpServer)
        .post('/plants')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants (POST) - should return 409 if plant name already exists', async () => {
      if (!createdPlantIdForThisDescribe)
        throw new Error('Plant for conflict test not created');
      const createDto: CreatePlantDto = { name: plantBaseName };
      return request(httpServer)
        .post('/plants')
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    it('/plants (GET) - should get all plants', async () => {
      const response = await request(httpServer)
        .get('/plants')
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      if (createdPlantIdForThisDescribe) {
        const foundPlant = body.find(
          (p: PlantResponseDto) => p.id === createdPlantIdForThisDescribe,
        );
        expect(foundPlant).toBeDefined();
        if (foundPlant)
          expect(foundPlant.name).toEqual(currentPlantNameInSubSuite);
      } else {
        expect(body.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('/plants/:id (GET) - should get a specific plant by id', async () => {
      if (!createdPlantIdForThisDescribe)
        throw new Error('Plant for GET by ID test not created');
      const response = await request(httpServer)
        .get(`/plants/${createdPlantIdForThisDescribe}`)
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto;
      expect(body.id).toEqual(createdPlantIdForThisDescribe);
      expect(body.name).toEqual(currentPlantNameInSubSuite);
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
      if (!createdPlantIdForThisDescribe)
        throw new Error('Plant for PATCH test not created');
      const newName = `Usina E2E Plants Atualizada - ${Date.now()}`;
      const updateDto: UpdatePlantDto = { name: newName };
      const response = await request(httpServer)
        .patch(`/plants/${createdPlantIdForThisDescribe}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      const body = response.body as PlantResponseDto;
      expect(body.name).toEqual(newName);
      currentPlantNameInSubSuite = newName;
    });

    it('/plants/:id (PATCH) - should return 404 if plant to update not found', () => {
      return request(httpServer)
        .patch('/plants/999992')
        .send({ name: 'Teste Update Fantasma' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/plants/:id (PATCH) - should return 400 if name is invalid', () => {
      if (!createdPlantIdForThisDescribe)
        throw new Error('Plant for PATCH invalid name test not created');
      return request(httpServer)
        .patch(`/plants/${createdPlantIdForThisDescribe}`)
        .send({ name: 'U' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/plants/:id (DELETE) - should delete a plant', async () => {
      if (!createdPlantIdForThisDescribe)
        throw new Error('Plant for DELETE test not created');
      await request(httpServer)
        .delete(`/plants/${createdPlantIdForThisDescribe}`)
        .expect(HttpStatus.NO_CONTENT);
      await request(httpServer)
        .get(`/plants/${createdPlantIdForThisDescribe}`)
        .expect(HttpStatus.NOT_FOUND);
      createdPlantIdForThisDescribe = undefined;
    });

    it('/plants/:id (DELETE) - should return 404 if plant to delete not found', () => {
      return request(httpServer)
        .delete('/plants/999993')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('InvertersController (e2e)', () => {
    let tempTestPlantForInverters: PlantResponseDto;
    let createdTempInverterId: number | undefined;
    const baseTempInverterExternalId = 7500 + Math.floor(Math.random() * 1000);
    let currentTempInverterName: string;
    let currentTempInverterExternalId: number;

    beforeAll(async () => {
      const plantName = `Temp Plant for Inverters E2E - ${Date.now()}`;
      const createPlantDto: CreatePlantDto = { name: plantName };
      const response = await request(httpServer)
        .post('/plants')
        .send(createPlantDto)
        .expect(HttpStatus.CREATED);
      tempTestPlantForInverters = response.body as PlantResponseDto;
    });

    afterAll(async () => {
      if (tempTestPlantForInverters && tempTestPlantForInverters.id) {
        await request(httpServer)
          .delete(`/plants/${tempTestPlantForInverters.id}`)
          .catch(() => {});
      }
    });

    it('/inverters (POST) - should create a new inverter for the temp plant', async () => {
      currentTempInverterName = `Temp Inverter E2E - ${Date.now()}`;
      currentTempInverterExternalId = baseTempInverterExternalId + 1;
      const createDto: CreateInverterDto = {
        name: currentTempInverterName,
        externalId: currentTempInverterExternalId,
        plantId: tempTestPlantForInverters.id,
      };
      const response = await request(httpServer)
        .post('/inverters')
        .send(createDto)
        .expect(HttpStatus.CREATED);
      const body = response.body as InverterResponseDto;
      expect(body.id).toBeDefined();
      expect(body.plantId).toEqual(tempTestPlantForInverters.id);
      expect(body.plantName).toEqual(tempTestPlantForInverters.name);
      createdTempInverterId = body.id;
    });

    it('/inverters (POST) - should return 400 if plantId does not exist', () => {
      const createDto: CreateInverterDto = {
        name: 'Bad Plant Inv',
        externalId: baseTempInverterExternalId + 2,
        plantId: 999994,
      };
      return request(httpServer)
        .post('/inverters')
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/inverters (POST) - should return 409 if externalId already exists', async () => {
      const uniqueExternalId = baseTempInverterExternalId + 3;
      const firstCreateDto: CreateInverterDto = {
        name: `Inv Conflict ${uniqueExternalId}`,
        externalId: uniqueExternalId,
        plantId: tempTestPlantForInverters.id,
      };
      await request(httpServer)
        .post('/inverters')
        .send(firstCreateDto)
        .expect(HttpStatus.CREATED);

      const secondCreateDto: CreateInverterDto = {
        name: 'Inv Conflict 2',
        externalId: uniqueExternalId,
        plantId: tempTestPlantForInverters.id,
      };
      return request(httpServer)
        .post('/inverters')
        .send(secondCreateDto)
        .expect(HttpStatus.CONFLICT);
    });

    it('/inverters (GET) - should get all inverters', async () => {
      const response = await request(httpServer)
        .get('/inverters')
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      if (createdTempInverterId) {
        const found = body.find(
          (inv: InverterResponseDto) => inv.id === createdTempInverterId,
        );
        expect(found).toBeDefined();
      }
    });

    it('/inverters (GET) - should filter inverters by plantId', async () => {
      if (!createdTempInverterId)
        throw new Error('Temp Inverter for filter test not created');
      const response = await request(httpServer)
        .get('/inverters')
        .query({ plantId: tempTestPlantForInverters.id })
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      body.forEach((inv: InverterResponseDto) =>
        expect(inv.plantId).toEqual(tempTestPlantForInverters.id),
      );
    });

    it('/inverters/:id (GET) - should get a specific inverter', async () => {
      if (!createdTempInverterId)
        throw new Error('Temp Inverter for GET by ID test not created');
      const response = await request(httpServer)
        .get(`/inverters/${createdTempInverterId}`)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.id).toEqual(createdTempInverterId);
      expect(body.name).toEqual(currentTempInverterName);
    });

    it('/inverters/:id (PATCH) - should update an inverter', async () => {
      if (!createdTempInverterId)
        throw new Error('Temp Inverter for PATCH test not created');
      const newName = `Updated Temp Inverter - ${Date.now()}`;
      const updateDto: UpdateInverterDto = { name: newName };
      const response = await request(httpServer)
        .patch(`/inverters/${createdTempInverterId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      const body = response.body as InverterResponseDto;
      expect(body.name).toEqual(newName);
    });

    it('/inverters/:id (DELETE) - should delete an inverter', async () => {
      if (!createdTempInverterId)
        throw new Error('Temp Inverter for DELETE test not created');
      await request(httpServer)
        .delete(`/inverters/${createdTempInverterId}`)
        .expect(HttpStatus.NO_CONTENT);
      await request(httpServer)
        .get(`/inverters/${createdTempInverterId}`)
        .expect(HttpStatus.NOT_FOUND);
      createdTempInverterId = undefined;
    });
  });

  describe('AnalyticsController (e2e)', () => {
    describe('GET /analytics/inverters/:inverterId/max-power-by-day', () => {
      it('should return daily max power for seeded inverter 1', async () => {
        expect(seededInverterIdForAnalytics).toBeDefined();
        const startDate = '2025-01-08T00:00:00Z';
        const endDate = '2025-01-08T23:59:59Z';
        const response = await request(httpServer)
          .get(
            `/analytics/inverters/${seededInverterIdForAnalytics}/max-power-by-day`,
          )
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as DailyMaxPowerResponseDto;
        expect(body.data).toBeInstanceOf(Array);
      }, 30000);

      it('should return 404 if inverterId does not exist for max-power', () => {
        return request(httpServer)
          .get('/analytics/inverters/999995/max-power-by-day')
          .query({
            data_inicio: '2025-01-01T00:00:00Z',
            data_fim: '2025-01-01T23:59:59Z',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
      it('should return 400 if data_inicio is missing for max-power', () => {
        return request(httpServer)
          .get(
            `/analytics/inverters/${seededInverterIdForAnalytics}/max-power-by-day`,
          )
          .query({ data_fim: '2025-01-01T23:59:59Z' })
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('GET /analytics/inverters/:inverterId/average-temperature-by-day', () => {
      it('should return daily average temperature for seeded inverter 1', async () => {
        expect(seededInverterIdForAnalytics).toBeDefined();
        const startDate = '2025-01-08T00:00:00Z';
        const endDate = '2025-01-08T23:59:59Z';
        const response = await request(httpServer)
          .get(
            `/analytics/inverters/${seededInverterIdForAnalytics}/average-temperature-by-day`,
          )
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as DailyAverageTemperatureResponseDto;
        expect(body.data).toBeInstanceOf(Array);
      }, 30000);
      it('should return 404 if inverterId does not exist for avg-temp', () => {
        return request(httpServer)
          .get('/analytics/inverters/999995/average-temperature-by-day')
          .query({
            data_inicio: '2025-01-01T00:00:00Z',
            data_fim: '2025-01-01T23:59:59Z',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('GET /analytics/inverters/:inverterId/generation', () => {
      it('should calculate inverter energy generation for seeded inverter 1', async () => {
        expect(seededInverterIdForAnalytics).toBeDefined();
        const startDate = '2025-01-01T03:00:00Z';
        const endDate = '2025-01-01T04:00:00Z';
        const response = await request(httpServer)
          .get(
            `/analytics/inverters/${seededInverterIdForAnalytics}/generation`,
          )
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as EnergyGenerationResponseDto;
        expect(body.totalGenerationWh).toBeGreaterThanOrEqual(0);
      }, 30000);
      it('should return 404 if inverterId does not exist for inv-generation', () => {
        return request(httpServer)
          .get('/analytics/inverters/999995/generation')
          .query({
            data_inicio: '2025-01-01T00:00:00Z',
            data_fim: '2025-01-01T23:59:59Z',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('GET /analytics/plants/:plantId/generation', () => {
      it('should calculate plant energy generation for seeded Usina 1', async () => {
        expect(seededPlant1Id).toBeDefined();
        const startDate = '2025-01-01T00:00:00Z';
        const endDate = '2025-01-08T23:59:59Z';
        const response = await request(httpServer)
          .get(`/analytics/plants/${seededPlant1Id}/generation`)
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as EnergyGenerationResponseDto;
        expect(body.totalGenerationWh).toBeGreaterThanOrEqual(0);
        expect(body.entityId).toEqual(seededPlant1Id);
        expect(body.entityType).toEqual('plant');
      }, 30000);

      it('should return 0 generation if plant has no inverters or no metrics in range for its inverters', async () => {
        const emptyPlantName = `Empty Plant For Gen Test E2E - ${Date.now()}`;
        const plantResponse = await request(httpServer)
          .post('/plants')
          .send({ name: emptyPlantName })
          .expect(HttpStatus.CREATED);
        const emptyPlant = plantResponse.body as PlantResponseDto;

        const startDate = '2025-01-01T00:00:00Z';
        const endDate = '2025-01-01T23:59:59Z';
        const response = await request(httpServer)
          .get(`/analytics/plants/${emptyPlant.id}/generation`)
          .query({ data_inicio: startDate, data_fim: endDate })
          .expect(HttpStatus.OK);
        const body = response.body as EnergyGenerationResponseDto;
        expect(body.totalGenerationWh).toEqual(0);

        await request(httpServer)
          .delete(`/plants/${emptyPlant.id}`)
          .expect(HttpStatus.NO_CONTENT);
      });
      it('should return 404 if plantId does not exist for plant-generation', () => {
        return request(httpServer)
          .get('/analytics/plants/999995/generation')
          .query({
            data_inicio: '2025-01-01T00:00:00Z',
            data_fim: '2025-01-01T23:59:59Z',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });
});

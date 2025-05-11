import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreatePlantDto } from '../src/plants/dto/create-plant.dto';
import { UpdatePlantDto } from '../src/plants/dto/update-plant.dto';
import { PlantResponseDto } from '../src/plants/dto/plant-response.dto';
import { Server } from 'http';

describe('PlantsController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;

  let createdPlantId: number;
  const createdPlantName = 'Usina E2E Inicial DTO';
  let initialPlantForE2E: PlantResponseDto;

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
    if (createdPlantId) {
      await request(httpServer).delete(`/plants/${createdPlantId}`);
    }
    await app.close();
  });

  describe('/plants (POST)', () => {
    it('should create a new plant and return 201 with PlantResponseDto structure', async () => {
      const createPlantDto: CreatePlantDto = { name: createdPlantName };
      const response = await request(httpServer)
        .post('/plants')
        .send(createPlantDto)
        .expect(201);

      const body = response.body as PlantResponseDto;

      expect(body).toBeInstanceOf(Object);
      expect(body.id).toBeDefined();
      expect(typeof body.id).toBe('number');
      expect(body.name).toEqual(createPlantDto.name);
      expect(body.createdAt).toBeDefined();

      createdPlantId = body.id;
      initialPlantForE2E = body;
    });

    it('should return 400 if name is missing', () => {
      return request(httpServer).post('/plants').send({}).expect(400);
    });

    it('should return 409 if plant name already exists', () => {
      const createPlantDto: CreatePlantDto = { name: createdPlantName };
      return request(httpServer)
        .post('/plants')
        .send(createPlantDto)
        .expect(409);
    });
  });

  describe('/plants (GET)', () => {
    it('should get all plants and return 200 with PlantResponseDto structure', async () => {
      expect(createdPlantId).toBeDefined();
      const response = await request(httpServer).get('/plants').expect(200);

      const body = response.body as PlantResponseDto[];

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const plantInResponse = body.find((p) => p.id === createdPlantId);
      expect(plantInResponse).toBeDefined();
      if (plantInResponse) {
        expect(plantInResponse.name).toEqual(initialPlantForE2E.name);
        expect(new Date(plantInResponse.createdAt).toISOString()).toEqual(
          new Date(initialPlantForE2E.createdAt).toISOString(),
        );
      }
    });
  });

  describe('/plants/:id (GET)', () => {
    it('should get a specific plant by id and return 200 with PlantResponseDto structure', async () => {
      expect(createdPlantId).toBeDefined();
      const response = await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(200);
      const body = response.body as PlantResponseDto;

      expect(body.id).toEqual(createdPlantId);
      expect(body.name).toEqual(initialPlantForE2E.name);
      expect(new Date(body.createdAt).toISOString()).toEqual(
        new Date(initialPlantForE2E.createdAt).toISOString(),
      );
    });

    it('should return 404 if plant not found', () => {
      return request(httpServer).get('/plants/99999').expect(404);
    });

    it('should return 400 if id is not a number', () => {
      return request(httpServer).get('/plants/abc').expect(400);
    });
  });

  describe('/plants/:id (PATCH)', () => {
    const updatedName = 'Usina E2E Atualizada DTO';
    it('should update a plant and return 200 with PlantResponseDto structure', async () => {
      expect(createdPlantId).toBeDefined();
      const updatePlantDto: UpdatePlantDto = { name: updatedName };
      const response = await request(httpServer)
        .patch(`/plants/${createdPlantId}`)
        .send(updatePlantDto)
        .expect(200);
      const body = response.body as PlantResponseDto;

      expect(body.id).toEqual(createdPlantId);
      expect(body.name).toEqual(updatedName);
      expect(new Date(body.createdAt).toISOString()).toEqual(
        new Date(initialPlantForE2E.createdAt).toISOString(),
      );

      const getResponse = await request(httpServer)
        .get(`/plants/${createdPlantId}`)
        .expect(200);
      const verifiedPlant = getResponse.body as PlantResponseDto;
      expect(verifiedPlant.name).toEqual(updatedName);
    });

    it('should return 404 if plant to update not found', () => {
      const updatePlantDto: UpdatePlantDto = { name: 'Nome Qualquer' };
      return request(httpServer)
        .patch('/plants/99999')
        .send(updatePlantDto)
        .expect(404);
    });

    it('should return 400 if name is invalid (e.g., too short)', () => {
      expect(createdPlantId).toBeDefined();
      const updatePlantDto: UpdatePlantDto = { name: 'U' };
      return request(httpServer)
        .patch(`/plants/${createdPlantId}`)
        .send(updatePlantDto)
        .expect(400);
    });
  });

  describe('/plants/:id (DELETE)', () => {
    it('should delete a plant and return 204', async () => {
      expect(createdPlantId).toBeDefined();
      await request(httpServer).delete(`/plants/${createdPlantId}`).expect(204);
      createdPlantId = 0;
    });

    it('should return 404 when trying to get a deleted plant', async () => {
      expect(initialPlantForE2E.id).toBeDefined();
      return request(httpServer)
        .get(`/plants/${initialPlantForE2E.id}`)
        .expect(404);
    });

    it('should return 404 if plant to delete not found', () => {
      return request(httpServer).delete('/plants/99999').expect(404);
    });
  });
});

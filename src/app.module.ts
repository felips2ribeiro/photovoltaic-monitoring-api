import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PlantsModule } from './plants/plants.module';
import { InvertersModule } from './inverters/inverters.module';
import { MetricsModule } from './metrics/metrics.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PlantsService } from './plants/plants.service';
import { InvertersService } from './inverters/inverters.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    PlantsModule,
    InvertersModule,
    MetricsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  // Injetar os serviços necessários para o seeding
  constructor(
    private readonly plantsService: PlantsService,
    private readonly invertersService: InvertersService,
  ) {}

  async onModuleInit() {
    this.logger.log(
      'AppModule initialized. Seeding initial data if necessary...',
    );
    await this.seedDatabase();
  }

  private async seedDatabase() {
    try {
      // --- Seed Usinas ---
      let plant1 = await this.plantsService.findOneByName('Usina 1');
      if (!plant1) {
        this.logger.log('Seeding Plant 1...');
        plant1 = await this.plantsService.create({ name: 'Usina 1' });
      } else {
        this.logger.log('Plant 1 already exists.');
      }

      let plant2 = await this.plantsService.findOneByName('Usina 2');
      if (!plant2) {
        this.logger.log('Seeding Plant 2...');
        plant2 = await this.plantsService.create({ name: 'Usina 2' });
      } else {
        this.logger.log('Plant 2 already exists.');
      }

      // --- Seed Inversores ---
      const invertersToSeed = [
        // Usina 1
        { externalId: 1, name: 'Inversor 1 (U1)', plantId: plant1.id },
        { externalId: 2, name: 'Inversor 2 (U1)', plantId: plant1.id },
        { externalId: 3, name: 'Inversor 3 (U1)', plantId: plant1.id },
        { externalId: 4, name: 'Inversor 4 (U1)', plantId: plant1.id },
        // Usina 2
        { externalId: 5, name: 'Inversor 5 (U2)', plantId: plant2.id },
        { externalId: 6, name: 'Inversor 6 (U2)', plantId: plant2.id },
        { externalId: 7, name: 'Inversor 7 (U2)', plantId: plant2.id },
        { externalId: 8, name: 'Inversor 8 (U2)', plantId: plant2.id },
      ];

      for (const inverterData of invertersToSeed) {
        const existingInverter = await this.invertersService.findByExternalId(
          inverterData.externalId,
        );
        if (!existingInverter) {
          this.logger.log(
            `Seeding Inverter with externalId ${inverterData.externalId} for Plant ${inverterData.plantId}...`,
          );

          await this.invertersService.create({
            name: inverterData.name,
            externalId: inverterData.externalId,
            plantId: inverterData.plantId,
          });
        } else {
          this.logger.log(
            `Inverter with externalId ${inverterData.externalId} already exists.`,
          );
        }
      }
      this.logger.log('Database seeding process completed.');
    } catch (error) {
      this.logger.error('Error during database seeding:', error);
    }
  }
}

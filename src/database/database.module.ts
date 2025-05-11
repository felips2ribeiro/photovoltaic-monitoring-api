import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

type SupportedDatabaseType = DataSourceOptions['type'];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DataSourceOptions => {
        const databaseName = configService.get<string>('DATABASE_NAME');
        const databaseTypeFromEnv = configService.get<string>('DATABASE_TYPE');

        if (!databaseName) {
          throw new Error(
            'DATABASE_NAME is not defined in environment variables',
          );
        }

        if (!databaseTypeFromEnv) {
          throw new Error(
            'DATABASE_TYPE is not defined in environment variables',
          );
        }

        const type = databaseTypeFromEnv as SupportedDatabaseType;
        const synchronize =
          configService.get<string>('NODE_ENV') !== 'production';
        const logging = configService.get<string>('NODE_ENV') !== 'production';

        return {
          type: type,
          database: databaseName,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: synchronize,
          logging: logging,
        };
      },
    }),
  ],
})
export class DatabaseModule {}

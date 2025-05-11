import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SqliteConnectionOptions => {
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

        const synchronize =
          configService.get<string>('NODE_ENV') !== 'production';
        const logging = configService.get<string>('NODE_ENV') !== 'production';

        return {
          type: 'sqlite',
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

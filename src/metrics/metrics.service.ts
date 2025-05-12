import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Metric } from './entities/metric.entity';
import { InvertersService } from '../inverters/inverters.service';
import { IngestMetricRecordDto } from './dto/ingest-metric-record.dto';
import * as fs from 'fs';
import * as path from 'path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

interface RawMetricRecord {
  datetime: { $date: string };
  inversor_id: number;
  potencia_ativa_watt: number;
  temperatura_celsius?: number | null;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,
    private readonly invertersService: InvertersService,
  ) {}

  async ingestMetricsFromFile(
    fileName: string = 'metrics.json',
  ): Promise<{ ingested: number; skipped: number; errors: string[] }> {
    this.logger.log(`Starting metrics ingestion from file: ${fileName}`);
    const filePath = path.join(process.cwd(), fileName);

    let rawData: string;
    try {
      rawData = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      let errorMessage = `Could not read metrics file: ${filePath}`;
      let errorStack: string | undefined;
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      }
      this.logger.error(
        `Failed to read metrics file at ${filePath}. Error: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Could not read metrics file: ${filePath}. Original error: ${errorMessage}`,
      );
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawData);
    } catch (error) {
      let errorMessage = 'Invalid JSON format in metrics file.';
      let errorStack: string | undefined;
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      }
      this.logger.error(
        `Failed to parse metrics JSON data. Error: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Invalid JSON format in metrics file. Original error: ${errorMessage}`,
      );
    }

    if (!Array.isArray(parsedData)) {
      const errorMsg =
        'Metrics file content is not an array after successful parsing.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const records: RawMetricRecord[] = parsedData as RawMetricRecord[];

    let ingestedCount = 0;
    let skippedCount = 0;
    const errorMessages: string[] = [];

    for (const rawRecord of records) {
      const recordDto = plainToInstance(IngestMetricRecordDto, rawRecord);
      const validationErrors = await validate(recordDto);

      if (validationErrors.length > 0) {
        const errorDetails = validationErrors
          .map((err) => {
            return `Property '${err.property}': Failed validation constraints: ${Object.keys(err.constraints || {}).join(', ')}. Received value: ${JSON.stringify(err.value)}`;
          })
          .join(' | ');
        const message = `Validation failed for record (inverter_id: ${rawRecord.inversor_id}, timestamp: ${rawRecord.datetime?.$date}): ${errorDetails}`;
        this.logger.warn(message);
        errorMessages.push(message);
        skippedCount++;
        continue;
      }

      const inverter = await this.invertersService.findByExternalId(
        recordDto.inversor_id,
      );
      if (!inverter) {
        const message = `Inverter with externalId ${recordDto.inversor_id} not found for metric record. Skipping.`;
        this.logger.warn(message);
        errorMessages.push(message);
        skippedCount++;
        continue;
      }

      try {
        const newMetric = this.metricRepository.create({
          inverter: inverter,
          inverterId: inverter.id,
          timestamp: recordDto.datetime,
          activePower: recordDto.potencia_ativa_watt,
          temperature: recordDto.temperatura_celsius,
        });
        await this.metricRepository.save(newMetric);
        ingestedCount++;
      } catch (dbError) {
        let errorMessage = `Unknown database error saving metric for inverter ${inverter.id} (externalId ${recordDto.inversor_id}) at ${recordDto.datetime.toISOString()}`;
        let errorStack: string | undefined;
        if (dbError instanceof Error) {
          errorMessage = `Database error saving metric for inverter ${inverter.id} (externalId ${recordDto.inversor_id}) at ${recordDto.datetime.toISOString()}: ${dbError.message}`;
          errorStack = dbError.stack;
        }
        this.logger.error(errorMessage, errorStack);
        errorMessages.push(errorMessage);
        skippedCount++;
      }
    }

    this.logger.log(
      `Metrics ingestion finished. Ingested: ${ingestedCount}, Skipped: ${skippedCount}.`,
    );
    if (errorMessages.length > 0) {
      this.logger.warn(
        `Ingestion completed with ${errorMessages.length} issues: \n${errorMessages.join('\n')}`,
      );
    }
    return {
      ingested: ingestedCount,
      skipped: skippedCount,
      errors: errorMessages,
    };
  }
}

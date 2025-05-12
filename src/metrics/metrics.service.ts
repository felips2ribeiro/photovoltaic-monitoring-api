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
  potencia_ativa_watt: number | null;
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

  async ingestMetricsFromFile(fileName: string = 'metrics.json'): Promise<{
    ingested: number;
    skippedDueToValidation: number;
    skippedDueToMissingInverter: number;
    failedToSave: number;
    errors: string[];
  }> {
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

    let validatedRecordCount = 0;
    let skippedDueToValidationCount = 0;
    let skippedDueToMissingInverterCount = 0;
    let successfullyIngestedCount = 0;
    const failedToSaveCount = 0;
    const errorMessages: string[] = [];
    const metricsToSave: Metric[] = [];

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
        skippedDueToValidationCount++;
        continue;
      }

      validatedRecordCount++;
      const inverter = await this.invertersService.findByExternalId(
        recordDto.inversor_id,
      );

      if (!inverter) {
        const message = `Inverter with externalId ${recordDto.inversor_id} not found for metric record. Skipping.`;
        this.logger.warn(message);
        errorMessages.push(message);
        skippedDueToMissingInverterCount++;
        continue;
      }

      const newMetricEntity = this.metricRepository.create({
        inverter: inverter,
        timestamp: recordDto.datetime,
        activePower: recordDto.potencia_ativa_watt,
        temperature: recordDto.temperatura_celsius,
      });
      metricsToSave.push(newMetricEntity);
    }

    this.logger.log(
      `Processed ${records.length} records. Validated: ${validatedRecordCount}. Attempting to save ${metricsToSave.length} metrics in bulk.`,
    );

    if (metricsToSave.length > 0) {
      try {
        await this.metricRepository.save(metricsToSave, { chunk: 500 });
        successfullyIngestedCount = metricsToSave.length;
        this.logger.log(
          `Successfully bulk saved ${successfullyIngestedCount} metrics.`,
        );
      } catch (dbError: unknown) {
        let errorMessage = `Unknown database error during bulk save of metrics.`;
        let errorStack: string | undefined;
        if (dbError instanceof Error) {
          errorMessage = `Database error during bulk save of metrics: ${dbError.message}`;
          errorStack = dbError.stack;
        }
        this.logger.error(errorMessage, errorStack);
        errorMessages.push(errorMessage);

        throw new Error(
          `Metrics ingestion failed during bulk save: ${errorMessage}`,
        );
      }
    }

    const totalSkipped =
      skippedDueToValidationCount +
      skippedDueToMissingInverterCount +
      failedToSaveCount;
    this.logger.log(
      `Metrics ingestion finished. Total records: ${records.length}, Ingested: ${successfullyIngestedCount}, Skipped: ${totalSkipped}.`,
    );
    if (errorMessages.length > 0) {
      this.logger.warn(
        `Ingestion completed with ${errorMessages.length} issues: \n${errorMessages.join('\n  - ')}`,
      );
    }
    return {
      ingested: successfullyIngestedCount,
      skippedDueToValidation: skippedDueToValidationCount,
      skippedDueToMissingInverter: skippedDueToMissingInverterCount,
      failedToSave: failedToSaveCount,
      errors: errorMessages,
    };
  }
}

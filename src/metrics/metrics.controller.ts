import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  constructor(private readonly metricsService: MetricsService) {}

  @Post('ingest-file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest metrics from the predefined JSON file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Metrics ingestion process finished or started successfully. Check details for results.',

    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        details: {
          type: 'object',
          properties: {
            ingested: { type: 'number' },
            skipped: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error during metrics ingestion process.',
  })
  async ingestMetrics() {
    try {
      this.logger.log('HTTP request to ingest metrics from file received.');
      const result =
        await this.metricsService.ingestMetricsFromFile('metrics.json');
      this.logger.log(
        `Metrics file ingestion result: ${JSON.stringify(result)}`,
      );
      return {
        message: 'Metrics ingestion process finished.',
        details: result,
      };
    } catch (error: unknown) {
      let errorMessage =
        'An unexpected error occurred during metrics ingestion via HTTP.';
      let errorStack: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      this.logger.error(
        `Error triggering metrics ingestion via HTTP: ${errorMessage}`,
        errorStack,
      );

      throw new HttpException(
        `Failed to ingest metrics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

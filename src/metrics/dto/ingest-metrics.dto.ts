import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { IngestMetricRecordDto } from './ingest-metric-record.dto';

export class IngestMetricsDto {
  @ApiProperty({
    type: [IngestMetricRecordDto],
    description: 'List of metric records to ingest',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestMetricRecordDto)
  records: IngestMetricRecordDto[];
}

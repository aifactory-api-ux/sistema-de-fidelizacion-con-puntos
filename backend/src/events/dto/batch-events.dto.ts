import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { IngestEventDto } from '../../points-engine/dto/ingest-event.dto';

export class BatchEventsDto {
  @ValidateNested({ each: true })
  @Type(() => IngestEventDto)
  @ArrayMinSize(1)
  events!: IngestEventDto[];
}

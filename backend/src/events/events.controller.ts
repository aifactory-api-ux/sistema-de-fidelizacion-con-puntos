import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { IngestEventDto } from '../points-engine/dto/ingest-event.dto';
import { BatchEventsDto } from './dto/batch-events.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Consumido por integraciones server-to-server (e-commerce/POS), no por
// socios directamente — de ahí el rol ADMIN como puerta de entrada mínima
// mientras no exista un API-key de integración dedicado (fuera de alcance MVP).
@ApiTags('events')
@Roles(UserRole.ADMIN)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @HttpCode(HttpStatus.OK)
  @Post('ingest')
  ingest(@Body() dto: IngestEventDto) {
    return this.eventsService.ingest(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('batch')
  ingestBatch(@Body() dto: BatchEventsDto) {
    return this.eventsService.ingestBatch(dto.events);
  }
}

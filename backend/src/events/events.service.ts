import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsEngineService } from '../points-engine/points-engine.service';
import { IngestEventDto } from '../points-engine/dto/ingest-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  async ingest(dto: IngestEventDto) {
    // Idempotencia (supuesto #6 del levantamiento): un mismo externalEventId
    // reenviado por el sistema de origen no debe procesarse dos veces.
    const existing = await this.prisma.transaction.findUnique({
      where: { externalEventId: dto.externalEventId },
    });
    if (existing) {
      return { idempotentReplay: true, transactionId: existing.id };
    }

    if (dto.type === 'purchase') {
      return { idempotentReplay: false, ...(await this.pointsEngine.accruePurchase(dto)) };
    }
    return { idempotentReplay: false, ...(await this.pointsEngine.reversePurchase(dto)) };
  }

  async ingestBatch(events: IngestEventDto[]) {
    const results = [];
    for (const event of events) {
      // ponytail: procesamiento secuencial, no paralelo — evita carreras
      // sobre el mismo accountId dentro de un mismo batch. Suficiente para
      // el volumen esperado del MVP; paralelizar por accountId si el
      // throughput de campañas masivas lo exige más adelante.
      results.push(await this.ingest(event));
    }
    return { processed: results.length, results };
  }
}

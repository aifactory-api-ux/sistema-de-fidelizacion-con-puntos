import { NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { UpsertPromotionDto } from './dto/upsert-promotion.dto';
import { AssignPromotionDto } from './dto/assign-promotion.dto';

const CATALOG_CACHE_KEY = 'promotions:catalog:active';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: UpsertPromotionDto, actorUserId: string) {
    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        eligibilityCriteria: (dto.eligibilityCriteria ?? { audience: 'all' }) as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
        active: dto.active ?? true,
      },
    });
    await this.audit.log({
      userId: actorUserId,
      action: 'promotion.created',
      entityType: 'Promotion',
      entityId: promotion.id,
      details: { ...dto } as Prisma.InputJsonValue,
    });
    await this.cache.invalidate(CATALOG_CACHE_KEY);
    return promotion;
  }

  async update(promotionId: string, dto: UpsertPromotionDto, actorUserId: string) {
    await this.ensureExists(promotionId);
    const promotion = await this.prisma.promotion.update({
      where: { id: promotionId },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        eligibilityCriteria: (dto.eligibilityCriteria ?? { audience: 'all' }) as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
        active: dto.active ?? true,
      },
    });
    await this.audit.log({
      userId: actorUserId,
      action: 'promotion.updated',
      entityType: 'Promotion',
      entityId: promotionId,
      details: { ...dto } as Prisma.InputJsonValue,
    });
    await this.cache.invalidate(CATALOG_CACHE_KEY);
    return promotion;
  }

  async remove(promotionId: string, actorUserId: string) {
    await this.ensureExists(promotionId);
    await this.prisma.promotion.delete({ where: { id: promotionId } });
    await this.audit.log({
      userId: actorUserId,
      action: 'promotion.deleted',
      entityType: 'Promotion',
      entityId: promotionId,
    });
    await this.cache.invalidate(CATALOG_CACHE_KEY);
    return { deleted: true };
  }

  async assign(dto: AssignPromotionDto, actorUserId: string) {
    await this.ensureExists(dto.promotionId);
    await this.prisma.$transaction(
      dto.customerIds.map((customerId) =>
        this.prisma.customerPromotion.upsert({
          where: { customerId_promotionId: { customerId, promotionId: dto.promotionId } },
          create: { customerId, promotionId: dto.promotionId },
          update: {},
        }),
      ),
    );
    await this.audit.log({
      userId: actorUserId,
      action: 'promotion.assigned',
      entityType: 'Promotion',
      entityId: dto.promotionId,
      details: { customerIds: dto.customerIds } as Prisma.InputJsonValue,
    });
    return { assigned: dto.customerIds.length };
  }

  async listForAdmin() {
    return this.prisma.promotion.findMany({ orderBy: [{ priority: 'desc' }, { startDate: 'desc' }] });
  }

  /** Catálogo completo activo y vigente, visible para cualquier socio autenticado.
   * Cacheado 60s (LLD §10.2): es de lectura frecuente y cambia poco. */
  async listActiveCatalog() {
    return this.cache.getOrSet(CATALOG_CACHE_KEY, 60, async () => {
      const now = new Date();
      return this.prisma.promotion.findMany({
        where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
        orderBy: [{ priority: 'desc' }, { startDate: 'desc' }],
      });
    });
  }

  /** Promociones relevantes Y elegibles para un socio puntual (dashboard). */
  async listForCustomer(customerId: string) {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { assignedTo: { some: { customerId } } },
          // Convención: sin `audience` explícita en eligibilityCriteria, o
          // audience === 'all', la promoción es abierta a todos los socios.
          { eligibilityCriteria: { path: ['audience'], equals: 'all' } },
          { eligibilityCriteria: { equals: {} } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { startDate: 'desc' }],
      take: 5,
    });
  }

  private async ensureExists(promotionId: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    return promotion;
  }
}

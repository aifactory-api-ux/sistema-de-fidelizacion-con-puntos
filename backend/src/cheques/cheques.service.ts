import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChequeStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PointsEngineService } from '../points-engine/points-engine.service';
import { RedeemChequeDto } from './dto/redeem-cheque.dto';
import { VoidChequeDto } from './dto/void-cheque.dto';
import { GenerateChequeDto } from './dto/generate-cheque.dto';

@Injectable()
export class ChequesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  async getById(chequeId: string) {
    const cheque = await this.getActiveAwareCheque(chequeId);
    if (!cheque) throw new NotFoundException('Cheque no encontrado');
    return cheque;
  }

  async redeem(chequeId: string, dto: RedeemChequeDto, actorUserId: string) {
    const cheque = await this.getActiveAwareCheque(chequeId);
    if (!cheque) throw new NotFoundException('Cheque no encontrado');
    if (cheque.status !== ChequeStatus.ACTIVE) {
      throw new BadRequestException(`El cheque no está disponible para canje (estado: ${cheque.status})`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.cheque.update({
        where: { id: chequeId },
        data: { status: ChequeStatus.REDEEMED, redemptionOrderId: dto.orderId, redeemedAt: new Date() },
      }),
      this.prisma.transaction.create({
        data: {
          accountId: cheque.accountId,
          type: TransactionType.REDEMPTION,
          amount: cheque.value,
          orderId: dto.orderId,
          description: dto.notes ?? `Canje de cheque ${chequeId}`,
          relatedEntityType: 'Cheque',
          relatedEntityId: chequeId,
        },
      }),
    ]);

    await this.audit.log({
      userId: actorUserId,
      action: 'cheque.redeemed',
      entityType: 'Cheque',
      entityId: chequeId,
      details: { orderId: dto.orderId },
    });

    return updated;
  }

  async void(chequeId: string, dto: VoidChequeDto, actorUserId: string) {
    const cheque = await this.prisma.cheque.findUnique({ where: { id: chequeId } });
    if (!cheque) throw new NotFoundException('Cheque no encontrado');
    if (cheque.status === ChequeStatus.REDEEMED) {
      throw new BadRequestException('No se puede anular un cheque ya canjeado');
    }

    const updated = await this.prisma.cheque.update({
      where: { id: chequeId },
      data: { status: ChequeStatus.VOID, voidReason: dto.reason },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'cheque.voided',
      entityType: 'Cheque',
      entityId: chequeId,
      details: { reason: dto.reason },
    });

    return updated;
  }

  async generate(dto: GenerateChequeDto, actorUserId: string) {
    const account = await this.prisma.account.findUnique({ where: { customerId: dto.customerId } });
    if (!account) throw new NotFoundException('Cuenta de socio no encontrada');

    const config = await this.pointsEngine.getCurrentConfig();
    const value = dto.value ?? Number(config.chequeValue);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + config.chequeExpiryDays);

    const cheque = await this.prisma.cheque.create({
      data: { accountId: account.id, value, expiryDate },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'cheque.generated_manually',
      entityType: 'Cheque',
      entityId: cheque.id,
      details: { customerId: dto.customerId, value, reason: dto.reason },
    });

    return cheque;
  }

  async listForAdmin(filters: { status?: ChequeStatus; customerId?: string }) {
    return this.prisma.cheque.findMany({
      where: {
        status: filters.status,
        account: filters.customerId ? { customerId: filters.customerId } : undefined,
      },
      include: { account: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listForCustomer(customerId: string, status?: ChequeStatus) {
    const account = await this.prisma.account.findUnique({ where: { customerId } });
    if (!account) throw new NotFoundException('Cuenta de socio no encontrada');
    return this.prisma.cheque.findMany({
      where: { accountId: account.id, status },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Marca EXPIRED "al leer" en vez de con un cron job — ponytail: suficiente
   * para el volumen del MVP; un job programado es la mejora natural si el
   * volumen de cheques activos crece mucho. */
  private async getActiveAwareCheque(chequeId: string) {
    const include = { account: { select: { customerId: true } } } as const;
    const cheque = await this.prisma.cheque.findUnique({ where: { id: chequeId }, include });
    if (!cheque) return null;
    if (cheque.status === ChequeStatus.ACTIVE && cheque.expiryDate < new Date()) {
      return this.prisma.cheque.update({ where: { id: chequeId }, data: { status: ChequeStatus.EXPIRED }, include });
    }
    return cheque;
  }
}

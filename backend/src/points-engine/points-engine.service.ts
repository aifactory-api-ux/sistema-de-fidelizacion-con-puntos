import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PointsEngineConfig, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { IngestEventDto } from './dto/ingest-event.dto';

const DEFAULT_CONFIG = {
  version: 1,
  earnRatio: 1, // 1 punto por cada 1€ elegible
  chequeThresholdPoints: 250,
  chequeValue: 5,
  chequeExpiryDays: 90,
  exclusions: [] as string[],
};

@Injectable()
export class PointsEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getCurrentConfig(): Promise<PointsEngineConfig> {
    const latest = await this.prisma.pointsEngineConfig.findFirst({
      orderBy: { version: 'desc' },
    });
    if (latest) return latest;
    return this.prisma.pointsEngineConfig.create({ data: DEFAULT_CONFIG });
  }

  async updateConfig(dto: UpdateConfigDto, actorUserId: string) {
    const current = await this.getCurrentConfig();
    const next = await this.prisma.pointsEngineConfig.create({
      data: {
        version: current.version + 1,
        earnRatio: dto.earnRatio,
        chequeThresholdPoints: dto.chequeThresholdPoints,
        chequeValue: dto.chequeValue,
        chequeExpiryDays: dto.chequeExpiryDays,
        exclusions: dto.exclusions ?? [],
        updatedBy: actorUserId,
        changeReason: dto.changeReason,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'points_engine_config.updated',
      entityType: 'PointsEngineConfig',
      entityId: next.id,
      details: { from: current, to: next, reason: dto.changeReason },
    });

    return next;
  }

  /** Calcula cuántos puntos corresponden a un monto elegible con la config vigente. */
  computeEarnedPoints(eligibleAmount: number, config: Pick<PointsEngineConfig, 'earnRatio'>): number {
    return Math.floor(eligibleAmount * Number(config.earnRatio));
  }

  async accruePurchase(dto: IngestEventDto) {
    const account = await this.getAccountByCustomerId(dto.customerId);
    const config = await this.getCurrentConfig();
    const pointsEarned = this.computeEarnedPoints(dto.amount, config);

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: TransactionType.PURCHASE,
          amount: dto.amount,
          externalEventId: dto.externalEventId,
          description: dto.description ?? 'Compra elegible',
          orderId: dto.orderId,
        },
      });

      await tx.pointLedgerEntry.create({
        data: {
          accountId: account.id,
          pointsChange: pointsEarned,
          reason: 'purchase_accrual',
          transactionId: transaction.id,
          auditReference: dto.externalEventId,
        },
      });

      let balance = account.currentBalance + pointsEarned;
      const chequesIssued: { id: string; value: string; expiryDate: Date }[] = [];

      while (balance >= config.chequeThresholdPoints) {
        balance -= config.chequeThresholdPoints;
        await tx.pointLedgerEntry.create({
          data: {
            accountId: account.id,
            pointsChange: -config.chequeThresholdPoints,
            reason: 'cheque_conversion',
            transactionId: transaction.id,
          },
        });
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + config.chequeExpiryDays);
        const cheque = await tx.cheque.create({
          data: {
            accountId: account.id,
            value: config.chequeValue,
            expiryDate,
            issuedByTransactionId: transaction.id,
          },
        });
        chequesIssued.push({ id: cheque.id, value: cheque.value.toString(), expiryDate: cheque.expiryDate });
      }

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: balance },
      });

      return { account: updatedAccount, pointsEarned, chequesIssued, transactionId: transaction.id };
    });
  }

  async reversePurchase(dto: IngestEventDto) {
    if (!dto.originalExternalEventId) {
      throw new BadRequestException('originalExternalEventId es requerido para revertir una compra');
    }

    const originalTransaction = await this.prisma.transaction.findUnique({
      where: { externalEventId: dto.originalExternalEventId },
      include: { ledgerEntries: true },
    });
    if (!originalTransaction) {
      throw new NotFoundException('No se encontró la compra original a revertir');
    }

    const pointsToReverse = originalTransaction.ledgerEntries
      .filter((entry) => entry.reason === 'purchase_accrual')
      .reduce((sum, entry) => sum + entry.pointsChange, 0);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({ where: { id: originalTransaction.accountId } });

      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: TransactionType.RETURN,
          amount: dto.amount,
          externalEventId: dto.externalEventId,
          description: dto.description ?? 'Devolución',
          orderId: dto.orderId,
          relatedEntityType: 'Transaction',
          relatedEntityId: originalTransaction.id,
        },
      });

      await tx.pointLedgerEntry.create({
        data: {
          accountId: account.id,
          pointsChange: -pointsToReverse,
          reason: 'return_reversal',
          transactionId: transaction.id,
          auditReference: dto.originalExternalEventId,
        },
      });

      // ponytail: el saldo nunca se muestra negativo (ya pudo haberse
      // convertido en un cheque); la deuda de puntos no cubierta se pierde.
      // Reconciliar deuda de puntos entre cuentas requeriría un mecanismo de
      // "saldo pendiente" que el MVP no contempla.
      const newBalance = Math.max(0, account.currentBalance - pointsToReverse);
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: newBalance },
      });

      return { account: updatedAccount, pointsReversed: pointsToReverse, transactionId: transaction.id };
    });
  }

  /** Recalcula el saldo de todas las cuentas a partir del ledger (herramienta de reconciliación). */
  async recalculateAllBalances(actorUserId: string) {
    const accounts = await this.prisma.account.findMany({ select: { id: true } });
    let updated = 0;

    for (const { id } of accounts) {
      const aggregate = await this.prisma.pointLedgerEntry.aggregate({
        where: { accountId: id },
        _sum: { pointsChange: true },
      });
      const derivedBalance = Math.max(0, aggregate._sum.pointsChange ?? 0);
      await this.prisma.account.update({ where: { id }, data: { currentBalance: derivedBalance } });
      updated += 1;
    }

    await this.audit.log({
      userId: actorUserId,
      action: 'points_engine.recalculated',
      entityType: 'Account',
      details: { accountsUpdated: updated },
    });

    return { accountsUpdated: updated };
  }

  private async getAccountByCustomerId(customerId: string) {
    const account = await this.prisma.account.findUnique({ where: { customerId } });
    if (!account) throw new NotFoundException('Cuenta de socio no encontrada');
    return account;
  }
}

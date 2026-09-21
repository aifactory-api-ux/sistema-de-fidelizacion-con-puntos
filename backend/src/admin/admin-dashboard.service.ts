import { Injectable } from '@nestjs/common';
import { ChequeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Cacheado 30s: dashboard de admin, no necesita ser al segundo y evita
  // recalcular agregados pesados en cada refresco de pantalla.
  async getStats() {
    return this.cache.getOrSet('admin:dashboard:stats', 30, async () => {
      const [activeCustomers, pointsIssued, chequesIssued, chequesRedeemed, activePromotions] = await Promise.all([
        this.prisma.customer.count(),
        this.prisma.pointLedgerEntry.aggregate({
          where: { pointsChange: { gt: 0 } },
          _sum: { pointsChange: true },
        }),
        this.prisma.cheque.count(),
        this.prisma.cheque.count({ where: { status: ChequeStatus.REDEEMED } }),
        this.prisma.promotion.count({ where: { active: true } }),
      ]);

      return {
        activeCustomers,
        pointsIssued: pointsIssued._sum.pointsChange ?? 0,
        chequesIssued,
        chequesRedeemed,
        redemptionRate: chequesIssued > 0 ? Number((chequesRedeemed / chequesIssued).toFixed(4)) : 0,
        activePromotions,
      };
    });
  }

  async getRecentActivity() {
    const [transactions, cheques] = await Promise.all([
      this.prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { account: { include: { customer: true } } },
      }),
      this.prisma.cheque.findMany({
        where: { status: { in: [ChequeStatus.REDEEMED, ChequeStatus.VOID] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { account: { include: { customer: true } } },
      }),
    ]);

    const transactionEvents = transactions.map((t) => ({
      type: 'transaction' as const,
      subtype: t.type,
      customerName: `${t.account.customer.firstName} ${t.account.customer.lastName}`,
      amount: t.amount.toString(),
      at: t.createdAt,
    }));
    const chequeEvents = cheques.map((c) => ({
      type: 'cheque' as const,
      subtype: c.status,
      customerName: `${c.account.customer.firstName} ${c.account.customer.lastName}`,
      amount: c.value.toString(),
      at: c.createdAt,
    }));

    return [...transactionEvents, ...chequeEvents]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 20);
  }
}

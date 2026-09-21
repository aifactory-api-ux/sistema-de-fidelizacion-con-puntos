import { NotFoundException } from '@nestjs/common';
import { PointsEngineService } from './points-engine.service';

type MockAccount = { id: string; customerId: string; currentBalance: number };

function buildPrismaMock(initialAccount: MockAccount) {
  const account = { ...initialAccount };
  const ledgerEntries: any[] = [];
  const cheques: any[] = [];
  const transactions: any[] = [];
  const configs: any[] = [];

  const tx = {
    transaction: {
      create: jest.fn(async ({ data }: any) => {
        const created = { id: `txn-${transactions.length + 1}`, ...data };
        transactions.push(created);
        return created;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const found = transactions.find((t) => t.externalEventId === where.externalEventId);
        if (!found) return null;
        return { ...found, ledgerEntries: ledgerEntries.filter((e) => e.transactionId === found.id) };
      }),
    },
    pointLedgerEntry: {
      create: jest.fn(async ({ data }: any) => {
        const created = { id: `ledger-${ledgerEntries.length + 1}`, ...data };
        ledgerEntries.push(created);
        return created;
      }),
      aggregate: jest.fn(async () => ({
        _sum: { pointsChange: ledgerEntries.reduce((sum, e) => sum + e.pointsChange, 0) },
      })),
    },
    cheque: {
      create: jest.fn(async ({ data }: any) => {
        const created = { id: `cheque-${cheques.length + 1}`, ...data };
        cheques.push(created);
        return created;
      }),
    },
    account: {
      update: jest.fn(async ({ data }: any) => {
        Object.assign(account, data);
        return { ...account };
      }),
      findUniqueOrThrow: jest.fn(async () => ({ ...account })),
      findMany: jest.fn(async () => [{ id: account.id }]),
    },
    pointsEngineConfig: {
      findFirst: jest.fn(async () => (configs.length ? configs[configs.length - 1] : null)),
      create: jest.fn(async ({ data }: any) => {
        const created = { id: `cfg-${configs.length + 1}`, ...data };
        configs.push(created);
        return created;
      }),
    },
  };

  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  return { prisma, state: { account, ledgerEntries, cheques, transactions, configs } };
}

const audit = { log: jest.fn(async () => undefined) };

describe('PointsEngineService', () => {
  beforeEach(() => audit.log.mockClear());

  it('computeEarnedPoints redondea hacia abajo (floor)', () => {
    const { prisma } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 0 });
    const service = new PointsEngineService(prisma, audit as any);
    expect(service.computeEarnedPoints(19.99, { earnRatio: 1 as any })).toBe(19);
    expect(service.computeEarnedPoints(20, { earnRatio: 0.5 as any })).toBe(10);
  });

  it('acumula puntos sin emitir cheque si no llega al umbral', async () => {
    const { prisma, state } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 100 });
    prisma.account.findUnique = jest.fn(async () => state.account);
    const service = new PointsEngineService(prisma, audit as any);

    const result = await service.accruePurchase({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-1',
      amount: 50,
    } as any);

    expect(result.pointsEarned).toBe(50);
    expect(result.chequesIssued).toHaveLength(0);
    expect(result.account.currentBalance).toBe(150);
  });

  it('emite un cheque al cruzar el umbral de 250 puntos', async () => {
    const { prisma, state } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 240 });
    prisma.account.findUnique = jest.fn(async () => state.account);
    const service = new PointsEngineService(prisma, audit as any);

    const result = await service.accruePurchase({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-2',
      amount: 20,
    } as any);

    expect(result.pointsEarned).toBe(20);
    expect(result.chequesIssued).toHaveLength(1);
    expect(result.chequesIssued[0].value).toBe('5');
    expect(result.account.currentBalance).toBe(10); // 240 + 20 - 250
  });

  it('emite múltiples cheques si la compra cruza varios umbrales de una vez', async () => {
    const { prisma, state } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 0 });
    prisma.account.findUnique = jest.fn(async () => state.account);
    const service = new PointsEngineService(prisma, audit as any);

    const result = await service.accruePurchase({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-3',
      amount: 600, // 600 puntos -> 2 cheques (500), quedan 100
    } as any);

    expect(result.pointsEarned).toBe(600);
    expect(result.chequesIssued).toHaveLength(2);
    expect(result.account.currentBalance).toBe(100);
  });

  it('lanza NotFoundException si la cuenta del socio no existe', async () => {
    const { prisma } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 0 });
    prisma.account.findUnique = jest.fn(async () => null);
    const service = new PointsEngineService(prisma, audit as any);

    await expect(
      service.accruePurchase({ type: 'purchase', customerId: 'ghost', externalEventId: 'evt-x', amount: 10 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revierte los puntos de una compra devuelta y no deja el saldo negativo', async () => {
    const { prisma, state } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 0 });
    prisma.account.findUnique = jest.fn(async () => state.account);
    const service = new PointsEngineService(prisma, audit as any);

    await service.accruePurchase({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-4',
      amount: 30,
    } as any);
    expect(state.account.currentBalance).toBe(30);

    const reversal = await service.reversePurchase({
      type: 'return',
      customerId: 'cus-1',
      externalEventId: 'evt-4-return',
      originalExternalEventId: 'evt-4',
      amount: 30,
    } as any);

    expect(reversal.pointsReversed).toBe(30);
    expect(reversal.account.currentBalance).toBe(0);
  });

  it('recalculateAllBalances deriva el saldo desde la suma del ledger', async () => {
    const { prisma, state } = buildPrismaMock({ id: 'acc-1', customerId: 'cus-1', currentBalance: 0 });
    prisma.account.findUnique = jest.fn(async () => state.account);
    const service = new PointsEngineService(prisma, audit as any);

    await service.accruePurchase({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-5',
      amount: 300,
    } as any);
    // Se desincroniza el saldo a propósito para probar la reconciliación.
    state.account.currentBalance = 999;

    const result = await service.recalculateAllBalances('admin-1');

    expect(result.accountsUpdated).toBe(1);
    expect(state.account.currentBalance).toBe(50); // 300 ganados - 250 del cheque
  });
});

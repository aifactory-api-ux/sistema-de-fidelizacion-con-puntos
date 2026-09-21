import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChequesService } from './cheques.service';

const audit = { log: jest.fn(async () => undefined) };
const pointsEngine: any = {
  getCurrentConfig: jest.fn(async () => ({ chequeValue: 5, chequeExpiryDays: 90 })),
};

function buildPrisma(cheque: any) {
  const store = { ...cheque };
  return {
    cheque: {
      findUnique: jest.fn(async () => ({ ...store })),
      update: jest.fn(async ({ data }: any) => {
        Object.assign(store, data);
        return { ...store };
      }),
      create: jest.fn(async ({ data }: any) => ({ id: 'cheque-new', ...data })),
      findMany: jest.fn(async () => [store]),
    },
    transaction: { create: jest.fn(async ({ data }: any) => ({ id: 'txn-1', ...data })) },
    account: { findUnique: jest.fn(async () => ({ id: 'acc-1', customerId: 'cus-1' })) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
}

describe('ChequesService', () => {
  beforeEach(() => audit.log.mockClear());

  it('canjea un cheque activo y registra la transacción de redención', async () => {
    const prisma: any = buildPrisma({
      id: 'chq-1',
      accountId: 'acc-1',
      value: '5',
      status: 'ACTIVE',
      expiryDate: new Date(Date.now() + 86400000),
    });
    const service = new ChequesService(prisma, audit as any, pointsEngine);

    const result = await service.redeem('chq-1', { orderId: 'order-9' }, 'user-1');

    expect(result.status).toBe('REDEEMED');
    expect(result.redemptionOrderId).toBe('order-9');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'cheque.redeemed' }));
  });

  it('rechaza canjear un cheque que no está ACTIVE', async () => {
    const prisma: any = buildPrisma({
      id: 'chq-2',
      accountId: 'acc-1',
      value: '5',
      status: 'REDEEMED',
      expiryDate: new Date(Date.now() + 86400000),
    });
    const service = new ChequesService(prisma, audit as any, pointsEngine);

    await expect(service.redeem('chq-2', { orderId: 'o' }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marca EXPIRED automáticamente si el cheque venció y bloquea el canje', async () => {
    const prisma: any = buildPrisma({
      id: 'chq-3',
      accountId: 'acc-1',
      value: '5',
      status: 'ACTIVE',
      expiryDate: new Date(Date.now() - 86400000),
    });
    const service = new ChequesService(prisma, audit as any, pointsEngine);

    await expect(service.redeem('chq-3', { orderId: 'o' }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    const cheque = await service.getById('chq-3');
    expect(cheque.status).toBe('EXPIRED');
  });

  it('rechaza anular un cheque ya canjeado', async () => {
    const prisma: any = buildPrisma({ id: 'chq-4', accountId: 'acc-1', value: '5', status: 'REDEEMED' });
    const service = new ChequesService(prisma, audit as any, pointsEngine);

    await expect(service.void('chq-4', { reason: 'fraude' }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza NotFoundException al operar sobre un cheque inexistente', async () => {
    const prisma: any = buildPrisma({ id: 'chq-5', accountId: 'acc-1', value: '5', status: 'ACTIVE' });
    prisma.cheque.findUnique = jest.fn(async () => null);
    const service = new ChequesService(prisma, audit as any, pointsEngine);

    await expect(service.void('missing', { reason: 'x' }, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

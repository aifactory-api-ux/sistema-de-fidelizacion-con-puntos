import { EventsService } from './events.service';

describe('EventsService', () => {
  it('no reprocesa un evento cuyo externalEventId ya existe (idempotencia)', async () => {
    const prisma: any = {
      transaction: { findUnique: jest.fn(async () => ({ id: 'txn-existing' })) },
    };
    const pointsEngine: any = { accruePurchase: jest.fn(), reversePurchase: jest.fn() };
    const service = new EventsService(prisma, pointsEngine);

    const result = await service.ingest({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-dup',
      amount: 10,
    } as any);

    expect(result).toEqual({ idempotentReplay: true, transactionId: 'txn-existing' });
    expect(pointsEngine.accruePurchase).not.toHaveBeenCalled();
  });

  it('procesa un evento nuevo delegando en el motor de puntos', async () => {
    const prisma: any = { transaction: { findUnique: jest.fn(async () => null) } };
    const pointsEngine: any = {
      accruePurchase: jest.fn(async () => ({ pointsEarned: 10, chequesIssued: [], transactionId: 'txn-1' })),
      reversePurchase: jest.fn(),
    };
    const service = new EventsService(prisma, pointsEngine);

    const result = await service.ingest({
      type: 'purchase',
      customerId: 'cus-1',
      externalEventId: 'evt-new',
      amount: 10,
    } as any);

    expect(result.idempotentReplay).toBe(false);
    expect(pointsEngine.accruePurchase).toHaveBeenCalledTimes(1);
  });

  it('ingestBatch procesa los eventos en orden y agrega los resultados', async () => {
    const prisma: any = { transaction: { findUnique: jest.fn(async () => null) } };
    const pointsEngine: any = {
      accruePurchase: jest.fn(async () => ({ pointsEarned: 1, chequesIssued: [], transactionId: 't' })),
      reversePurchase: jest.fn(),
    };
    const service = new EventsService(prisma, pointsEngine);

    const result = await service.ingestBatch([
      { type: 'purchase', customerId: 'a', externalEventId: 'e1', amount: 1 } as any,
      { type: 'purchase', customerId: 'a', externalEventId: 'e2', amount: 1 } as any,
    ]);

    expect(result.processed).toBe(2);
    expect(pointsEngine.accruePurchase).toHaveBeenCalledTimes(2);
  });
});

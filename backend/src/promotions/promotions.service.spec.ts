import { NotFoundException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

const audit = { log: jest.fn(async () => undefined) };
const cache = { getOrSet: jest.fn(async (_k: string, _t: number, load: () => Promise<unknown>) => load()), invalidate: jest.fn() };

function buildPrisma(promotionExists = true) {
  return {
    promotion: {
      findUnique: jest.fn(async () => (promotionExists ? { id: 'promo-1' } : null)),
    },
    customerPromotion: { upsert: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
}

describe('PromotionsService.assign', () => {
  beforeEach(() => audit.log.mockClear());

  it('asigna la promoción a cada cliente y audita la acción', async () => {
    const prisma: any = buildPrisma(true);
    const service = new PromotionsService(prisma, audit as any, cache as any);

    const result = await service.assign({ promotionId: 'promo-1', customerIds: ['c1', 'c2'] }, 'admin-1');

    expect(result).toEqual({ assigned: 2 });
    expect(prisma.customerPromotion.upsert).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'promotion.assigned' }));
  });

  it('lanza NotFoundException si la promoción no existe', async () => {
    const prisma: any = buildPrisma(false);
    const service = new PromotionsService(prisma, audit as any, cache as any);

    await expect(service.assign({ promotionId: 'ghost', customerIds: ['c1'] }, 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

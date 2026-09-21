import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface LogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: params.details ?? {},
      },
    });
  }

  async list(filters: { userId?: string; entityType?: string; from?: Date; to?: Date }) {
    return this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        entityType: filters.entityType,
        createdAt:
          filters.from || filters.to
            ? { gte: filters.from, lte: filters.to }
            : undefined,
      },
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getById(logId: string) {
    return this.prisma.auditLog.findUnique({
      where: { id: logId },
      include: { user: { select: { email: true, role: true } } },
    });
  }
}

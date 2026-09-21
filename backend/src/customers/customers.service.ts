import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getById(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { account: true, user: { select: { email: true } } },
    });
    if (!customer) throw new NotFoundException('Socio no encontrado');
    return customer;
  }

  async update(customerId: string, dto: UpdateCustomerDto, actorUserId: string) {
    await this.getById(customerId);
    const updated = await this.prisma.customer.update({ where: { id: customerId }, data: dto });
    await this.audit.log({
      userId: actorUserId,
      action: 'customer.updated',
      entityType: 'Customer',
      entityId: customerId,
      details: { ...dto } as Prisma.InputJsonValue,
    });
    return updated;
  }

  async getAccount(customerId: string) {
    const account = await this.prisma.account.findUnique({ where: { customerId } });
    if (!account) throw new NotFoundException('Cuenta de socio no encontrada');
    return account;
  }

  async getTransactions(customerId: string) {
    const account = await this.getAccount(customerId);
    return this.prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPointLedger(customerId: string) {
    const account = await this.getAccount(customerId);
    return this.prisma.pointLedgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** QR embebido como data URL — el socio lo muestra en tienda para identificarse. */
  async getQrCode(customerId: string) {
    const account = await this.getAccount(customerId);
    const payload = JSON.stringify({ customerId, accountId: account.id });
    const dataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 1 });
    return { customerId, accountId: account.id, qrDataUrl: dataUrl };
  }
}

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.SOCIO,
        customer: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            consentAt: dto.consent ? new Date() : null,
            account: { create: { currentBalance: 0 } },
          },
        },
      },
      include: { customer: true },
    });

    await this.audit.log({
      userId: user.id,
      action: 'customer.registered',
      entityType: 'Customer',
      entityId: user.customer!.id,
      details: { email: user.email },
    });

    const tokens = this.issueTokens(user.id, user.email, user.role, user.customer!.id);
    return { ...tokens, customerId: user.customer!.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { customer: true },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const tokens = this.issueTokens(user.id, user.email, user.role, user.customer?.id ?? null);
    return { ...tokens, customerId: user.customer?.id ?? null, role: user.role };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token no es un refresh token');
    }
    return this.issueTokens(payload.sub, payload.email, payload.role, payload.customerId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id ?? null,
      firstName: user.customer?.firstName ?? null,
      lastName: user.customer?.lastName ?? null,
    };
  }

  private issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    customerId: string | null,
  ): AuthTokens {
    const base = { sub: userId, email, role, customerId };
    const accessToken = this.jwt.sign(
      { ...base, type: 'access' } satisfies JwtPayload,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = this.jwt.sign(
      { ...base, type: 'refresh' } satisfies JwtPayload,
      { expiresIn: REFRESH_TOKEN_TTL },
    );
    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
  }
}

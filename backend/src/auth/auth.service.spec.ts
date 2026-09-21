import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

const audit = { log: jest.fn(async () => undefined) };

function buildJwt() {
  return {
    sign: jest.fn((payload: any) => `signed.${payload.type}.${payload.sub}`),
    verify: jest.fn((token: string) => {
      const [, type, sub] = token.split('.');
      return { sub, email: 'a@a.com', role: UserRole.SOCIO, customerId: 'cus-1', type };
    }),
  };
}

describe('AuthService', () => {
  beforeEach(() => audit.log.mockClear());

  it('registra un socio nuevo, crea su cuenta con saldo 0 y devuelve tokens', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({
          id: 'user-1',
          email: data.email,
          role: data.role,
          customer: { id: 'cus-1' },
        })),
      },
    };
    const service = new AuthService(prisma, buildJwt() as any, audit as any);

    const result = await service.register({
      email: 'nueva@socio.com',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Pérez',
    } as any);

    expect(result.accessToken).toContain('signed.access.user-1');
    expect(result.refreshToken).toContain('signed.refresh.user-1');
    expect(result.customerId).toBe('cus-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'customer.registered' }));
  });

  it('rechaza el registro si el email ya existe', async () => {
    const prisma: any = { user: { findUnique: jest.fn(async () => ({ id: 'existing' })) } };
    const service = new AuthService(prisma, buildJwt() as any, audit as any);

    await expect(
      service.register({ email: 'dup@x.com', password: 'password123', firstName: 'A', lastName: 'B' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login exitoso con contraseña correcta', async () => {
    const passwordHash = await bcrypt.hash('correcta123', 10);
    const prisma: any = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'user-2',
          email: 'x@x.com',
          role: UserRole.SOCIO,
          passwordHash,
          customer: { id: 'cus-2' },
        })),
      },
    };
    const service = new AuthService(prisma, buildJwt() as any, audit as any);

    const result = await service.login({ email: 'x@x.com', password: 'correcta123' } as any);

    expect(result.customerId).toBe('cus-2');
    expect(result.accessToken).toBeDefined();
  });

  it('login falla con contraseña incorrecta', async () => {
    const passwordHash = await bcrypt.hash('correcta123', 10);
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ id: 'user-3', passwordHash, role: UserRole.SOCIO })) },
    };
    const service = new AuthService(prisma, buildJwt() as any, audit as any);

    await expect(service.login({ email: 'x@x.com', password: 'incorrecta' } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('login falla si el email no existe (sin filtrar si es el email o la contraseña)', async () => {
    const prisma: any = { user: { findUnique: jest.fn(async () => null) } };
    const service = new AuthService(prisma, buildJwt() as any, audit as any);

    await expect(service.login({ email: 'ghost@x.com', password: 'x' } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh emite nuevos tokens a partir de un refresh token válido', async () => {
    const service = new AuthService({} as any, buildJwt() as any, audit as any);
    const result = await service.refresh('signed.refresh.user-4');
    expect(result.accessToken).toContain('signed.access.user-4');
  });

  it('refresh rechaza un access token usado en lugar de un refresh token', async () => {
    const service = new AuthService({} as any, buildJwt() as any, audit as any);
    await expect(service.refresh('signed.access.user-4')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

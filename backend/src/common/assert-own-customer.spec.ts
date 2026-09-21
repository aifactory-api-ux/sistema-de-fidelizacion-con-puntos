import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { assertOwnCustomerOrStaff } from './assert-own-customer';

describe('assertOwnCustomerOrStaff', () => {
  it('permite a un SOCIO acceder a sus propios datos', () => {
    expect(() =>
      assertOwnCustomerOrStaff({ userId: 'u1', email: 'a@a.com', role: UserRole.SOCIO, customerId: 'cus-1' }, 'cus-1'),
    ).not.toThrow();
  });

  it('bloquea a un SOCIO que intenta acceder a otro socio', () => {
    expect(() =>
      assertOwnCustomerOrStaff({ userId: 'u1', email: 'a@a.com', role: UserRole.SOCIO, customerId: 'cus-1' }, 'cus-2'),
    ).toThrow(ForbiddenException);
  });

  it('permite a ADMIN, ATENCION_CLIENTE y AUDITOR acceder a cualquier socio', () => {
    for (const role of [UserRole.ADMIN, UserRole.ATENCION_CLIENTE, UserRole.AUDITOR]) {
      expect(() =>
        assertOwnCustomerOrStaff({ userId: 'staff', email: 's@a.com', role, customerId: null }, 'cus-2'),
      ).not.toThrow();
    }
  });
});

import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

/** Un SOCIO solo puede ver/editar sus propios datos; el staff interno
 * (admin/atención al cliente/auditor) puede consultar cualquier socio. */
export function assertOwnCustomerOrStaff(user: AuthenticatedUser, customerId: string): void {
  if (user.role === UserRole.SOCIO && user.customerId !== customerId) {
    throw new ForbiddenException('No podés acceder a datos de otro socio');
  }
}

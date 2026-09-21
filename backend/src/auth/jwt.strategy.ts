import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  customerId: string | null;
  type: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  customerId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Los refresh tokens solo son válidos contra POST /auth/refresh, nunca
    // como credencial de acceso general — se filtran acá.
    if (payload.type !== 'access') {
      throw new Error('Token inválido para este recurso');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      customerId: payload.customerId,
    };
  }
}

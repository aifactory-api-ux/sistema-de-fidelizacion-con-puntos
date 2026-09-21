import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const DEFAULT_TTL_SECONDS = 300; // LLD §10.2 — TTL de 300s para consultas frecuentes

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // no reintentar indefinidamente: cache es best-effort
    });
    this.client.on('error', (err) => this.logger.warn(`Redis no disponible, cache deshabilitada: ${err.message}`));
  }

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.client.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch {
      // Redis caído: seguimos sin cache en vez de romper el request.
    }

    const value = await load();

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds || DEFAULT_TTL_SECONDS);
    } catch {
      // ídem: si no se pudo escribir, no es un error de negocio.
    }

    return value;
  }

  async invalidate(key: string) {
    try {
      await this.client.del(key);
    } catch {
      // best-effort
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}

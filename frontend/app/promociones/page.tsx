'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { SocioHeader } from '@/components/SocioHeader';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { Promotion } from '@/lib/types';

function PromocionesContent() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Promotion[]>('/promotions')
      .then(setPromotions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink">Catálogo de Promociones</h1>
      <p className="mb-6 text-ink-secondary">Todas las promociones activas y vigentes del programa.</p>

      {loading ? (
        <p className="text-ink-secondary">Cargando…</p>
      ) : promotions.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-secondary">No hay promociones activas por el momento.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p) => (
            <Card key={p.id}>
              <div className="font-semibold text-ink">{p.name}</div>
              <p className="mt-1 text-sm text-ink-secondary">{p.description}</p>
              <div className="mt-3 text-xs text-ink-secondary">
                Vigente hasta {new Date(p.endDate).toLocaleDateString('es-ES')}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PromocionesPage() {
  return (
    <RequireAuth roles={['SOCIO']}>
      <SocioHeader />
      <PromocionesContent />
    </RequireAuth>
  );
}

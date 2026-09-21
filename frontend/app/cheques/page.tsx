'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { SocioHeader } from '@/components/SocioHeader';
import { Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Cheque, ChequeStatus } from '@/lib/types';

const FILTERS: { key: 'ALL' | ChequeStatus; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ACTIVE', label: 'Activos' },
  { key: 'REDEEMED', label: 'Usados' },
  { key: 'EXPIRED', label: 'Caducados' },
];

const STATUS_LABEL: Record<ChequeStatus, string> = {
  ACTIVE: 'Activo',
  REDEEMED: 'Usado',
  VOID: 'Anulado',
  EXPIRED: 'Caducado',
};

function ChequesContent() {
  const { user } = useAuth();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.customerId) return;
    api
      .get<Cheque[]>(`/customers/${user.customerId}/cheques`)
      .then(setCheques)
      .finally(() => setLoading(false));
  }, [user?.customerId]);

  const filtered = filter === 'ALL' ? cheques : cheques.filter((c) => c.status === filter);

  return (
    <div className="min-h-screen">
      <div className="bg-navy-deep px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-xs uppercase tracking-wide text-white/60">Tu programa de fidelización</div>
          <h1 className="mt-1 text-2xl font-bold">Mis Cheques</h1>
          <p className="mt-1 text-white/70">Consultá tus cheques activos, usados y caducados.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                filter === f.key ? 'bg-primary text-white' : 'bg-white text-ink-secondary hover:bg-primary-light'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-ink-secondary">Cargando…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-secondary">No hay cheques en esta categoría.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{c.value}€</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'ACTIVE'
                        ? 'bg-primary-light text-primary'
                        : c.status === 'REDEEMED'
                          ? 'bg-black/5 text-ink-secondary'
                          : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="mt-2 text-xs text-ink-secondary">
                  Código: {c.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-xs text-ink-secondary">
                  Vence: {new Date(c.expiryDate).toLocaleDateString('es-ES')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChequesPage() {
  return (
    <RequireAuth roles={['SOCIO']}>
      <SocioHeader />
      <ChequesContent />
    </RequireAuth>
  );
}

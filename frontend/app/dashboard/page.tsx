'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { SocioHeader } from '@/components/SocioHeader';
import { Card, ProgressBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Account, Cheque, Promotion, PointsEngineConfig, Transaction } from '@/lib/types';

function DashboardContent() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [config, setConfig] = useState<PointsEngineConfig | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.customerId) return;
    const customerId = user.customerId;
    Promise.all([
      api.get<Account[]>(`/customers/${customerId}/accounts`).then((a) => a[0] ?? null),
      api.get<PointsEngineConfig>('/admin/points-engine/config'),
      api.get<Cheque[]>(`/customers/${customerId}/cheques`),
      api.get<Promotion[]>(`/customers/${customerId}/promotions`),
      api.get<Transaction[]>(`/customers/${customerId}/transactions`),
    ])
      .then(([acc, cfg, chq, promo, txn]) => {
        setAccount(acc);
        setConfig(cfg);
        setCheques(chq);
        setPromotions(promo);
        setTransactions(txn.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [user?.customerId]);

  const activeCheques = cheques.filter((c) => c.status === 'ACTIVE');
  const threshold = config?.chequeThresholdPoints ?? 250;
  const balance = account?.currentBalance ?? 0;

  if (loading) {
    return <div className="p-10 text-center text-ink-secondary">Cargando tu cuenta…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <Card>
        <h1 className="text-2xl font-bold text-ink">Hola, {user?.firstName ?? 'socio/a'}</h1>
        <p className="mt-1 text-ink-secondary">
          Tu progreso está en marcha. Revisá tus puntos y descubrí nuevas formas de ahorrar.
        </p>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <div className="text-sm text-ink-secondary">Saldo de puntos</div>
          <div className="mt-1 text-3xl font-bold text-primary">{balance} pts</div>
        </Card>
        <Card>
          <div className="text-sm text-ink-secondary">Cheques activos</div>
          <div className="mt-1 text-3xl font-bold text-primary">{activeCheques.length}</div>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Progreso hacia tu próximo cheque</span>
          <span className="text-ink-secondary">
            {balance} / {threshold} pts
          </span>
        </div>
        <ProgressBar value={balance} max={threshold} />
        {balance === 0 && (
          <p className="mt-3 text-sm text-ink-secondary">
            Todavía no acumulaste puntos. ¡Tu primera compra elegible es el primer paso!
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Cheques de descuento disponibles</h2>
          <Link href="/cheques" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {activeCheques.length === 0 ? (
          <p className="text-sm text-ink-secondary">No tenés cheques activos por ahora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {activeCheques.map((c) => (
              <div key={c.id} className="rounded border border-primary/20 bg-primary-light p-4">
                <div className="text-lg font-bold text-primary">{c.value}€</div>
                <div className="text-xs text-ink-secondary">
                  Vence {new Date(c.expiryDate).toLocaleDateString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Promociones relevantes</h2>
          <Link href="/promociones" className="text-sm text-primary hover:underline">
            Ver catálogo
          </Link>
        </div>
        {promotions.length === 0 ? (
          <p className="text-sm text-ink-secondary">No hay promociones activas para vos en este momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {promotions.map((p) => (
              <div key={p.id} className="rounded border border-black/5 p-4">
                <div className="font-medium text-ink">{p.name}</div>
                <div className="text-xs text-ink-secondary">{p.description}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Últimos movimientos</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-ink-secondary">Todavía no tenés movimientos.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{t.description ?? t.type}</span>
                <span className="text-ink-secondary">{new Date(t.createdAt).toLocaleDateString('es-ES')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth roles={['SOCIO']}>
      <SocioHeader />
      <DashboardContent />
    </RequireAuth>
  );
}

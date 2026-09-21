'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

interface RecentActivityItem {
  type: 'transaction' | 'cheque';
  subtype: string;
  customerName: string;
  amount: string;
  at: string;
}

const STAT_LABELS: Record<keyof DashboardStats, string> = {
  activeCustomers: 'Socios activos',
  pointsIssued: 'Puntos emitidos',
  chequesIssued: 'Cheques emitidos',
  chequesRedeemed: 'Cheques canjeados',
  redemptionRate: 'Tasa de canje',
  activePromotions: 'Promociones activas',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    api.get<DashboardStats>('/admin/dashboard/stats').then(setStats);
    api.get<RecentActivityItem[]>('/admin/dashboard/recent-activity').then(setActivity);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard de Administración</h1>
        <p className="text-ink-secondary">Métricas clave del programa de fidelización.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats &&
          (Object.keys(STAT_LABELS) as (keyof DashboardStats)[]).map((key) => (
            <Card key={key}>
              <div className="text-sm text-ink-secondary">{STAT_LABELS[key]}</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {key === 'redemptionRate' ? `${Math.round(stats[key] * 100)}%` : stats[key]}
              </div>
            </Card>
          ))}
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Actividad reciente</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-ink-secondary">Sin actividad reciente todavía.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm">
            {activity.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-ink">
                  {item.customerName} — {item.subtype}
                </span>
                <span className="text-ink-secondary">{item.amount}€</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

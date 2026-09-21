'use client';

import { useEffect, useState } from 'react';
import { Card, Input, Label } from '@/components/ui';
import { api } from '@/lib/api';
import type { AuditLogEntry } from '@/lib/types';

export default function AuditoriaAdminPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    api.get<AuditLogEntry[]>(`/admin/audit-logs${params.toString() ? `?${params}` : ''}`).then(setLogs);
  }, [entityType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Auditoría</h1>
        <p className="text-ink-secondary">Registro inmutable de todas las operaciones del sistema.</p>
      </div>

      <Card>
        <Label>Filtrar por tipo de entidad</Label>
        <Input
          placeholder="Ej: Promotion, Cheque, PointsEngineConfig…"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </Card>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-ink-secondary">
              <th className="py-2">Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-black/5 align-top">
                <td className="whitespace-nowrap py-2 text-ink-secondary">
                  {new Date(log.createdAt).toLocaleString('es-ES')}
                </td>
                <td className="text-ink-secondary">{log.user?.email ?? '—'}</td>
                <td className="text-ink">{log.action}</td>
                <td className="text-ink-secondary">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                </td>
                <td className="max-w-xs truncate text-ink-secondary" title={JSON.stringify(log.details)}>
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="py-4 text-sm text-ink-secondary">Sin registros para este filtro.</p>}
      </Card>
    </div>
  );
}

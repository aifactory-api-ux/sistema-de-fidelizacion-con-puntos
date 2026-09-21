'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Input, Label, ErrorText } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { PointsEngineConfig } from '@/lib/types';

export default function PuntosAdminPage() {
  const [config, setConfig] = useState<PointsEngineConfig | null>(null);
  const [form, setForm] = useState({
    earnRatio: '',
    chequeThresholdPoints: '',
    chequeValue: '',
    chequeExpiryDays: '',
    changeReason: '',
  });
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<PointsEngineConfig>('/admin/points-engine/config').then((cfg) => {
      setConfig(cfg);
      setForm({
        earnRatio: cfg.earnRatio,
        chequeThresholdPoints: String(cfg.chequeThresholdPoints),
        chequeValue: cfg.chequeValue,
        chequeExpiryDays: String(cfg.chequeExpiryDays),
        changeReason: '',
      });
    });
  }

  useEffect(load, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await api.put('/admin/points-engine/config', {
        earnRatio: Number(form.earnRatio),
        chequeThresholdPoints: Number(form.chequeThresholdPoints),
        chequeValue: Number(form.chequeValue),
        chequeExpiryDays: Number(form.chequeExpiryDays),
        changeReason: form.changeReason || 'Ajuste desde panel de administración',
      });
      setMessage('Configuración actualizada. La nueva versión aplica solo a eventos futuros.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  async function onRecalculate() {
    setRecalculating(true);
    setMessage(null);
    try {
      const result = await api.post<{ accountsUpdated: number }>('/admin/points-engine/recalculate');
      setMessage(`Saldos recalculados en ${result.accountsUpdated} cuenta(s) a partir del ledger.`);
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Motor de Puntos</h1>
        <p className="text-ink-secondary">
          Configuración vigente: versión {config?.version ?? '—'}. Cada cambio queda versionado y auditado; no
          reescribe el historial transaccional.
        </p>
      </div>

      <Card>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Ratio de acumulación (puntos por € elegible)</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={form.earnRatio}
              onChange={(e) => setForm((f) => ({ ...f, earnRatio: e.target.value }))}
            />
          </div>
          <div>
            <Label>Umbral para emitir cheque (puntos)</Label>
            <Input
              type="number"
              required
              value={form.chequeThresholdPoints}
              onChange={(e) => setForm((f) => ({ ...f, chequeThresholdPoints: e.target.value }))}
            />
          </div>
          <div>
            <Label>Valor del cheque (€)</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={form.chequeValue}
              onChange={(e) => setForm((f) => ({ ...f, chequeValue: e.target.value }))}
            />
          </div>
          <div>
            <Label>Vigencia del cheque (días)</Label>
            <Input
              type="number"
              required
              value={form.chequeExpiryDays}
              onChange={(e) => setForm((f) => ({ ...f, chequeExpiryDays: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Motivo del cambio (auditoría)</Label>
            <Input
              value={form.changeReason}
              onChange={(e) => setForm((f) => ({ ...f, changeReason: e.target.value }))}
              placeholder="Ej: ajuste de campaña de verano"
            />
          </div>
          {error && (
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Publicar nueva versión'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-ink">Herramienta de reconciliación</h2>
        <p className="mb-3 text-sm text-ink-secondary">
          Recalcula el saldo de todas las cuentas a partir de la suma exacta del ledger. Útil si se sospecha una
          desincronización.
        </p>
        <Button variant="secondary" onClick={onRecalculate} disabled={recalculating}>
          {recalculating ? 'Recalculando…' : 'Recalcular saldos'}
        </Button>
      </Card>

      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}

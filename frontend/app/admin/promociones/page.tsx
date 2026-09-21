'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Input, Label, ErrorText } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { Promotion } from '@/lib/types';

const EMPTY_FORM = { name: '', description: '', startDate: '', endDate: '', priority: '0' };

export default function PromocionesAdminPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Promotion[]>('/admin/promotions').then(setPromotions);
  }

  useEffect(load, []);

  function startEdit(p: Promotion) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      startDate: p.startDate.slice(0, 10),
      endDate: p.endDate.slice(0, 10),
      priority: String(p.priority),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        priority: Number(form.priority),
      };
      if (editingId) {
        await api.put(`/admin/promotions/${editingId}`, payload);
      } else {
        await api.post('/admin/promotions', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos guardar la promoción');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    await api.delete(`/admin/promotions/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Promociones</h1>
        <p className="text-ink-secondary">Creá, editá y priorizá las campañas visibles para los socios.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nombre</Label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fecha de inicio</Label>
            <Input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fecha de fin</Label>
            <Input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Prioridad</Label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            />
          </div>
          {error && (
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {editingId ? 'Guardar cambios' : 'Crear promoción'}
            </Button>
            {editingId && (
              <Button type="button" variant="text" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-ink-secondary">
              <th className="py-2">Nombre</th>
              <th>Vigencia</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id} className="border-b border-black/5">
                <td className="py-2 text-ink">{p.name}</td>
                <td className="text-ink-secondary">
                  {new Date(p.startDate).toLocaleDateString('es-ES')} –{' '}
                  {new Date(p.endDate).toLocaleDateString('es-ES')}
                </td>
                <td className="text-ink-secondary">{p.priority}</td>
                <td className="text-ink-secondary">{p.active ? 'Activa' : 'Inactiva'}</td>
                <td className="flex gap-3 py-2 text-right">
                  <button onClick={() => startEdit(p)} className="text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => onDelete(p.id)} className="text-red-600 hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

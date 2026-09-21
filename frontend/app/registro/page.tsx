'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ApiError } from '@/lib/auth';
import { Button, Input, Label, ErrorText, Card } from '@/components/ui';

const STEPS = [
  { title: 'Datos de registro', description: 'Contanos quién sos para crear tu cuenta.' },
  { title: 'Confirmación', description: 'Revisá tus datos antes de unirte al programa.' },
  { title: 'Bienvenida', description: 'Empezá a acumular puntos desde tu primera compra.' },
];

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ ...form, consent });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos completar el registro');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md text-center">
          <div className="mb-2 text-xl font-bold text-primary">¡Bienvenida/o a CLUB+!</div>
          <p className="mb-6 text-sm text-ink-secondary">
            Tu cuenta está lista. Ya podés empezar a acumular puntos con tus compras elegibles y canjearlos por
            cheques de descuento.
          </p>
          <Button className="w-full" onClick={() => router.push('/dashboard')}>
            Ir a mi Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 text-lg font-bold text-primary">CLUB+</div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 rounded bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Sumate al programa de fidelización</h1>
          <p className="mt-2 text-ink-secondary">
            Acumulá puntos automáticamente por tus compras y convertilos en cheques de descuento de 5€ cada 250
            puntos.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded border border-black/5 bg-white p-4">
              <div className="mb-1 text-xs font-semibold text-primary">Paso {i + 1}</div>
              <div className="font-medium text-ink">{step.title}</div>
              <div className="text-xs text-ink-secondary">{step.description}</div>
            </div>
          ))}
        </div>

        <Card>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <Label>Teléfono (opcional)</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-secondary sm:col-span-2">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Acepto el tratamiento de mis datos para el programa de fidelización.
            </label>
            {error && (
              <div className="sm:col-span-2">
                <ErrorText>{error}</ErrorText>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          ¿Ya sos socio?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

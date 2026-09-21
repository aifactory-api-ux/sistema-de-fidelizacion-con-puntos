'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ApiError } from '@/lib/auth';
import { Button, Input, Label, ErrorText, Card } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-xl font-bold text-primary">CLUB+</div>
          <p className="mt-1 text-sm text-ink-secondary">Iniciá sesión en tu programa de fidelización</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-secondary">
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="text-primary hover:underline">
            Registrate
          </Link>
        </p>
      </Card>
    </div>
  );
}

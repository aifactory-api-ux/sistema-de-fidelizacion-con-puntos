'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '@/lib/auth';

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-secondary">
        Cargando…
      </div>
    );
  }

  return <>{children}</>;
}

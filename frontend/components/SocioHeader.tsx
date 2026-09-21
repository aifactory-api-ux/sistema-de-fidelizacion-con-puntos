'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard del Socio' },
  { href: '/cheques', label: 'Mis Cheques' },
  { href: '/promociones', label: 'Promociones' },
];

export function SocioHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            CLUB+
          </Link>
          <nav className="hidden gap-6 text-sm text-white/80 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? 'font-semibold text-white' : 'hover:text-white'}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-white/70 sm:inline">
            {user?.firstName} {user?.lastName}
          </span>
          <button onClick={logout} className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

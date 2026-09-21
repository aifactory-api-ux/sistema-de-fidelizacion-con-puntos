'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/puntos', label: 'Motor de Puntos' },
  { href: '/admin/promociones', label: 'Promociones' },
  { href: '/admin/auditoria', label: 'Auditoría' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col justify-between bg-navy-darker text-white">
      <div>
        <div className="px-5 py-6 text-lg font-bold tracking-tight">CLUB+ Admin</div>
        <nav className="flex flex-col gap-1 px-3 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 ${
                pathname === link.href ? 'bg-white/10 font-semibold text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/60">
        <div className="mb-2">{user?.email}</div>
        <button onClick={logout} className="rounded bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
          Salir
        </button>
      </div>
    </aside>
  );
}

'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['ADMIN']}>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-surface px-8 py-8">{children}</main>
      </div>
    </RequireAuth>
  );
}

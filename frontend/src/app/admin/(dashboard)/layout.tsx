'use client';

import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { ReactNode } from 'react';
import { IconDashboard, IconUsers, IconTenants } from '@/components/icons';

const links = [
  { label: 'Dashboard', href: '/admin', icon: <IconDashboard /> },
  { label: 'Usuários', href: '/admin/usuarios', icon: <IconUsers /> },
  { label: 'Tenants', href: '/admin/tenants', icon: <IconTenants /> },
];

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-surface-canvas transition-colors duration-300">
        <Sidebar links={links} title="DNA Care Admin" />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}

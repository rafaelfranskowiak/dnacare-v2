'use client';

import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { ReactNode } from 'react';
import { IconDashboard } from '@/components/icons';

const links = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar links={links} title="DNA Care" />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}

'use client';

import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import { ReactNode } from 'react';
import { IconDashboard, IconOpportunities, IconClients, IconChart, IconTeam, IconSettings } from '@/components/icons';

const links = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
  { label: 'Oportunidades', href: '/dashboard/oportunidades', icon: <IconOpportunities /> },
  { label: 'Vendas', href: '/dashboard/vendas', icon: <IconChart /> },
  { label: 'Clientes', href: '/dashboard/clientes', icon: <IconClients /> },
  { label: 'Equipe', href: '/dashboard/equipe', icon: <IconTeam /> },
  { label: 'Relatórios', href: '/dashboard/relatorios', icon: <IconChart /> },
  { label: 'Configurações', href: '/dashboard/config', icon: <IconSettings /> },
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

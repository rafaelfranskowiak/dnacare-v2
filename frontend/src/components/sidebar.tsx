'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/auth';

export interface SidebarLink {
  label: string;
  href: string;
  icon: ReactNode;
}

interface SidebarProps {
  links: SidebarLink[];
  title?: string;
}

export default function Sidebar({ links, title = 'DNA Care' }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isClientesRoute = pathname?.startsWith('/dashboard/clientes');
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ${
        isClientesRoute ? 'border-r border-[#2b313b] bg-[#14171d]' : 'border-r border-edge bg-surface'
      } ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div
        className={`flex h-16 items-center ${
          isClientesRoute ? 'border-b border-[#2b313b]' : 'border-b border-edge'
        } ${
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-6'
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand shadow-sm">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
          </svg>
        </div>
        {!collapsed && <span className={`text-sm font-semibold ${isClientesRoute ? 'text-slate-100' : 'text-ink'}`}>{title}</span>}
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                collapsed ? 'justify-center' : 'gap-3'
              } ${
                isActive
                  ? isClientesRoute
                    ? 'border border-emerald-400/20 bg-emerald-500/10 font-medium text-emerald-300'
                    : 'border border-brand/15 bg-brand/10 font-medium text-brand dark:bg-brand/10'
                  : isClientesRoute
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    : 'text-ink-secondary hover:bg-surface-canvas hover:text-ink'
              }`}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand" />
              )}
              <span
                className={`shrink-0 ${
                  isClientesRoute
                    ? isActive
                      ? 'text-emerald-300'
                      : 'text-slate-500 group-hover:text-slate-300'
                    : isActive
                      ? 'text-brand'
                      : 'text-ink-tertiary group-hover:text-ink-secondary'
                }`}
              >
                {link.icon}
              </span>
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      <div className={`p-3 ${isClientesRoute ? 'border-t border-[#2b313b]' : 'border-t border-edge'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex w-full items-center rounded-lg px-3 py-2 transition-colors ${
            collapsed ? 'justify-center' : 'gap-3'
          } ${
            isClientesRoute
              ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              : 'text-ink-tertiary hover:bg-surface-canvas hover:text-ink'
          }`}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={
                collapsed
                  ? 'M8.25 4.5l7.5 7.5-7.5 7.5'
                  : 'M15.75 19.5L8.25 12l7.5-7.5'
              }
            />
          </svg>
          {!collapsed && <span className="text-sm">Recolher</span>}
        </button>

        <div
          className={`mt-2 flex items-center rounded-lg px-3 py-2 ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
              isClientesRoute ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-edge-soft bg-brand/10 text-brand'
            }`}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className={`text-sm font-medium ${isClientesRoute ? 'text-slate-100' : 'text-ink'}`}>{user?.name || 'Admin'}</p>
              <p className={`text-xs ${isClientesRoute ? 'text-slate-400' : 'text-ink-tertiary'}`}>{user?.email || 'admin@app.com'}</p>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`mt-1 flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
            collapsed ? 'justify-center' : 'gap-3'
          } ${
            isClientesRoute
              ? 'text-slate-400 hover:bg-red-500/10 hover:text-red-300'
              : 'text-ink-tertiary hover:bg-danger/10 hover:text-danger'
          }`}
          title="Sair"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  );
}

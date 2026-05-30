'use client';

import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';
import { usePathname } from 'next/navigation';

type HeaderMeta = {
  title: string;
  subtitle: string;
};

type RouteMeta = {
  match: (pathname: string) => boolean;
  meta: HeaderMeta;
};

const routeMeta: RouteMeta[] = [
  { match: (pathname) => pathname.startsWith('/dashboard/clientes/') && pathname.split('/').length === 6, meta: { title: 'Dependente', subtitle: 'Detalhes do dependente vinculado ao titular.' } },
  { match: (pathname) => pathname.startsWith('/dashboard/clientes/') && pathname.split('/').length === 4, meta: { title: 'Cliente', subtitle: 'Detalhes do cliente e situação financeira.' } },
  { match: (pathname) => pathname === '/dashboard/clientes', meta: { title: 'Clientes', subtitle: 'Gerencie os clientes vinculados ao seu plano.' } },
  { match: (pathname) => pathname.startsWith('/dashboard/oportunidades/') && pathname.split('/').length === 4, meta: { title: 'Oportunidade', subtitle: 'Detalhes da oportunidade e do processo de venda.' } },
  { match: (pathname) => pathname === '/dashboard/oportunidades', meta: { title: 'Oportunidades', subtitle: 'Gerencie as oportunidades de venda.' } },
  { match: (pathname) => pathname.startsWith('/dashboard/vendas/') && pathname.split('/').length === 4, meta: { title: 'Venda', subtitle: 'Detalhes da venda e da cobrança associada.' } },
  { match: (pathname) => pathname === '/dashboard/vendas', meta: { title: 'Vendas', subtitle: 'Histórico de vendas da unidade.' } },
  { match: (pathname) => pathname === '/dashboard/relatorios', meta: { title: 'Relatórios', subtitle: 'Indicadores operacionais da unidade.' } },
  { match: (pathname) => pathname === '/dashboard/equipe', meta: { title: 'Equipe', subtitle: 'Gerencie usuários e times da unidade.' } },
  { match: (pathname) => pathname === '/dashboard/config', meta: { title: 'Configurações da Unidade', subtitle: 'Dados da unidade e integração com Asaas.' } },
  { match: (pathname) => pathname === '/dashboard', meta: { title: 'Dashboard', subtitle: 'Visão geral da operação.' } },
  { match: (pathname) => pathname === '/admin/tenants', meta: { title: 'Tenants', subtitle: 'Gerencie as unidades e a integração com Asaas.' } },
  { match: (pathname) => pathname === '/admin/usuarios', meta: { title: 'Usuários', subtitle: 'Gerencie os usuários da plataforma.' } },
  { match: (pathname) => pathname === '/admin/planos', meta: { title: 'Planos', subtitle: 'Gerencie os planos disponíveis para as unidades.' } },
  { match: (pathname) => pathname === '/admin', meta: { title: 'Dashboard Global', subtitle: 'Visão consolidada da plataforma.' } },
];

function resolveHeaderMeta(pathname: string | null): HeaderMeta {
  if (!pathname) {
    return { title: 'Dashboard', subtitle: 'Visão geral da operação.' };
  }

  const match = routeMeta.find((item) => item.match(pathname));
  return match?.meta ?? { title: 'Dashboard', subtitle: 'Visão geral da operação.' };
}

export default function Header() {
  const { user } = useAuth();
  const { mounted, theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const isClientesRoute = pathname?.startsWith('/dashboard/clientes');
  const { title, subtitle } = resolveHeaderMeta(pathname);
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <header
      className={`h-16 overflow-hidden border-b transition-colors duration-300 ${
        isClientesRoute ? 'border-[#2b313b] bg-[#14171d] text-slate-100' : 'border-edge bg-surface'
      }`}
    >
      <div className="flex h-full items-center justify-between gap-6 px-8">
        <div className="flex h-full min-w-0 flex-col justify-center">
          <h1 className={`truncate text-base font-semibold leading-tight ${isClientesRoute ? 'text-slate-100' : 'text-ink'}`}>
            {title}
          </h1>
          <p className={`truncate text-xs leading-tight ${isClientesRoute ? 'text-slate-400' : 'text-ink-tertiary'}`}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {user?.is_platform_admin && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                isClientesRoute ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-warning/20 bg-warning/10 text-warning'
              }`}
            >
              Platform Admin
            </span>
          )}

          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 transition-colors ${
              isClientesRoute
                ? 'border-[#2b313b] bg-[#1a1d24] text-slate-300 hover:bg-[#222630] hover:text-slate-100'
                : 'border-edge bg-surface-elevated text-ink-secondary hover:bg-surface-canvas hover:text-ink'
            }`}
            aria-label="Notificações"
            title="Notificações"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.9 23.9 0 0 1-4.714 0m4.714 0a3 3 0 1 0-4.714 0m4.714 0L19.5 16.5m-9.357.582L4.5 16.5m10.357-7.5a2.857 2.857 0 1 0-5.714 0c0 2.286-.571 4.286-1.714 6L3.75 16.5h16.5l-3.679-1.5c-1.143-1.714-1.714-3.714-1.714-6Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            disabled={!mounted}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isClientesRoute
                ? 'border-[#2b313b] bg-[#1a1d24] text-slate-300 hover:bg-[#222630] hover:text-slate-100'
                : 'border-edge bg-surface-elevated text-ink-secondary hover:bg-surface-canvas hover:text-ink'
            }`}
            aria-label={mounted && theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={mounted && theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {mounted && theme === 'dark' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.636-1.591 1.591M21 12h-2.25m-.636 6.364-1.591-1.591M12 18.75V21m-4.95-1.636 1.591-1.591M5.25 12H3m1.636-4.95 1.591 1.591M12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Z" />
                </svg>
                <span className="hidden sm:inline">Claro</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6a9.72 9.72 0 0 1 .748-3.752A9.753 9.753 0 1 0 21.752 15.002Z" />
                </svg>
                <span className="hidden sm:inline">Escuro</span>
              </>
            )}
          </button>

          <div className={`h-5 w-px ${isClientesRoute ? 'bg-[#2b313b]' : 'bg-edge'}`} />

          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                isClientesRoute ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-edge-soft bg-brand/10 text-brand'
              }`}
            >
              {initials}
            </div>
            <span className={`text-sm ${isClientesRoute ? 'text-slate-300' : 'text-ink-secondary'}`}>{user?.name || 'Admin'}</span>
          </div>

          <button
            onClick={logout}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isClientesRoute ? 'text-slate-400 hover:bg-red-500/10 hover:text-red-300' : 'text-ink-tertiary hover:bg-danger/10 hover:text-danger'
            }`}
            title="Sair"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/auth';
import { useTheme } from '@/lib/theme-context';

export default function Header() {
  const { user } = useAuth();
  const { mounted, theme, toggleTheme } = useTheme();
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <header className="flex h-16 items-center justify-between border-b border-edge bg-surface px-8 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-ink">Dashboard</h2>
        <span className="flex items-center gap-1.5 rounded-full border border-edge-soft bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand dark:bg-brand/10">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          default
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user?.is_platform_admin && (
          <span className="rounded-md border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            Platform Admin
          </span>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          disabled={!mounted}
          className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface-elevated px-3 py-2 text-sm text-ink-secondary transition-colors hover:bg-surface-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="h-5 w-px bg-edge" />

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-edge-soft bg-brand/10 text-xs font-semibold text-brand">
            {initials}
          </div>
          <span className="text-sm text-ink-secondary">{user?.name || 'Admin'}</span>
        </div>

        <button
          onClick={logout}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-tertiary transition hover:bg-danger/10 hover:text-danger"
          title="Sair"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}

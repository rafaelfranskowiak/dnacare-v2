'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.25 10.5 12 4l7.75 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25H5.5a1.25 1.25 0 0 1-1.25-1.25V10.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-5.25h6V20M8 10.5h.01M12 10.5h.01M16 10.5h.01" />
      </svg>
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5v10.5H3.75V6.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 7.5 7.5 6 7.5-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <rect width="13.5" height="11" x="5.25" y="10.25" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.25V7.5a3.75 3.75 0 1 1 7.5 0v2.75" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003/api';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'E-mail ou senha inválidos.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      if (data.tenantId) localStorage.setItem('tenantId', data.tenantId);
      router.push('/dashboard');
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-canvas">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-sm font-semibold tracking-tight text-ink">DNA Care</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Operação</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 text-xs text-ink-tertiary sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Ambiente seguro
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-24 lg:py-16">
          <section className="hidden max-w-xl lg:block">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-brand">Painel da unidade</p>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-ink xl:text-6xl">
              Clareza para cuidar da sua operação.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-ink-secondary">
              Acompanhe oportunidades, vendas, clientes e cobranças em um só lugar — com a visão certa para cada decisão.
            </p>

            <div className="mt-12 grid max-w-md grid-cols-2 gap-x-8 gap-y-6 border-t border-edge pt-6">
              <div>
                <p className="text-sm font-medium text-ink">Vendas em um só fluxo</p>
                <p className="mt-1 text-xs leading-5 text-ink-tertiary">Do primeiro contato à assinatura ativa.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Dados da sua unidade</p>
                <p className="mt-1 text-xs leading-5 text-ink-tertiary">Contexto separado, acesso controlado.</p>
              </div>
            </div>
          </section>

          <section className="w-full rounded-2xl border border-edge bg-surface p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Bem-vindo de volta</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">Entrar no painel</h2>
              <p className="mt-2 text-sm leading-6 text-ink-tertiary">Use as credenciais da sua unidade para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">E-mail</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><MailIcon /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="block w-full rounded-lg border border-edge bg-surface-input py-3 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-ink">Senha</label>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><LockIcon /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="block w-full rounded-lg border border-edge bg-surface-input py-3 pl-10 pr-11 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 rounded-md p-1.5 text-ink-muted transition hover:bg-surface hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                      {showPassword ? <><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 5.08A10.7 10.7 0 0 1 12 4.87c5.5 0 9 7.13 9 7.13a15.5 15.5 0 0 1-2.17 2.93M6.61 6.61C3.79 8.38 3 12 3 12s3.5 7.13 9 7.13a9.8 9.8 0 0 0 3.39-.61" /></> : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></>}
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3.5 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Entrando">
                    <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : <>Entrar <span aria-hidden="true">→</span></>}
              </button>
            </form>

            <div className="mt-7 flex items-start gap-2.5 border-t border-edge-soft pt-5 text-xs leading-5 text-ink-tertiary">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 19 6v5.25c0 4.5-2.92 7.8-7 9-4.08-1.2-7-4.5-7-9V6l7-2.25Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.25 12 1.75 1.75 3.75-4" />
              </svg>
              <span>Seu acesso é protegido e limitado aos dados da sua unidade.</span>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-edge-soft py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} DNA Care</span>
          <span>Gestão de assinaturas e relacionamento</span>
        </footer>
      </div>
    </main>
  );
}

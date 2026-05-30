'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type ClientRecord = {
  id: string;
  name: string;
  type: 'holder' | 'dependent' | string;
  phone?: string | null;
  document?: string | null;
  status: string;
  city?: string | null;
  state?: string | null;
};

type SummaryState = {
  totalLives: number;
  active: number;
  overdue: number;
  inactive: number;
  holders: number;
  dependents: number;
  activeHolders: number;
  activeDependents: number;
  overdueHolders: number;
  overdueDependents: number;
  inactiveHolders: number;
  inactiveDependents: number;
};

const PAGE_SIZE = 15;

const emptySummary: SummaryState = {
  totalLives: 0,
  active: 0,
  overdue: 0,
  inactive: 0,
  holders: 0,
  dependents: 0,
  activeHolders: 0,
  activeDependents: 0,
  overdueHolders: 0,
  overdueDependents: 0,
  inactiveHolders: 0,
  inactiveDependents: 0,
};

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatCity(client: ClientRecord) {
  const city = client.city?.trim();
  const state = client.state?.trim().toUpperCase();

  if (!city && !state) return '-';
  if (!city) return state || '-';
  if (!state) return city;
  return `${city} - ${state}`;
}

function formatStatusLabel(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'ativo') return 'Ativo';
  if (normalized === 'inadimplente') return 'Inadimplente';
  if (normalized === 'inativo') return 'Inativo';

  return status || '-';
}

function formatTypeLabel(type: string) {
  return type === 'holder' ? 'Titular' : 'Dependente';
}

function buildSummary(clients: ClientRecord[]): SummaryState {
  return clients.reduce<SummaryState>(
    (acc, client) => {
      const type = client.type === 'holder' ? 'holder' : 'dependent';
      const status = client.status?.trim().toLowerCase();

      acc.totalLives += 1;
      if (type === 'holder') acc.holders += 1;
      if (type === 'dependent') acc.dependents += 1;

      if (status === 'ativo') {
        acc.active += 1;
        if (type === 'holder') acc.activeHolders += 1;
        if (type === 'dependent') acc.activeDependents += 1;
      }

      if (status === 'inadimplente') {
        acc.overdue += 1;
        if (type === 'holder') acc.overdueHolders += 1;
        if (type === 'dependent') acc.overdueDependents += 1;
      }

      if (status === 'inativo') {
        acc.inactive += 1;
        if (type === 'holder') acc.inactiveHolders += 1;
        if (type === 'dependent') acc.inactiveDependents += 1;
      }

      return acc;
    },
    { ...emptySummary },
  );
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | 'ellipsis'> = [];
  let lastPage = 0;

  for (const page of sorted) {
    if (lastPage && page - lastPage > 1) {
      items.push('ellipsis');
    }

    items.push(page);
    lastPage = page;
  }

  return items;
}

function MetricCard({
  icon,
  accentClass,
  value,
  label,
  details,
}: {
  icon: ReactNode;
  accentClass: string;
  value: number;
  label: string;
  details: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-[#20232b] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${accentClass}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <div className={`text-[2rem] font-semibold leading-none tracking-tight ${accentClass.split(' ').pop() || 'text-slate-100'}`}>
            {value.toLocaleString('pt-BR')}
          </div>
          <div className="mt-1 text-sm text-slate-300">{label}</div>
          <div className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-400">{details}</div>
        </div>
      </div>
    </article>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" />
    </svg>
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api('/clients?limit=10000');
      const rows = Array.isArray(response?.data) ? (response.data as ClientRecord[]) : [];
      setClients(rows);
      setTotalRecords(response?.meta?.total ?? rows.length);
    } catch {
      setError('Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.push('/login');
      return;
    }

    void load();
  }, [load, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, ufFilter]);

  const summary = useMemo(() => buildSummary(clients), [clients]);

  const availableUfs = useMemo(() => {
    return Array.from(
      new Set(
        clients
          .map((client) => client.state?.trim().toUpperCase())
          .filter((state): state is string => Boolean(state)),
      ),
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clients]);

  const filteredClients = useMemo(() => {
    const query = normalizeSearch(search.trim());
    const phoneQuery = normalizeDigits(search);

    return clients.filter((client) => {
      if (typeFilter && client.type !== typeFilter) return false;
      if (statusFilter && client.status?.trim().toLowerCase() !== statusFilter) return false;
      if (ufFilter && client.state?.trim().toUpperCase() !== ufFilter) return false;

      if (!query && !phoneQuery) return true;

      const searchable = normalizeSearch(
        [client.name, client.document || '', client.phone || '', client.city || '', client.state || ''].join(' '),
      );

      if (query && searchable.includes(query)) return true;
      if (phoneQuery && normalizeDigits(client.phone || '').includes(phoneQuery)) return true;

      return false;
    });
  }, [clients, search, typeFilter, statusFilter, ufFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);
  const visibleClients = filteredClients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const recordLabel = `${filteredClients.length.toLocaleString('pt-BR')} de ${totalRecords.toLocaleString('pt-BR')} registros`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#12151b] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7.5-4.55-9.75-9.25C.58 7.61 3.32 4.5 6.75 4.5c1.97 0 3.71 1.06 4.75 2.67C12.54 5.56 14.28 4.5 16.25 4.5c3.43 0 6.17 3.11 4.5 7.25C19.5 16.45 12 21 12 21Z" />
              </svg>
            }
            accentClass="bg-emerald-500/10 text-emerald-300"
            value={summary.totalLives}
            label="Clientes totais"
            details={`Titulares: ${summary.holders}\nDependentes: ${summary.dependents}`}
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m5.25 2.25a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            accentClass="bg-emerald-500/10 text-emerald-300"
            value={summary.active}
            label="Ativos"
            details={`Titulares: ${summary.activeHolders}\nDependentes: ${summary.activeDependents}`}
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 2.82 17.14A2 2 0 0 0 4.55 20h14.9a2 2 0 0 0 1.73-2.86L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            }
            accentClass="bg-red-500/10 text-red-300"
            value={summary.overdue}
            label="Inadimplentes"
            details={`Titulares: ${summary.overdueHolders}\nDependentes: ${summary.overdueDependents}`}
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636 5.636 18.364M15 15l-6-6m10.182-2.182a8.25 8.25 0 1 1-11.677 11.677 8.25 8.25 0 0 1 11.677-11.677Z" />
              </svg>
            }
            accentClass="bg-slate-500/15 text-slate-300"
            value={summary.inactive}
            label="Inativos"
            details={`Titulares: ${summary.inactiveHolders}\nDependentes: ${summary.inactiveDependents}`}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#1a1d24] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-700/80 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, CPF ou telefone..."
                  className="h-12 w-full rounded-xl border border-slate-700 bg-[#2a2f37] px-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[480px]">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">Status</option>
                <option value="ativo">Ativos</option>
                <option value="inadimplente">Inadimplentes</option>
                <option value="inativo">Inativos</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">Tipo</option>
                <option value="holder">Titulares</option>
                <option value="dependent">Dependentes</option>
              </select>

              <select
                value={ufFilter}
                onChange={(event) => setUfFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">UF</option>
                {availableUfs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div className="shrink-0 text-sm text-slate-400">{recordLabel}</div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-slate-400">Carregando clientes...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={load}
                className="mt-4 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
              <p className="mt-1 text-xs text-slate-500">Ajuste os filtros ou refine a busca.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#171a20] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-medium">Nome</th>
                      <th className="px-5 py-4 font-medium">Tipo</th>
                      <th className="px-5 py-4 font-medium">Telefone</th>
                      <th className="px-5 py-4 font-medium">CPF</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/70">
                    {visibleClients.map((client) => (
                      <tr key={client.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <Link href={`/dashboard/clientes/${client.id}`} className="font-semibold text-slate-100 transition hover:text-emerald-300">
                            {client.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              client.type === 'holder'
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                : 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                            }`}
                          >
                            {formatTypeLabel(client.type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-200">{client.phone || '-'}</td>
                        <td className="px-5 py-4 text-slate-300">{client.document || '-'}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              client.status === 'ativo'
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                : client.status === 'inadimplente'
                                  ? 'border-red-500/20 bg-red-500/10 text-red-300'
                                  : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
                            }`}
                          >
                            {formatStatusLabel(client.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-200">{formatCity(client)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-700/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                  className="text-sm font-medium text-slate-400 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <div className="flex items-center justify-center gap-2">
                  {pageItems.map((item, index) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-slate-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                          item === safePage
                            ? 'bg-emerald-500 text-white'
                            : 'text-slate-300 hover:bg-white/[0.04] hover:text-slate-100'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                  className="text-sm font-medium text-slate-200 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próximo
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

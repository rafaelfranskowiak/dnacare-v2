'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import MetricCard from '@/components/dashboard/metric-card';
import Pagination from '@/components/dashboard/pagination';
import StatusBadge from '@/components/dashboard/status-badge';
import {
  PAGE_SIZE,
  formatDateBR,
  normalizeDigits,
  normalizeSearch,
} from '@/components/dashboard/utils';

type OpportunityRecord = {
  id: string;
  name: string;
  document: string;
  status: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  sellerId: string;
  createdAt?: string;
  created_at?: string;
};

type UserRecord = {
  id: string;
  name: string;
  email?: string | null;
};

type TenantUserRecord = {
  id: string;
  userId: string;
  teamId?: string | null;
  role?: string | null;
  status?: string | null;
};

type TeamRecord = {
  id: string;
  name: string;
};

type OpportunityView = OpportunityRecord & {
  sellerName: string;
  sellerEmail: string;
  sellerRole: string;
  teamId: string;
  teamName: string;
  createdLabel: string;
};

type SummaryState = {
  total: number;
  open: number;
  checkout: number;
  converted: number;
  cancelled: number;
};

const emptySummary: SummaryState = {
  total: 0,
  open: 0,
  checkout: 0,
  converted: 0,
  cancelled: 0,
};

function formatLocation(opportunity: { city?: string | null; state?: string | null }) {
  const city = opportunity.city?.trim();
  const state = opportunity.state?.trim().toUpperCase();

  if (!city && !state) return '-';
  if (!city) return state || '-';
  if (!state) return city;
  return `${city} - ${state}`;
}

function formatOpportunityStatus(status: string) {
  const normalized = status?.trim().toLowerCase();
  const labels: Record<string, string> = {
    aberta: 'Aberta',
    checkout_gerado: 'Checkout gerado',
    convertida: 'Convertida',
    cancelada: 'Cancelada',
  };

  return labels[normalized] || status || '-';
}

function statusTone(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'aberta') return 'info';
  if (normalized === 'checkout_gerado') return 'warning';
  if (normalized === 'convertida') return 'success';
  if (normalized === 'cancelada') return 'danger';
  return 'neutral';
}

function buildSummary(opportunities: OpportunityView[]): SummaryState {
  return opportunities.reduce<SummaryState>(
    (acc, opportunity) => {
      const status = opportunity.status?.trim().toLowerCase();

      acc.total += 1;
      if (status === 'aberta') acc.open += 1;
      if (status === 'checkout_gerado') acc.checkout += 1;
      if (status === 'convertida') acc.converted += 1;
      if (status === 'cancelada') acc.cancelled += 1;

      return acc;
    },
    { ...emptySummary },
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z" />
    </svg>
  );
}

export default function OportunidadesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const [opportunitiesRes, membersRes, usersRes, teamsRes] = await Promise.all([
        api('/opportunities?limit=10000'),
        api(`/tenant-users?tenant_id=${tenantId}`),
        api('/users'),
        api('/teams'),
      ]);

      const users = Array.isArray(usersRes?.data) ? (usersRes.data as UserRecord[]) : [];
      const members = Array.isArray(membersRes?.data) ? (membersRes.data as TenantUserRecord[]) : [];
      const teams = Array.isArray(teamsRes?.data) ? (teamsRes.data as TeamRecord[]) : [];
      const records = Array.isArray(opportunitiesRes?.data) ? (opportunitiesRes.data as OpportunityRecord[]) : [];

      const userMap = new Map(users.map((user) => [user.id, user]));
      const memberMap = new Map(members.map((member) => [member.userId, member]));
      const teamMap = new Map(teams.map((team) => [team.id, team]));

      const enriched = records.map<OpportunityView>((opportunity) => {
        const member = memberMap.get(opportunity.sellerId);
        const seller = userMap.get(opportunity.sellerId);
        const teamId = member?.teamId || '';
        const team = teamId ? teamMap.get(teamId) : null;
        const createdAt = opportunity.createdAt || opportunity.created_at;

        return {
          ...opportunity,
          sellerName: seller?.name || opportunity.sellerId || '-',
          sellerEmail: seller?.email || '',
          sellerRole: member?.role || '',
          teamId,
          teamName: team?.name || '-',
          createdLabel: formatDateBR(createdAt),
        };
      });

      setOpportunities(enriched);
      setTotalRecords(opportunitiesRes?.meta?.total ?? enriched.length);
    } catch {
      setError('Falha ao carregar oportunidades.');
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
  }, [search, statusFilter, sellerFilter, teamFilter]);

  const sellerOptions = useMemo(() => {
    const seen = new Set<string>();

    return opportunities
      .map((opportunity) => ({
        value: opportunity.sellerId,
        label: opportunity.sellerName,
        teamId: opportunity.teamId,
        teamName: opportunity.teamName,
      }))
      .filter((item) => {
        if (!item.value || !item.label) return false;
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [opportunities]);

  const teamOptions = useMemo(() => {
    const seen = new Set<string>();

    return opportunities
      .map((opportunity) => ({
        value: opportunity.teamId,
        label: opportunity.teamName,
      }))
      .filter((item) => {
        if (!item.value || item.label === '-') return false;
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [opportunities]);

  const summary = useMemo(() => buildSummary(opportunities), [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const query = normalizeSearch(search.trim());
    const phoneQuery = normalizeDigits(search);

    return opportunities.filter((opportunity) => {
      if (statusFilter && opportunity.status !== statusFilter) return false;
      if (sellerFilter && opportunity.sellerId !== sellerFilter) return false;
      if (teamFilter && opportunity.teamId !== teamFilter) return false;

      if (!query && !phoneQuery) return true;

      const searchable = normalizeSearch(
        [
          opportunity.name,
          opportunity.document || '',
          opportunity.phone || '',
          opportunity.sellerName || '',
          opportunity.teamName || '',
          opportunity.city || '',
          opportunity.state || '',
        ].join(' '),
      );

      if (query && searchable.includes(query)) return true;
      if (phoneQuery && normalizeDigits(opportunity.phone || '').includes(phoneQuery)) return true;

      return false;
    });
  }, [opportunities, search, sellerFilter, statusFilter, teamFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleOpportunities = filteredOpportunities.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const recordLabel = `${filteredOpportunities.length.toLocaleString('pt-BR')} de ${totalRecords.toLocaleString('pt-BR')} registros`;

  async function handleCreateOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');

    try {
      await api('/opportunities', {
        method: 'POST',
        body: JSON.stringify({ name, document }),
      });

      setShowCreate(false);
      setName('');
      setDocument('');
      await load();
    } catch (err: any) {
      setCreateError(err?.message || 'Falha ao criar oportunidade.');
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#12151b] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Nova Oportunidade
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h7.5m-7.5 4.5h7.5m-7.5 4.5H12m9-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            iconClassName="bg-cyan-500/10 text-cyan-300"
            valueClassName="text-cyan-300"
            value={summary.total.toLocaleString('pt-BR')}
            label="Oportunidades totais"
            details="Base geral da operação comercial"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v7.5m-3.75-3.75h7.5m4.5 0a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            iconClassName="bg-sky-500/10 text-sky-300"
            valueClassName="text-sky-300"
            value={summary.open.toLocaleString('pt-BR')}
            label="Abertas"
            details="Entradas em prospecção ou em andamento"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m5.25 2.25a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            iconClassName="bg-amber-500/10 text-amber-300"
            valueClassName="text-amber-300"
            value={summary.checkout.toLocaleString('pt-BR')}
            label="Checkout gerado"
            details="Oportunidades com checkout encaminhado"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m5.25 2.25a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            iconClassName="bg-emerald-500/10 text-emerald-300"
            valueClassName="text-emerald-300"
            value={summary.converted.toLocaleString('pt-BR')}
            label="Convertidas"
            details="Viraram venda com sucesso"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 2.82 17.14A2 2 0 0 0 4.55 20h14.9a2 2 0 0 0 1.73-2.86L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            }
            iconClassName="bg-red-500/10 text-red-300"
            valueClassName="text-red-300"
            value={summary.cancelled.toLocaleString('pt-BR')}
            label="Canceladas"
            details="Oportunidades encerradas sem conversão"
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
                  placeholder="Buscar por nome, CPF, telefone, vendedor ou time..."
                  className="h-12 w-full rounded-xl border border-slate-700 bg-[#2a2f37] px-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">Status</option>
                <option value="aberta">Aberta</option>
                <option value="checkout_gerado">Checkout gerado</option>
                <option value="convertida">Convertida</option>
                <option value="cancelada">Cancelada</option>
              </select>

              <select
                value={sellerFilter}
                onChange={(event) => setSellerFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">Vendedor</option>
                {sellerOptions.map((seller) => (
                  <option key={seller.value} value={seller.value}>
                    {seller.label}
                  </option>
                ))}
              </select>

              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="h-12 rounded-xl border border-slate-700 bg-[#2a2f37] px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              >
                <option value="">Time</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="shrink-0 text-sm text-slate-400">{recordLabel}</div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-slate-400">Carregando oportunidades...</p>
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
          ) : filteredOpportunities.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-slate-400">Nenhuma oportunidade encontrada.</p>
              <p className="mt-1 text-xs text-slate-500">Ajuste os filtros ou refine a busca.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#171a20] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-medium">Nome</th>
                      <th className="px-5 py-4 font-medium">Vendedor</th>
                      <th className="px-5 py-4 font-medium">Time</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Cidade</th>
                      <th className="px-5 py-4 font-medium w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/70">
                    {visibleOpportunities.map((opportunity) => (
                      <tr key={opportunity.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <Link href={`/dashboard/oportunidades/${opportunity.id}`} className="font-semibold text-slate-100 transition hover:text-emerald-300">
                            {opportunity.name}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {opportunity.document || '-'}
                            {opportunity.phone ? ` · ${opportunity.phone}` : ''}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-200">{opportunity.sellerName}</td>
                        <td className="px-5 py-4 text-slate-200">{opportunity.teamName}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={formatOpportunityStatus(opportunity.status)} tone={statusTone(opportunity.status)} />
                        </td>
                        <td className="px-5 py-4 text-slate-200">{formatLocation(opportunity)}</td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/oportunidades/${opportunity.id}`}
                            className="rounded-md px-2 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Nova Oportunidade</h2>
            <form onSubmit={handleCreateOpportunity} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-secondary">Nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-secondary">CPF/CNPJ</label>
                <input
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
              {createError && <p className="text-sm text-danger">{createError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary transition hover:bg-surface-canvas"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

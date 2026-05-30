'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import MetricCard from '@/components/dashboard/metric-card';
import Pagination from '@/components/dashboard/pagination';
import StatusBadge from '@/components/dashboard/status-badge';
import {
  PAGE_SIZE,
  formatCurrencyBR,
  formatDateBR,
  normalizeDigits,
  normalizeSearch,
} from '@/components/dashboard/utils';

type SaleRecord = {
  id: string;
  opportunityId: string;
  sellerId: string;
  teamId?: string | null;
  totalValue: string | number;
  paymentMethod: string;
  status: string;
  createdAt?: string;
  created_at?: string;
};

type OpportunityRecord = {
  id: string;
  name: string;
  document: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
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

type SaleView = SaleRecord & {
  opportunityName: string;
  opportunityDocument: string;
  opportunityPhone: string;
  sellerName: string;
  teamId: string;
  teamName: string;
  createdLabel: string;
};

type SummaryState = {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
};

const emptySummary: SummaryState = {
  total: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  revenue: 0,
};

function formatSaleStatus(status: string) {
  const normalized = status?.trim().toLowerCase();
  const labels: Record<string, string> = {
    pending_payment: 'Pendente',
    confirmed: 'Confirmada',
    cancelled_before_payment: 'Cancelada',
    failed: 'Falha',
    refunded: 'Estornada',
  };

  return labels[normalized] || status || '-';
}

function statusTone(status: string) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'pending_payment') return 'warning';
  if (normalized === 'confirmed') return 'success';
  if (normalized === 'cancelled_before_payment') return 'danger';
  if (normalized === 'failed') return 'danger';
  if (normalized === 'refunded') return 'neutral';
  return 'neutral';
}

function buildSummary(sales: SaleView[]): SummaryState {
  return sales.reduce<SummaryState>(
    (acc, sale) => {
      const status = sale.status?.trim().toLowerCase();
      const totalValue = Number(sale.totalValue || 0);

      acc.total += 1;
      if (status === 'pending_payment') acc.pending += 1;
      if (status === 'confirmed') {
        acc.confirmed += 1;
        acc.revenue += totalValue;
      }
      if (status === 'cancelled_before_payment') acc.cancelled += 1;

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

export default function VendasPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const [salesRes, opportunitiesRes, membersRes, usersRes, teamsRes] = await Promise.all([
        api('/sales?limit=10000'),
        api('/opportunities?limit=10000'),
        api(`/tenant-users?tenant_id=${tenantId}`),
        api('/users'),
        api('/teams'),
      ]);

      const opportunities = Array.isArray(opportunitiesRes?.data) ? (opportunitiesRes.data as OpportunityRecord[]) : [];
      const salesRows = Array.isArray(salesRes?.data) ? (salesRes.data as SaleRecord[]) : [];
      const users = Array.isArray(usersRes?.data) ? (usersRes.data as UserRecord[]) : [];
      const members = Array.isArray(membersRes?.data) ? (membersRes.data as TenantUserRecord[]) : [];
      const teams = Array.isArray(teamsRes?.data) ? (teamsRes.data as TeamRecord[]) : [];

      const opportunityMap = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
      const userMap = new Map(users.map((user) => [user.id, user]));
      const memberMap = new Map(members.map((member) => [member.userId, member]));
      const teamMap = new Map(teams.map((team) => [team.id, team]));

      const enriched = salesRows.map<SaleView>((sale) => {
        const opportunity = opportunityMap.get(sale.opportunityId);
        const member = memberMap.get(sale.sellerId);
        const seller = userMap.get(sale.sellerId);
        const teamId = sale.teamId || member?.teamId || '';
        const team = teamId ? teamMap.get(teamId) : null;
        const createdAt = sale.createdAt || sale.created_at;

        return {
          ...sale,
          opportunityName: opportunity?.name || sale.opportunityId || '-',
          opportunityDocument: opportunity?.document || '-',
          opportunityPhone: opportunity?.phone || '-',
          sellerName: seller?.name || sale.sellerId || '-',
          teamId,
          teamName: team?.name || '-',
          createdLabel: formatDateBR(createdAt),
        };
      });

      setSales(enriched);
      setTotalRecords(salesRes?.meta?.total ?? enriched.length);
    } catch {
      setError('Falha ao carregar vendas.');
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

    return sales
      .map((sale) => ({
        value: sale.sellerId,
        label: sale.sellerName,
      }))
      .filter((item) => {
        if (!item.value || !item.label) return false;
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [sales]);

  const teamOptions = useMemo(() => {
    const seen = new Set<string>();

    return sales
      .map((sale) => ({
        value: sale.teamId,
        label: sale.teamName,
      }))
      .filter((item) => {
        if (!item.value || item.label === '-') return false;
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [sales]);

  const summary = useMemo(() => buildSummary(sales), [sales]);

  const filteredSales = useMemo(() => {
    const query = normalizeSearch(search.trim());
    const phoneQuery = normalizeDigits(search);

    return sales.filter((sale) => {
      if (statusFilter && sale.status !== statusFilter) return false;
      if (sellerFilter && sale.sellerId !== sellerFilter) return false;
      if (teamFilter && sale.teamId !== teamFilter) return false;

      if (!query && !phoneQuery) return true;

      const searchable = normalizeSearch(
        [
          sale.opportunityName,
          sale.opportunityDocument || '',
          sale.opportunityPhone || '',
          sale.sellerName || '',
          sale.teamName || '',
          sale.paymentMethod || '',
          sale.status || '',
        ].join(' '),
      );

      if (query && searchable.includes(query)) return true;
      if (phoneQuery && normalizeDigits(sale.opportunityPhone || '').includes(phoneQuery)) return true;

      return false;
    });
  }, [sales, search, sellerFilter, statusFilter, teamFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleSales = filteredSales.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const recordLabel = `${filteredSales.length.toLocaleString('pt-BR')} de ${totalRecords.toLocaleString('pt-BR')} registros`;

  function getOpportunitySubtitle(sale: SaleView) {
    return `${sale.opportunityDocument || '-'}${sale.opportunityPhone ? ` | ${sale.opportunityPhone}` : ''}`;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#12151b] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
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
            label="Vendas totais"
            details="Total de pedidos gerados na unidade"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v7.5m-3.75-3.75h7.5m4.5 0a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            iconClassName="bg-amber-500/10 text-amber-300"
            valueClassName="text-amber-300"
            value={summary.pending.toLocaleString('pt-BR')}
            label="Pendentes"
            details="Aguardando confirmação de pagamento"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m5.25 2.25a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
            iconClassName="bg-emerald-500/10 text-emerald-300"
            valueClassName="text-emerald-300"
            value={summary.confirmed.toLocaleString('pt-BR')}
            label="Confirmadas"
            details="Pagamentos confirmados no Asaas"
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
            details="Canceladas antes do pagamento"
          />
          <MetricCard
            icon={
              <svg className="h-5 w-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            }
            iconClassName="bg-emerald-500/10 text-emerald-300"
            valueClassName="text-emerald-300"
            value={formatCurrencyBR(summary.revenue)}
            label="Receita confirmada"
            details="Soma das vendas confirmadas"
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
                  placeholder="Buscar por cliente, CPF, telefone, vendedor ou time..."
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
                <option value="pending_payment">Pendente</option>
                <option value="confirmed">Confirmada</option>
                <option value="cancelled_before_payment">Cancelada</option>
                <option value="failed">Falha</option>
                <option value="refunded">Estornada</option>
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
              <p className="text-sm text-slate-400">Carregando vendas...</p>
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
          ) : filteredSales.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-slate-400">Nenhuma venda encontrada.</p>
              <p className="mt-1 text-xs text-slate-500">Ajuste os filtros ou refine a busca.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#171a20] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-medium">Cliente</th>
                      <th className="px-5 py-4 font-medium">Vendedor</th>
                      <th className="px-5 py-4 font-medium">Time</th>
                      <th className="px-5 py-4 font-medium">Valor</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Data</th>
                      <th className="px-5 py-4 font-medium w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/70">
                    {visibleSales.map((sale) => (
                      <tr key={sale.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <Link href={`/dashboard/vendas/${sale.id}`} className="font-semibold text-slate-100 transition hover:text-emerald-300">
                            {sale.opportunityName}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{getOpportunitySubtitle(sale)}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-200">{sale.sellerName}</td>
                        <td className="px-5 py-4 text-slate-200">{sale.teamName}</td>
                        <td className="px-5 py-4 text-slate-200">{formatCurrencyBR(sale.totalValue)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={formatSaleStatus(sale.status)} tone={statusTone(sale.status)} />
                        </td>
                        <td className="px-5 py-4 text-slate-200">{sale.createdLabel}</td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/vendas/${sale.id}`}
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
    </div>
  );
}

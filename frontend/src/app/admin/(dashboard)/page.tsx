'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/admin/login'); return; }
    api('/reports/global-dashboard')
      .then(setData)
      .catch(() => api('/reports/unit-dashboard').then(d => setData({ aggregated: d })))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;
  if (!data) return <div className="p-8"><p className="text-sm text-ink-tertiary">Sem dados disponíveis.</p></div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Dashboard Global</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
          <div className="text-2xl font-bold text-ink">{data.units?.total || '-'}</div>
          <div className="text-xs text-ink-tertiary mt-1">Unidades</div>
        </div>
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
          <div className="text-2xl font-bold text-ink">{data.aggregated?.totalActiveLives || data.clients?.totalLives || '-'}</div>
          <div className="text-xs text-ink-tertiary mt-1">Vidas Ativas</div>
        </div>
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
          <div className="text-2xl font-bold text-brand">{data.aggregated?.averageConversionRate || data.opportunities?.conversionRate || 0}%</div>
          <div className="text-xs text-ink-tertiary mt-1">Conversão Média</div>
        </div>
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
          <div className="text-2xl font-bold text-success">R$ {(data.aggregated?.totalRevenue || data.sales?.totalValue || 0).toFixed(2)}</div>
          <div className="text-xs text-ink-tertiary mt-1">Receita Total</div>
        </div>
      </div>

      {data.byUnit && data.byUnit.length > 0 && (
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-ink mb-4">Por Unidade</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-ink-tertiary">
                  <th className="px-4 py-2 font-medium">Unidade</th>
                  <th className="px-4 py-2 font-medium">Clientes</th>
                  <th className="px-4 py-2 font-medium">Receita</th>
                  <th className="px-4 py-2 font-medium">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {data.byUnit.map((u: any) => (
                  <tr key={u.tenantId} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2 font-medium text-ink">{u.tenantName}</td>
                    <td className="px-4 py-2 text-ink">{u.activeClients}</td>
                    <td className="px-4 py-2 text-ink">R$ {u.totalRevenue?.toFixed?.(2)}</td>
                    <td className="px-4 py-2 text-ink">{u.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.byPlan && data.byPlan.length > 0 && (
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Por Plano</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-ink-tertiary">
                  <th className="px-4 py-2 font-medium">Plano</th>
                  <th className="px-4 py-2 font-medium">Clientes Ativos</th>
                  <th className="px-4 py-2 font-medium">Receita</th>
                  <th className="px-4 py-2 font-medium">Churn</th>
                </tr>
              </thead>
              <tbody>
                {data.byPlan.map((p: any) => (
                  <tr key={p.planId} className="border-b border-edge last:border-0">
                    <td className="px-4 py-2 font-medium text-ink">{p.planName}</td>
                    <td className="px-4 py-2 text-ink">{p.activeClients}</td>
                    <td className="px-4 py-2 text-ink">R$ {p.totalRevenue?.toFixed?.(2)}</td>
                    <td className="px-4 py-2 text-ink">{p.churnRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

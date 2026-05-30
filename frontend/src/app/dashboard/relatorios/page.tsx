'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RelatoriosPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try { const res = await api('/reports/unit-dashboard'); setData(res); } catch { } finally { setLoading(false); }
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;

  return (
    <div className="p-8">
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Oportunidades" value={data.opportunities?.total || 0} />
            <MetricCard label="Taxa Conversão" value={`${data.opportunities?.conversionRate || 0}%`} />
            <MetricCard label="Vidas Ativas" value={data.clients?.totalLives || 0} />
            <MetricCard label="Vendas Confirmadas" value={data.sales?.confirmed || 0} />
          </div>

          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Oportunidades</h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              {[
                ['Abertas', data.opportunities?.aberta],
                ['Checkout Gerado', data.opportunities?.checkoutGerado],
                ['Convertidas', data.opportunities?.convertida],
                ['Canceladas', data.opportunities?.cancelada],
              ].map(([label, val]) => (
                <div key={label} className="text-center p-3 rounded-lg bg-surface-canvas">
                  <div className="text-2xl font-bold text-ink">{val}</div>
                  <div className="text-xs text-ink-tertiary">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Vendas</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                ['Pendentes', data.sales?.pending],
                ['Confirmadas', data.sales?.confirmed],
                ['Canceladas', data.sales?.cancelledBeforePayment],
              ].map(([label, val]) => (
                <div key={label} className="text-center p-3 rounded-lg bg-surface-canvas">
                  <div className="text-2xl font-bold text-ink">{val}</div>
                  <div className="text-xs text-ink-tertiary">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-ink-secondary">
              Total em vendas confirmadas: <span className="font-semibold text-brand">R$ {(data.sales?.totalValue || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Clientes</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                ['Titulares Ativos', data.clients?.activeHolders],
                ['Dependentes Ativos', data.clients?.activeDependents],
                ['Total Vidas', data.clients?.totalLives],
              ].map(([label, val]) => (
                <div key={label} className="text-center p-3 rounded-lg bg-surface-canvas">
                  <div className="text-2xl font-bold text-ink">{val}</div>
                  <div className="text-xs text-ink-tertiary">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-tertiary mt-1">{label}</div>
    </div>
  );
}

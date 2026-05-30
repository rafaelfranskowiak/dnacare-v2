'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    setLoaded(true);
    api('/reports/unit-dashboard').then(setData).catch(() => {});
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="p-8">
      {data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
              <div className="text-2xl font-bold text-ink">{data.opportunities?.total || 0}</div>
              <div className="text-xs text-ink-tertiary mt-1">Oportunidades</div>
            </div>
            <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
              <div className="text-2xl font-bold text-brand">{data.opportunities?.conversionRate || 0}%</div>
              <div className="text-xs text-ink-tertiary mt-1">Taxa de Conversão</div>
            </div>
            <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
              <div className="text-2xl font-bold text-ink">{data.clients?.totalLives || 0}</div>
              <div className="text-xs text-ink-tertiary mt-1">Vidas Ativas</div>
            </div>
            <div className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
              <div className="text-2xl font-bold text-success">R$ {(data.sales?.totalValue || 0).toFixed(2)}</div>
              <div className="text-xs text-ink-tertiary mt-1">Receita Confirmada</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Link href="/dashboard/oportunidades" className="rounded-xl border border-edge bg-surface p-6 shadow-sm hover:border-brand/30 transition group">
              <h2 className="text-base font-semibold text-ink group-hover:text-brand">Oportunidades</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-surface-canvas text-center">
                  <div className="font-bold text-ink">{data.opportunities?.aberta || 0}</div>
                  <div className="text-xs text-ink-tertiary">Abertas</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-canvas text-center">
                  <div className="font-bold text-ink">{data.opportunities?.checkoutGerado || 0}</div>
                  <div className="text-xs text-ink-tertiary">Checkout</div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/clientes" className="rounded-xl border border-edge bg-surface p-6 shadow-sm hover:border-brand/30 transition group">
              <h2 className="text-base font-semibold text-ink group-hover:text-brand">Clientes</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-surface-canvas text-center">
                  <div className="font-bold text-ink">{data.clients?.activeHolders || 0}</div>
                  <div className="text-xs text-ink-tertiary">Titulares Ativos</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-canvas text-center">
                  <div className="font-bold text-ink">{data.clients?.activeDependents || 0}</div>
                  <div className="text-xs text-ink-tertiary">Dependentes</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Carregando indicadores...</p>
        </div>
      )}
    </div>
  );
}

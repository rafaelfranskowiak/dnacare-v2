'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VendasPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await api(`/sales?${params}`);
      setSales(res.data);
    } catch { } finally { setLoading(false); }
  }

  const statusColor = (s: string) => {
    if (s === 'confirmed') return 'bg-success/10 text-success border-success/20';
    if (s === 'pending_payment') return 'bg-warning/10 text-warning border-warning/20';
    if (s === 'cancelled_before_payment') return 'bg-danger/10 text-danger border-danger/20';
    return 'bg-surface-canvas text-ink-tertiary border-edge';
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Vendas</h1>
        <p className="mt-0.5 text-sm text-ink-tertiary">Histórico de vendas da unidade</p>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
          <option value="">Todos os status</option>
          <option value="pending_payment">Pagamento Pendente</option>
          <option value="confirmed">Confirmadas</option>
          <option value="cancelled_before_payment">Canceladas</option>
          <option value="failed">Falhas</option>
          <option value="refunded">Estornadas</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : sales.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Nenhuma venda encontrada.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Pagamento</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-b border-edge last:border-0 hover:bg-surface-canvas/50">
                  <td className="px-5 py-3 font-medium text-ink">{s.opportunityName || '-'}</td>
                  <td className="px-5 py-3 text-ink-secondary">{s.planName || '-'}</td>
                  <td className="px-5 py-3 text-ink">R$ {s.totalValue?.toFixed?.(2)}</td>
                  <td className="px-5 py-3 text-ink-secondary">{s.paymentMethod === 'BOLETO' ? 'Boleto' : s.paymentMethod}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(s.status)}`}>
                      {s.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-tertiary">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/vendas/${s.id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VendaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try { const data = await api(`/sales/${id}`); setSale(data); } catch { } finally { setLoading(false); }
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;
  if (!sale) return <div className="p-8"><p className="text-sm text-ink-tertiary">Venda não encontrada.</p></div>;

  const statusColor = (s: string) => s === 'confirmed' ? 'bg-success/10 text-success' : s === 'pending_payment' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger';

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/dashboard/vendas" className="text-sm text-brand hover:underline mb-4 inline-block">← Voltar</Link>
      <div className="mb-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Venda</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Venda {sale.id?.slice(0, 8)}</h2>
            <p className="mt-1 text-sm text-ink-tertiary">{sale.opportunityName || 'Cliente'} • {sale.planName}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusColor(sale.status)}`}>{sale.status?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Detalhes da Venda</h2>
          <dl className="space-y-2 text-sm">
            {[['Vendedor', sale.sellerName], ['Time', sale.teamId], ['Plano', sale.planName], ['Versão', sale.planVersionName], ['Pagamento', sale.paymentMethod === 'BOLETO' ? 'Boleto' : sale.paymentMethod]].map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-ink-tertiary">{k}</span><span className="text-ink">{v || '-'}</span></div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Valores</h2>
          <dl className="space-y-2 text-sm">
            {[['Valor Base', sale.baseValue], ['Dependentes', sale.dependentsValue], ['Adesão', sale.admissionFee], ['Subtotal', sale.subtotal], ['Desconto', sale.discount], ['Total', sale.totalValue]].map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-ink-tertiary">{k}</span><span className={`text-ink ${k === 'Total' ? 'font-semibold text-brand' : ''}`}>R$ {Number(v || 0).toFixed(2)}</span></div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">IDs Asaas</h2>
          <dl className="space-y-2 text-sm">
            {[['Customer ID', sale.asaasCustomerId], ['Payment ID', sale.asaasPaymentId]].map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-ink-tertiary">{k}</span><span className="text-ink font-mono text-xs">{v || '-'}</span></div>
            ))}
          </dl>
          {sale.asaasBankSlipUrl && (
            <a href={sale.asaasBankSlipUrl} target="_blank" className="mt-3 inline-block text-sm text-brand hover:underline">Download Boleto ↗</a>
          )}
        </div>

        {sale.planSnapshot && (
          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Foto do Plano</h2>
            <dl className="space-y-2 text-sm">
              {[['Plano', sale.planSnapshot.planName], ['Regra Dep.', sale.planSnapshot.dependentRule], ['Dep. Inclusos', sale.planSnapshot.includedDependents], ['Valor Dep.', sale.planSnapshot.dependentValue]].map(([k,v]) => (
                <div key={k} className="flex justify-between"><span className="text-ink-tertiary">{k}</span><span className="text-ink">{v ?? '-'}</span></div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {sale.calculationMemory && (
        <div className="mt-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Memória de Cálculo</h2>
          <pre className="text-xs text-ink-secondary font-mono bg-surface-canvas rounded-lg p-4 overflow-x-auto">
            {Array.isArray(sale.calculationMemory) ? sale.calculationMemory.join('\n') : JSON.stringify(sale.calculationMemory, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

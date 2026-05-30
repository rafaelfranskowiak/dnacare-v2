'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [financial, setFinancial] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<any>(null);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try { const data = await api(`/clients/${id}`); setClient(data); } catch { } finally { setLoading(false); }
  }

  async function loadFinancial() {
    try { const data = await api(`/clients/${id}/financial`); setFinancial(data); } catch { }
  }

  async function handleCancelPlan() {
    if (cancelReason.length < 20) return;
    try {
      await api(`/clients/${id}/cancel-plan`, { method: 'POST', body: JSON.stringify({ reason: cancelReason }) });
      load(); setShowCancel(false);
    } catch { }
  }

  async function handleSettleDebts() {
    setSettling(true); setSettleResult(null);
    try {
      const result = await api(`/clients/${id}/settle-debts`, { method: 'POST' });
      setSettleResult(result);
      loadFinancial();
    } catch (err: any) { setSettleResult({ error: err.message }); }
    finally { setSettling(false); }
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;
  if (!client) return <div className="p-8"><p className="text-sm text-ink-tertiary">Cliente não encontrado.</p></div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/dashboard/clientes" className="text-sm text-brand hover:underline mb-4 inline-block">← Voltar</Link>
      <div className="mb-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Cliente</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{client.name}</h2>
            <p className="mt-1 text-sm text-ink-tertiary">
              {client.type === 'holder' ? 'Titular' : 'Dependente'}
              {client.holderName && <> • Titular: <Link href={`/dashboard/clientes/${client.holderId}`} className="text-brand hover:underline">{client.holderName}</Link></>}
              {' • CPF: '}{client.document}
            </p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
            client.status === 'ativo' ? 'bg-success/10 text-success border-success/20' :
            client.status === 'inativo' ? 'bg-surface-canvas text-ink-tertiary border-edge' :
            'bg-danger/10 text-danger border-danger/20'
          }`}>{client.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Dados Pessoais</h2>
          <dl className="space-y-2 text-sm">
            {[['Telefone', client.phone], ['E-mail', client.email], ['Nascimento', client.birthDate], ['CEP', client.postalCode], ['Endereço', `${client.address || ''}, ${client.addressNumber || ''}`], ['Bairro', client.neighborhood], ['Cidade/UF', `${client.city || ''}/${client.state || ''}`]].map(([label, val]) => (
              <div key={label as string} className="flex justify-between"><span className="text-ink-tertiary">{label}</span><span className="text-ink">{val?.trim() || '-'}</span></div>
            ))}
          </dl>
        </div>

        {client.type === 'holder' && client.subscription && (
          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Assinatura</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-tertiary">Plano</span><span className="text-ink">{client.subscription.planName}</span></div>
              <div className="flex justify-between"><span className="text-ink-tertiary">Valor</span><span className="text-ink">R$ {client.subscription.recurringValue}</span></div>
              <div className="flex justify-between"><span className="text-ink-tertiary">Status</span><span className="text-ink">{client.subscription.status}</span></div>
              <div className="flex justify-between"><span className="text-ink-tertiary">Início</span><span className="text-ink">{client.subscription.startDate}</span></div>
            </dl>
          </div>
        )}
      </div>

      {client.type === 'holder' && (
        <div className="mt-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Dependentes ({client.dependents?.length || 0})</h2>
          {client.dependents?.length > 0 ? (
            <div className="space-y-2">
              {client.dependents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-edge last:border-0">
                  <Link href={`/dashboard/clientes/${d.id}`} className="font-medium text-ink hover:text-brand">{d.name}</Link>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${d.status === 'ativo' ? 'bg-success/10 text-success' : 'bg-surface-canvas text-ink-tertiary'}`}>{d.status}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-tertiary">Nenhum dependente.</p>}
        </div>
      )}

      {client.type === 'holder' && (
        <div className="mt-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-ink">Financeiro</h2>
            <button onClick={handleSettleDebts} disabled={settling}
              className="rounded-lg border border-warning px-4 py-1.5 text-xs font-medium text-warning transition hover:bg-warning/10 disabled:opacity-50">
              {settling ? 'Processando...' : 'Quitar Débitos'}
            </button>
          </div>
          {settleResult && !settleResult.error && (
            <div className="mb-4 rounded-lg border border-success/20 bg-success/5 p-3 text-sm">
              <p className="font-medium text-success">Negociação gerada!</p>
              <p className="text-ink-secondary">Valor consolidado: R$ {settleResult.consolidatedValue?.toFixed?.(2)}</p>
              {settleResult.settlementUrl && <a href={settleResult.settlementUrl} target="_blank" className="text-brand hover:underline text-xs">Link de pagamento ↗</a>}
            </div>
          )}
          {settleResult?.error && (
            <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{settleResult.error}</div>
          )}
          {financial ? (
            <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {financial.payments?.slice(0, 20).map((p: any) => (
                <div key={p.id} className="flex justify-between py-1 border-b border-edge last:border-0">
                  <span className="text-ink">{new Date(p.dueDate).toLocaleDateString('pt-BR')} — R$ {p.value}</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    p.status === 'RECEIVED' ? 'bg-success/10 text-success' : p.status === 'OVERDUE' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={loadFinancial} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Carregar Dados Financeiros</button>
          )}
        </div>
      )}

      {client.type === 'holder' && client.status === 'ativo' && (
        <div className="mt-6">
          <button onClick={() => setShowCancel(true)}
            className="rounded-lg border border-danger px-6 py-2 text-sm font-medium text-danger transition hover:bg-danger/10">Cancelar Plano</button>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Cancelar Plano</h2>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Justificativa (mínimo 20 caracteres)..."
              className="mt-4 block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink min-h-[80px]" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowCancel(false)} className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Voltar</button>
              <button onClick={handleCancelPlan} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white">Confirmar Cancelamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

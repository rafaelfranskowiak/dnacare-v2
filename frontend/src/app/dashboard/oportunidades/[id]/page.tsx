'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function OportunidadeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [opp, setOpp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Checkout state
  const [planVersionId, setPlanVersionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  // Dependents
  const [depName, setDepName] = useState('');
  const [depDoc, setDepDoc] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
    loadPlans();
  }, []);

  async function load() {
    setLoading(true);
    try { const data = await api(`/opportunities/${id}`); setOpp(data); } catch { } finally { setLoading(false); }
  }

  async function loadPlans() {
    try { const res = await api('/plans/available'); setPlans(res.data || []); } catch { }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: any = {};
      const fields = ['name','phone','email','birthDate','postalCode','address','addressNumber','addressComplement','neighborhood','city','state','planVersionId','paymentMethod'];
      fields.forEach(f => { if ((opp as any)[f] !== undefined) data[f] = (opp as any)[f]; });
      await api(`/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      setError('Salvo!');
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleCep(cep: string) {
    if (cep.replace(/\D/g,'').length !== 8) return;
    setCepLoading(true);
    try {
      const addr = await api(`/opportunities/cep/${cep}`);
      if (addr) setOpp({ ...opp, address: addr.address, neighborhood: addr.neighborhood, city: addr.city, state: addr.state });
    } catch { } finally { setCepLoading(false); }
  }

  async function handleAddDependent() {
    try {
      await api(`/opportunities/${id}/dependents`, { method: 'POST', body: JSON.stringify({ name: depName, document: depDoc }) });
      setDepName(''); setDepDoc(''); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRemoveDependent(depId: string) {
    try { await api(`/opportunities/${id}/dependents/${depId}`, { method: 'DELETE' }); load(); } catch { }
  }

  async function handleGenerateCheckout() {
    if (!planVersionId || !paymentMethod) { setError('Selecione o plano e forma de pagamento'); return; }
    setSaving(true);
    try {
      const result = await api(`/opportunities/${id}/generate-checkout`, {
        method: 'POST', body: JSON.stringify({ planVersionId, paymentMethod })
      });
      setOpp({ ...opp, status: 'checkout_gerado' });
      alert(`Checkout gerado! ${result.bankSlipUrl ? 'Boleto: ' + result.bankSlipUrl : 'URL: ' + result.checkoutUrl}`);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleCancel() {
    if (cancelReason.length < 20) { setError('Justificativa deve ter no mínimo 20 caracteres'); return; }
    try {
      await api(`/opportunities/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason }) });
      setOpp({ ...opp, status: 'cancelada', cancelReason });
      setShowCancel(false);
    } catch (err: any) { setError(err.message); }
  }

  function updateField(field: string, value: string) {
    setOpp({ ...opp, [field]: value });
    if (field === 'postalCode') handleCep(value);
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;
  if (!opp) return <div className="p-8"><p className="text-sm text-ink-tertiary">Oportunidade não encontrada.</p></div>;

  const canEdit = opp.status === 'aberta';
  const canCheckout = opp.status === 'aberta';
  const canCancel = opp.status === 'aberta' || opp.status === 'checkout_gerado';

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/dashboard/oportunidades" className="text-sm text-brand hover:underline mb-4 inline-block">← Voltar</Link>
      <div className="mb-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Oportunidade</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{opp.name}</h2>
            <p className="mt-1 text-sm text-ink-tertiary">{opp.document || '-'}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
            opp.status === 'aberta' ? 'bg-info/10 text-info border-info/20' :
            opp.status === 'checkout_gerado' ? 'bg-warning/10 text-warning border-warning/20' :
            opp.status === 'convertida' ? 'bg-success/10 text-success border-success/20' :
            'bg-danger/10 text-danger border-danger/20'
          }`}>{opp.status?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Dados Cadastrais</h2>
          <div className="grid grid-cols-2 gap-4">
            {['name','phone','email','birthDate','postalCode','address','addressNumber','addressComplement','neighborhood','city','state'].map(f => (
              <div key={f}>
                <label className="block text-xs font-medium text-ink-secondary mb-1">{f === 'birthDate' ? 'Data Nasc.' : f === 'postalCode' ? 'CEP' : f === 'addressNumber' ? 'Número' : f.replace(/([A-Z])/g,' $1').replace(/^./, s => s.toUpperCase())}</label>
                <input value={(opp as any)[f] || ''} onChange={e => updateField(f, e.target.value)}
                  disabled={!canEdit}
                  className={`block w-full rounded-lg border border-edge px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${!canEdit ? 'bg-surface-canvas opacity-60' : 'bg-surface-input'}`} />
                {f === 'postalCode' && cepLoading && <span className="text-xs text-ink-tertiary">Buscando CEP...</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Dependentes ({opp.dependents?.length || 0})</h2>
          {opp.dependents?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-edge last:border-0">
              <div><span className="font-medium text-ink">{d.name}</span><span className="text-ink-tertiary ml-2 text-sm">CPF: {d.document}</span></div>
              {canEdit && <button type="button" onClick={() => handleRemoveDependent(d.id)}
                className="text-xs text-danger hover:underline">Remover</button>}
            </div>
          ))}
          {canEdit && <div className="mt-3 flex gap-2">
            <input value={depName} onChange={e => setDepName(e.target.value)} placeholder="Nome" className="flex-1 rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
            <input value={depDoc} onChange={e => setDepDoc(e.target.value)} placeholder="CPF" className="w-40 rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
            <button type="button" onClick={handleAddDependent} className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white">Adicionar</button>
          </div>}
        </div>

        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Checkout</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Plano</label>
              <select value={planVersionId} onChange={e => setPlanVersionId(e.target.value)} disabled={!canCheckout}
                className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                <option value="">Selecione...</option>
                {plans.map((p: any) => (
                  <option key={p.currentVersion?.id} value={p.currentVersion?.id}>
                    {p.name} — R$ {p.currentVersion?.baseValue} ({p.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={!canCheckout}
                className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                <option value="">Selecione...</option>
                <option value="BOLETO">Boleto</option>
              </select>
              <p className="mt-1 text-xs text-ink-tertiary">
                Cartão de crédito será liberado após a conclusão do fluxo recorrente seguro.
              </p>
            </div>
          </div>
        </div>

        {error && <p className={`text-sm ${error === 'Salvo!' ? 'text-success' : 'text-danger'}`}>{error}</p>}

        <div className="flex gap-3">
          {canEdit && <button type="submit" disabled={saving}
            className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">{saving ? 'Salvando...' : 'Salvar'}</button>}
          {canCheckout && <button type="button" onClick={handleGenerateCheckout} disabled={saving}
            className="rounded-lg bg-success px-6 py-2 text-sm font-medium text-white transition hover:bg-green-600">Gerar Checkout</button>}
          {canCancel && <button type="button" onClick={() => setShowCancel(true)}
            className="rounded-lg border border-danger px-6 py-2 text-sm font-medium text-danger transition hover:bg-danger/10">Cancelar Oportunidade</button>}
        </div>
      </form>

      {opp.sale && <div className="mt-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-ink mb-2">Venda</h2>
        <p className="text-sm text-ink-secondary">Status: {opp.sale.status} | Total: R$ {opp.sale.totalValue}</p>
        {opp.sale.asaasCheckoutUrl && <a href={opp.sale.asaasCheckoutUrl} target="_blank" className="text-sm text-brand hover:underline block mt-1">Link do Checkout</a>}
        {opp.sale.asaasBankSlipUrl && <a href={opp.sale.asaasBankSlipUrl} target="_blank" className="text-sm text-brand hover:underline block mt-1">Link do Boleto</a>}
      </div>}

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Cancelar Oportunidade</h2>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Justificativa (mínimo 20 caracteres)..."
              className="mt-4 block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink min-h-[80px]" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowCancel(false)} className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Voltar</button>
              <button onClick={handleCancel} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white">Confirmar Cancelamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

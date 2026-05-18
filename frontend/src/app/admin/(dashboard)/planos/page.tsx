'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function PlanosAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'PF' | 'PJ'>('PF');
  const [desc, setDesc] = useState('');

  // Publish state
  const [showPublish, setShowPublish] = useState<string | null>(null);
  const [pub, setPub] = useState({
    baseValue: 99.90,
    billingCycle: 'MONTHLY',
    dependentRule: 'none' as string,
    includedDependents: 0,
    maxDependents: 0,
    minDependents: 0,
    dependentValue: 0,
    admissionFee: 0,
  });

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/admin/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try { const res = await api('/plans'); setPlans(res.data); } catch { } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/plans', { method: 'POST', body: JSON.stringify({ name, type, description: desc }) });
      setShowCreate(false); setName(''); setDesc('');
      load();
    } catch (err: any) { setError(err.message); }
  }

  async function handlePublish(id: string) {
    setError('');
    try {
      await api(`/plans/${id}/publish`, { method: 'POST', body: JSON.stringify(pub) });
      setShowPublish(null);
      load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleInactivate(id: string) {
    try { await api(`/plans/${id}/inactivate`, { method: 'POST' }); load(); } catch { }
  }

  async function handleNewVersion(id: string) {
    try { await api(`/plans/${id}/versions`, { method: 'POST' }); load(); } catch { }
  }

  function openPublish(planId: string) {
    setPub({ baseValue: 99.90, billingCycle: 'MONTHLY', dependentRule: 'none', includedDependents: 0, maxDependents: 0, minDependents: 0, dependentValue: 0, admissionFee: 0 });
    setShowPublish(planId);
  }

  const statusColor = (s: string) => s === 'publicado' ? 'bg-success/10 text-success border-success/20' :
    s === 'rascunho' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-surface-canvas text-ink-tertiary border-edge';

  const hasDependentValue = pub.dependentRule !== 'none';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Planos</h1>
          <p className="mt-0.5 text-sm text-ink-tertiary">Gerencie os planos disponíveis para as unidades</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">Novo Plano</button>
      </div>

      {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : plans.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Nenhum plano encontrado. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-edge bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{p.name}</h3>
                  <p className="text-sm text-ink-tertiary">{p.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}{p.description ? ` — ${p.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusColor(p.status)}`}>{p.status}</span>
                  {p.status === 'rascunho' && (
                    <button onClick={() => openPublish(p.id)}
                      className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-600">Publicar</button>
                  )}
                  {p.status === 'publicado' && (
                    <>
                      <button onClick={() => handleNewVersion(p.id)}
                        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas">Nova Versão</button>
                      <button onClick={() => handleInactivate(p.id)}
                        className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas">Inativar</button>
                    </>
                  )}
                </div>
              </div>
              {p.currentVersion && (
                <div className="mt-2 text-sm text-ink-secondary">
                  v{p.currentVersion.version} — R$ {p.currentVersion.baseValue?.toFixed?.(2)} — {p.currentVersion.includedDependents} dep. inclusos — regra: {p.currentVersion.dependentRule}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm my-8">
            <h2 className="text-lg font-semibold text-ink">Novo Plano (Rascunho)</h2>
            <p className="text-xs text-ink-tertiary mt-1">Depois de criar, publique o plano com valores e regras.</p>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Tipo *</label>
                <select value={type} onChange={e => setType(e.target.value as 'PF'|'PJ')}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Breve descrição do plano..."
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink min-h-[60px]" />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Cancelar</button>
                <button type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Criar Rascunho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-[1px] overflow-y-auto py-8">
          <div className="w-full max-w-lg rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Publicar Plano</h2>
            <p className="text-xs text-ink-tertiary mt-1">Configure valores e regras comerciais do plano.</p>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Valor Base (R$) *</label>
                  <input type="number" step="0.01" min="0" value={pub.baseValue} onChange={e => setPub({ ...pub, baseValue: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Ciclo Cobrança</label>
                  <select value={pub.billingCycle} onChange={e => setPub({ ...pub, billingCycle: e.target.value })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quinzenal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUALLY">Semestral</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Regra de Dependentes</label>
                <select value={pub.dependentRule} onChange={e => setPub({ ...pub, dependentRule: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                  <option value="none">Sem dependentes</option>
                  <option value="fixed">Valor fixo por dependente extra</option>
                  <option value="progressive">Progressivo (cada extra custa mais)</option>
                  <option value="regressive">Regressivo (cada extra custa menos)</option>
                  <option value="tiered">Faixas de quantidade</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Dep. Inclusos</label>
                  <input type="number" min="0" value={pub.includedDependents} onChange={e => setPub({ ...pub, includedDependents: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Mín. Dep.</label>
                  <input type="number" min="0" value={pub.minDependents} onChange={e => setPub({ ...pub, minDependents: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Máx. Dep.</label>
                  <input type="number" min="0" value={pub.maxDependents} onChange={e => setPub({ ...pub, maxDependents: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" placeholder="0 = ilimitado" />
                </div>
              </div>

              {hasDependentValue && (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Valor por Dependente Extra (R$)</label>
                  <input type="number" step="0.01" min="0" value={pub.dependentValue} onChange={e => setPub({ ...pub, dependentValue: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Taxa de Adesão (R$)</label>
                <input type="number" step="0.01" min="0" value={pub.admissionFee} onChange={e => setPub({ ...pub, admissionFee: parseFloat(e.target.value) || 0 })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPublish(null)}
                className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Cancelar</button>
              <button onClick={() => handlePublish(showPublish)}
                className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white">Publicar Plano</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

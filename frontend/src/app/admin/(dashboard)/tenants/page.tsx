'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Tenant {
  id: string; slug: string; name: string; created_at: string;
  asaasApiKey?: string; asaasSandbox?: boolean;
  asaasWebhookUrl?: string; asaasWebhookId?: string;
}

type ModalMode = 'create' | 'edit' | 'asaas' | null;

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Create/edit form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  // Asaas config form
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasSandbox, setAsaasSandbox] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEmail, setWebhookEmail] = useState('suporte@wizer.digital');
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/admin/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try { const res = await api('/tenants'); setTenants(res.data); } catch { } finally { setLoading(false); }
  }

  function openCreate() { setEditing(null); setName(''); setSlug(''); setMode('create'); setError(''); }
  function openEdit(t: Tenant) { setEditing(t); setName(t.name); setSlug(t.slug); setMode('edit'); setError(''); }
  function openAsaas(t: Tenant) {
    setEditing(t);
    setAsaasApiKey(t.asaasApiKey || '');
    setAsaasSandbox(t.asaasSandbox !== false);
    setWebhookUrl(t.asaasWebhookUrl || 'https://dnacare.wizerdigital.tec.br/api/webhooks/asaas');
    setWebhookResult(null);
    setMode('asaas');
    setError('');
  }
  function close() { setMode(null); setEditing(null); setWebhookResult(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (mode === 'create') {
        const tenant = await api('/tenants', { method: 'POST', body: JSON.stringify({ name, slug }) });
        setTenants(prev => [tenant, ...prev]);
      } else if (mode === 'edit' && editing) {
        const updated = await api(`/tenants/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name, slug }) });
        setTenants(prev => prev.map(t => t.id === editing.id ? updated : t));
      }
      close();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await api(`/tenants/${id}`, { method: 'DELETE' }); setTenants(prev => prev.filter(t => t.id !== id)); } catch { }
    setConfirmDelete(null);
  }

  async function handleSaveAsaas(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api(`/tenants/${editing!.id}/asaas-config`, {
        method: 'PATCH',
        body: JSON.stringify({ asaasApiKey, asaasSandbox, asaasWebhookUrl: webhookUrl }),
      });
      load();
      setError('Configuração Asaas salva!');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleRegisterWebhook() {
    if (!editing) return;
    setRegistering(true); setError(''); setWebhookResult(null);
    try {
      const result = await api(`/webhooks/asaas/configure/${editing.id}`, {
        method: 'POST',
        body: JSON.stringify({ url: webhookUrl, email: webhookEmail }),
      });
      setWebhookResult(result);
      load();
    } catch (err: any) { setError(err.message); } finally { setRegistering(false); }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-end">
        {user?.is_platform_admin && (
          <button onClick={openCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">Novo Tenant</button>
        )}
      </div>

      {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : tenants.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Nenhum tenant encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Asaas</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
                {user?.is_platform_admin && <th className="px-5 py-3 font-medium w-36">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-b border-edge last:border-0 hover:bg-surface-canvas/50">
                  <td className="px-5 py-3 font-medium text-ink">{t.name}</td>
                  <td className="px-5 py-3 text-ink-secondary">{t.slug}</td>
                  <td className="px-5 py-3">
                    {t.asaasWebhookId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Webhook ativo
                      </span>
                    ) : t.asaasApiKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Sem webhook
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Não configurado</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-tertiary">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                  {user?.is_platform_admin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(t)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas hover:text-brand">Editar</button>
                        <button onClick={() => openAsaas(t)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas hover:text-brand">Asaas</button>
                        <button onClick={() => setConfirmDelete(t.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-tertiary transition hover:bg-danger/10 hover:text-danger">Excluir</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {mode && (mode === 'create' || mode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">{mode === 'create' ? 'Novo Tenant' : 'Editar Tenant'}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Nome</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Slug</label>
                <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
                <p className="mt-1 text-xs text-ink-muted">Identificador único: minúsculas, sem espaços (ex: unidade-sp)</p>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close}
                  className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary transition hover:bg-surface-canvas">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                  {saving ? 'Salvando...' : (mode === 'create' ? 'Criar' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asaas Config Modal */}
      {mode === 'asaas' && editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-[1px] overflow-y-auto py-8">
          <div className="w-full max-w-lg rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Configurar Asaas — {editing.name}</h2>
            <p className="text-xs text-ink-tertiary mt-1">Configure a chave de API e registre o webhook para esta unidade.</p>

            <form onSubmit={handleSaveAsaas} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Chave de API Asaas</label>
                <input value={asaasApiKey} onChange={e => setAsaasApiKey(e.target.value)} placeholder="$aact_..."
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink font-mono" />
                <p className="mt-1 text-xs text-ink-muted">Gerada no painel Asaas → Integrações → API</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={asaasSandbox} onChange={e => setAsaasSandbox(e.target.checked)}
                    className="rounded border-edge text-brand focus:ring-brand/20" />
                  <span className="text-sm text-ink-secondary">Modo Sandbox</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">URL do Webhook</label>
                <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink font-mono" />
                <p className="mt-1 text-xs text-ink-muted">Endpoint que receberá eventos do Asaas</p>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close}
                  className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </form>

            <hr className="my-5 border-edge" />

            <div>
              <h3 className="text-base font-semibold text-ink">Registrar Webhook no Asaas</h3>
              <p className="text-xs text-ink-tertiary mt-1">Cria a configuração de webhook diretamente na API do Asaas usando a chave acima.</p>
              <div className="mt-3">
                <label className="block text-sm font-medium text-ink-secondary mb-1">E-mail de notificação</label>
                <input value={webhookEmail} onChange={e => setWebhookEmail(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
              </div>
              <button onClick={handleRegisterWebhook} disabled={registering || !asaasApiKey}
                className="mt-4 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50">
                {registering ? 'Registrando...' : 'Registrar Webhook'}
              </button>

              {webhookResult && (
                <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-4 space-y-1 text-sm">
                  <p className="font-medium text-success">Webhook registrado!</p>
                  <p className="text-ink-secondary">ID: <span className="font-mono text-xs">{webhookResult.webhookId}</span></p>
                  <p className="text-ink-secondary">Token: <span className="font-mono text-xs text-ink-tertiary">{webhookResult.authToken}</span></p>
                  <p className="text-ink-secondary">Eventos: <span className="text-xs">{webhookResult.events?.join(', ')}</span></p>
                </div>
              )}
            </div>

            {error && <p className={`mt-4 text-sm ${error.includes('salva') ? 'text-success' : 'text-danger'}`}>{error}</p>}
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Excluir Tenant</h2>
            <p className="mt-2 text-sm text-ink-secondary">Tem certeza que deseja excluir este tenant? Esta ação não pode ser desfeita.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary transition hover:bg-surface-canvas">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

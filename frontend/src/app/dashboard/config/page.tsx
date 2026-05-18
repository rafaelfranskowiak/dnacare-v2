'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ConfigPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const tid = localStorage.getItem('tenantId') || 'default';
      const t = await api(`/tenants/${tid}`);
      setTenant(t);
    } catch { } finally { setLoading(false); }
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-ink mb-6">Configurações da Unidade</h1>

      <div className="space-y-4">
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-2">Dados da Unidade</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-tertiary">Nome</span><span className="text-ink">{tenant?.name || '-'}</span></div>
            <div className="flex justify-between"><span className="text-ink-tertiary">Slug</span><span className="text-ink font-mono">{tenant?.slug || '-'}</span></div>
          </dl>
        </div>

        <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-2">Integração Asaas</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-tertiary">Modo</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${tenant?.asaasSandbox ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                {tenant?.asaasSandbox ? 'Sandbox' : 'Produção'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-ink-tertiary">API Key</span>
              <span className="text-ink">{tenant?.asaasApiKey ? '••••••••' + tenant.asaasApiKey.slice(-8) : 'Não configurada'}</span>
            </div>
            <div className="flex justify-between"><span className="text-ink-tertiary">Webhook</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tenant?.asaasWebhookId ? 'bg-success/10 text-success border-success/20' : 'bg-surface-canvas text-ink-muted border-edge'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tenant?.asaasWebhookId ? 'bg-success' : 'bg-ink-muted'}`} />
                {tenant?.asaasWebhookId ? 'Ativo' : 'Não configurado'}
              </span>
            </div>
            {tenant?.asaasWebhookUrl && (
              <div className="flex justify-between"><span className="text-ink-tertiary">URL</span><span className="text-ink font-mono text-xs">{tenant.asaasWebhookUrl}</span></div>
            )}
          </dl>
          {!tenant?.asaasApiKey && (
            <p className="mt-3 text-xs text-ink-tertiary">Solicite ao Super Admin para configurar a integração Asaas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

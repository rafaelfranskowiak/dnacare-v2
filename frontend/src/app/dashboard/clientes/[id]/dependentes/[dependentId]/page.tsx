'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DependentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const dependentId = params.dependentId as string;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/clients/${dependentId}`);
      setClient(data);
      setForm({ phone: data.phone || '', email: data.email || '', birthDate: data.birthDate || '' });
    } catch { } finally { setLoading(false); }
  }

  async function handleSave() {
    try {
      await api(`/clients/${dependentId}`, { method: 'PATCH', body: JSON.stringify(form) });
      setEditing(false);
      load();
    } catch { }
  }

  if (loading) return <div className="p-8"><p className="text-sm text-ink-tertiary">Carregando...</p></div>;
  if (!client) return <div className="p-8"><p className="text-sm text-ink-tertiary">Dependente não encontrado.</p></div>;

  return (
    <div className="p-8 max-w-2xl">
      <Link href={`/dashboard/clientes/${id}`} className="text-sm text-brand hover:underline mb-4 inline-block">← Voltar ao Titular</Link>
      <div className="mb-6 rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Dependente</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{client.name}</h2>
            <p className="mt-1 text-sm text-ink-tertiary">CPF: {client.document}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
            client.status === 'ativo' ? 'bg-success/10 text-success border-success/20' :
            'bg-surface-canvas text-ink-tertiary border-edge'
          }`}>{client.status}</span>
        </div>
      </div>

      <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Dados Pessoais</h2>
          <button onClick={() => setEditing(!editing)}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-canvas">
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-ink-tertiary mb-1">Telefone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
            </div>
            <div>
              <label className="block text-xs text-ink-tertiary mb-1">E-mail</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
            </div>
            <div>
              <label className="block text-xs text-ink-tertiary mb-1">Data de Nascimento</label>
              <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })}
                className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
            </div>
            <button onClick={handleSave}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Salvar</button>
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-tertiary">Telefone</span><span className="text-ink">{client.phone || '-'}</span></div>
            <div className="flex justify-between"><span className="text-ink-tertiary">E-mail</span><span className="text-ink">{client.email || '-'}</span></div>
            <div className="flex justify-between"><span className="text-ink-tertiary">Nascimento</span><span className="text-ink">{client.birthDate || '-'}</span></div>
            <div className="flex justify-between"><span className="text-ink-tertiary">Titular</span>
              <Link href={`/dashboard/clientes/${id}`} className="text-brand hover:underline">{client.holderName || id}</Link>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

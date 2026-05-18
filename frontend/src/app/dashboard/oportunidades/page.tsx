'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Opportunity {
  id: string; name: string; document: string; status: string;
  sellerName?: string; planName?: string; created_at: string;
}

export default function OportunidadesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api(`/opportunities?${params}`);
      setOpps(res.data);
    } catch { } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const opp = await api('/opportunities', {
        method: 'POST',
        body: JSON.stringify({ name, document }),
      });
      setOpps(prev => [opp, ...prev]);
      setShowCreate(false);
      setName(''); setDocument('');
    } catch (err: any) { setError(err.message); }
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      aberta: 'bg-info/10 text-info border-info/20',
      checkout_gerado: 'bg-warning/10 text-warning border-warning/20',
      convertida: 'bg-success/10 text-success border-success/20',
      cancelada: 'bg-danger/10 text-danger border-danger/20',
    };
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[s] || 'bg-surface-canvas text-ink-tertiary'}`}>{s?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Oportunidades</h1>
          <p className="mt-0.5 text-sm text-ink-tertiary">Gerencie as oportunidades de venda</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
          Nova Oportunidade
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
          <option value="">Todos os status</option>
          <option value="aberta">Abertas</option>
          <option value="checkout_gerado">Checkout Gerado</option>
          <option value="convertida">Convertidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
        <input type="text" placeholder="Buscar por nome ou CPF..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="flex-1 max-w-xs rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink" />
      </div>

      {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : opps.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Nenhuma oportunidade encontrada.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Vendedor</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
                <th className="px-5 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {opps.map(o => (
                <tr key={o.id} className="border-b border-edge last:border-0 hover:bg-surface-canvas/50">
                  <td className="px-5 py-3 font-medium text-ink">{o.name}</td>
                  <td className="px-5 py-3">{statusBadge(o.status)}</td>
                  <td className="px-5 py-3 text-ink-secondary">{o.sellerName || '-'}</td>
                  <td className="px-5 py-3 text-ink-tertiary">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/oportunidades/${o.id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Nova Oportunidade</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Nome</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">CPF/CNPJ</label>
                <input value={document} onChange={e => setDocument(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary transition hover:bg-surface-canvas">Cancelar</button>
                <button type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

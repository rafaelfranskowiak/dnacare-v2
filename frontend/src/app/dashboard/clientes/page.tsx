'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, [typeFilter, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api(`/clients?${params}`);
      setClients(res.data);
    } catch { } finally { setLoading(false); }
  }

  const statusColor = (s: string) => s === 'ativo' ? 'bg-success/10 text-success border-success/20' :
    s === 'inativo' ? 'bg-ink-muted/10 text-ink-tertiary border-ink-muted/20' :
    s === 'inadimplente' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warning/10 text-warning border-warning/20';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Clientes</h1>
        <p className="mt-0.5 text-sm text-ink-tertiary">Titulares e dependentes da unidade</p>
      </div>

      <div className="mb-4 flex gap-3 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
          <option value="">Todos os tipos</option>
          <option value="holder">Titulares</option>
          <option value="dependent">Dependentes</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="inadimplente">Inadimplentes</option>
        </select>
        <input type="text" placeholder="Buscar por nome ou CPF..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink w-64" />
      </div>

      {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : clients.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
          <p className="text-ink-tertiary">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
                <th className="px-5 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-edge last:border-0 hover:bg-surface-canvas/50">
                  <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${c.type === 'holder' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-surface-canvas text-ink-tertiary border-edge'}`}>
                      {c.type === 'holder' ? 'Titular' : 'Dependente'}
                    </span>
                  </td>
                  <td className="px-5 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-5 py-3 text-ink-tertiary">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/clientes/${c.id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10">Abrir</Link>
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

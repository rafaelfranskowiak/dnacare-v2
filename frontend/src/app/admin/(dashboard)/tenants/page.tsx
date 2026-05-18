'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

type ModalMode = 'create' | 'edit' | null;

export default function TenantsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/admin/login'); return; }
    api('/tenants')
      .then((res) => setTenants(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function openEdit(t: Tenant) {
    setEditing(t);
    setName(t.name);
    setSlug(t.slug);
    setMode('edit');
    setError('');
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setSlug('');
    setMode('create');
    setError('');
  }

  function close() {
    setMode(null);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') {
        const tenant = await api('/tenants', {
          method: 'POST',
          body: JSON.stringify({ name, slug }),
        });
        setTenants((prev) => [tenant, ...prev]);
      } else if (mode === 'edit' && editing) {
        const updated = await api(`/tenants/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, slug }),
        });
        setTenants((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
      }
      close();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/tenants/${id}`, { method: 'DELETE' });
      setTenants((prev) => prev.filter((t) => t.id !== id));
    } catch { /* ignore */ }
    setConfirmDelete(null);
  }

  if (authLoading) return null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tenants</h1>
          <p className="mt-0.5 text-sm text-ink-tertiary">Gerencie os tenants da plataforma</p>
        </div>
        {user?.is_platform_admin && (
          <button onClick={openCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark"
          >Novo Tenant</button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-tertiary">Carregando...</p>
      ) : tenants.length === 0 ? (
        <p className="text-sm text-ink-tertiary">Nenhum tenant encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Slug</th>
                <th className="px-5 py-3 font-medium">Criado em</th>
                {user?.is_platform_admin && <th className="px-5 py-3 font-medium w-24">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{t.name}</td>
                  <td className="px-5 py-3 text-ink-secondary">{t.slug}</td>
                  <td className="px-5 py-3 text-ink-tertiary">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {user?.is_platform_admin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(t)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas hover:text-brand"
                        >Editar</button>
                        <button onClick={() => setConfirmDelete(t.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-tertiary transition hover:bg-danger/10 hover:text-danger"
                        >Excluir</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              {mode === 'create' ? 'Novo Tenant' : 'Editar Tenant'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Slug</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Excluir Tenant</h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Tem certeza que deseja excluir este tenant? Esta ação não pode ser desfeita.
            </p>
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

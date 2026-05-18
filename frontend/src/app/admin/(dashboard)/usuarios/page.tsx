'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface User {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  is_platform_admin: boolean;
  active: boolean;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

type ModalMode = 'create' | 'edit' | null;

interface FormData {
  name: string;
  email: string;
  password: string;
  tenantId: string;
  is_platform_admin: boolean;
  active: boolean;
}

const emptyForm: FormData = { name: '', email: '', password: '', tenantId: '', is_platform_admin: false, active: true };

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/admin/login'); return; }
    Promise.all([
      api('/users').then((r) => setUsers(r.data)),
      api('/tenants').then((r) => setTenants(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setMode('create');
    setError('');
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', tenantId: u.tenant_id, is_platform_admin: u.is_platform_admin, active: u.active });
    setMode('edit');
    setError('');
  }

  function close() { setMode(null); setEditing(null); setForm(emptyForm); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') {
        const user = await api('/users', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, tenantId: form.tenantId }),
        });
        setUsers((prev) => [user, ...prev]);
      } else if (mode === 'edit' && editing) {
        const body: any = { name: form.name, email: form.email, tenantId: form.tenantId, active: form.active, is_platform_admin: form.is_platform_admin };
        if (form.password) body.password = form.password;
        const updated = await api(`/users/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setUsers((prev) => prev.map((u) => (u.id === editing.id ? updated : u)));
      }
      close();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await api(`/users/${id}`, { method: 'DELETE' }); setUsers((prev) => prev.filter((u) => u.id !== id)); } catch {}
    setConfirmDelete(null);
  }

  function getTenantName(tenantId: string) {
    return tenants.find((t) => t.id === tenantId || t.slug === tenantId)?.name || tenantId;
  }

  if (authLoading) return null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Usuários</h1>
          <p className="mt-0.5 text-sm text-ink-tertiary">Gerencie os usuários da plataforma</p>
        </div>
        {currentUser?.is_platform_admin && (
        <button onClick={openCreate}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark"
          >Novo Usuário</button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-tertiary">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-tertiary">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-tertiary">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 font-medium">Ativo</th>
                {currentUser?.is_platform_admin && <th className="px-5 py-3 font-medium w-24">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-5 py-3 text-ink-secondary">{u.email}</td>
                  <td className="px-5 py-3 text-ink-secondary">{getTenantName(u.tenant_id)}</td>
                  <td className="px-5 py-3">
                    {u.is_platform_admin ? (
                      <span className="rounded-md border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Sim</span>
                    ) : <span className="text-ink-tertiary">Não</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-success' : 'text-ink-tertiary'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-success' : 'bg-ink-tertiary'}`} />
                      {u.active ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  {currentUser?.is_platform_admin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-ink-secondary transition hover:bg-surface-canvas hover:text-brand"
                        >Editar</button>
                        <button onClick={() => setConfirmDelete(u.id)}
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
            <h2 className="text-lg font-semibold text-ink">{mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">
                  {mode === 'edit' ? `Senha (deixe em branco para manter)` : 'Senha'}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required={mode === 'create'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Tenant</label>
                <select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" required>
                  <option value="">Selecione...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              {mode === 'edit' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-ink-secondary">Admin da plataforma</label>
                    <input type="checkbox" checked={form.is_platform_admin}
                      onChange={(e) => setForm({ ...form, is_platform_admin: e.target.checked })}
                    className="h-4 w-4 rounded border-edge text-brand focus:ring-brand" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-ink-secondary">Usuário ativo</label>
                    <input type="checkbox" checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-edge text-brand focus:ring-brand" />
                  </div>
                </>
              )}
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
            <h2 className="text-lg font-semibold text-ink">Excluir Usuário</h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
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

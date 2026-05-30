'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Tab = 'usuarios' | 'times';

export default function EquipePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('usuarios');

  // Users state
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Teams state
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'representante' });

  // Edit user role
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTeamId, setEditTeamId] = useState('');

  // Create team
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamManager, setTeamManager] = useState('');

  // Expanded team
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Add member to team
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('representante');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const tid = localStorage.getItem('tenantId') || 'default';
      const [membersRes, teamsRes, usersRes] = await Promise.all([
        api(`/tenant-users?tenant_id=${tid}`),
        api('/teams'),
        api('/users'),
      ]);
      const users = usersRes.data || [];
      const userMap: Record<string, { name: string; email: string }> = {};
      users.forEach((u: any) => { userMap[u.id] = { name: u.name, email: u.email }; });
      const enriched = (membersRes.data || []).map((m: any) => ({
        ...m,
        userName: userMap[m.userId]?.name || null,
        userEmail: userMap[m.userId]?.email || null,
      }));
      setMembers(enriched);
      setTeams(teamsRes.data || []);
    } catch { } finally { setLoading(false); setLoadingTeams(false); }
  }

  async function loadTeamMembers(teamId: string) {
    try { const res = await api(`/teams/${teamId}/members`); setTeamMembers(res.data || []); } catch { setTeamMembers([]); }
  }

  function toggleTeam(teamId: string) {
    if (expandedTeam === teamId) { setExpandedTeam(null); setTeamMembers([]); return; }
    setExpandedTeam(teamId);
    loadTeamMembers(teamId);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await api('/users', { method: 'POST', body: JSON.stringify({ name: newUser.name, email: newUser.email, password: newUser.password, tenantId: localStorage.getItem('tenantId') || 'default' }) });
      const tid = localStorage.getItem('tenantId') || 'default';
      await api('/tenant-users', { method: 'POST', body: JSON.stringify({ tenant_id: tid, user_id: user.id, status: 'active' }) });
      setShowCreateUser(false); setNewUser({ name: '', email: '', password: '', role: 'representante' });
      load();
    } catch { }
  }

  async function handleUpdateRole(memberId: string) {
    try {
      await api(`/tenant-users/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role: editRole, teamId: editTeamId || null }) });
      setEditingMember(null); load();
    } catch { }
  }

  async function handleRemoveMember(memberId: string) {
    try { await api(`/tenant-users/${memberId}`, { method: 'DELETE' }); load(); } catch { }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    try { await api('/teams', { method: 'POST', body: JSON.stringify({ name: teamName, managerId: teamManager }) }); setShowCreateTeam(false); setTeamName(''); setTeamManager(''); load(); } catch { }
  }

  async function handleAddToTeam(teamId: string) {
    if (!addUserId) return;
    try { await api(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId: addUserId, role: addRole }) }); setAddUserId(''); loadTeamMembers(teamId); load(); } catch { }
  }

  async function handleRemoveFromTeam(teamId: string, userId: string) {
    try { await api(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }); loadTeamMembers(teamId); load(); } catch { }
  }

  const roleBadge = (r: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-brand/10 text-brand border-brand/20',
      gerente: 'bg-info/10 text-info border-info/20',
      representante: 'bg-surface-canvas text-ink-tertiary border-edge',
    };
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[r] || 'bg-surface-canvas text-ink-tertiary border-edge'}`}>{r || 'sem role'}</span>;
  };

  return (
    <div className="p-8">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-canvas rounded-lg p-1 w-fit">
        {(['usuarios', 'times'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'
            }`}>
            {t === 'usuarios' ? 'Usuários' : 'Times'}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'usuarios' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-tertiary">{members.length} usuário(s) na unidade</p>
            <button onClick={() => setShowCreateUser(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Novo Usuário</button>
          </div>

          {loading ? <p className="text-sm text-ink-tertiary">Carregando...</p> : members.length === 0 ? (
            <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
              <p className="text-ink-tertiary">Nenhum usuário na unidade.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-edge text-ink-tertiary">
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-edge last:border-0 hover:bg-surface-canvas/50">
                      <td className="px-5 py-3 font-medium text-ink">{m.userName || m.userId}</td>
                      <td className="px-5 py-3 text-ink-secondary text-xs">{m.userEmail || '-'}</td>
                      <td className="px-5 py-3">
                        {editingMember === m.id ? (
                          <select value={editRole} onChange={e => setEditRole(e.target.value)}
                            className="rounded border border-edge bg-surface-input px-2 py-1 text-xs text-ink">
                            <option value="admin">Admin</option>
                            <option value="gerente">Gerente</option>
                            <option value="representante">Representante</option>
                          </select>
                        ) : roleBadge(m.role)}
                      </td>
                      <td className="px-5 py-3 text-ink-secondary text-xs">{m.teamId || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${m.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-surface-canvas text-ink-muted border-edge'}`}>{m.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        {editingMember === m.id ? (
                          <div className="flex items-center gap-1">
                            <select value={editTeamId} onChange={e => setEditTeamId(e.target.value)}
                              className="rounded border border-edge bg-surface-input px-2 py-1 text-xs text-ink w-24">
                              <option value="">Sem time</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => handleUpdateRole(m.id)}
                              className="text-xs text-success font-medium hover:underline">Salvar</button>
                            <button onClick={() => setEditingMember(null)}
                              className="text-xs text-ink-tertiary hover:underline">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingMember(m.id); setEditRole(m.role || 'representante'); setEditTeamId(m.teamId || ''); }}
                              className="text-xs text-brand hover:underline">Editar</button>
                            <button onClick={() => handleRemoveMember(m.id)}
                              className="text-xs text-danger hover:underline">Remover</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showCreateUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-ink">Novo Usuário</h2>
                <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Nome</label>
                    <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Email</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Senha</label>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                      <option value="admin">Admin</option>
                      <option value="gerente">Gerente</option>
                      <option value="representante">Representante</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowCreateUser(false)}
                      className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Cancelar</button>
                    <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Criar Usuário</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEAMS TAB */}
      {tab === 'times' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-tertiary">{teams.length} time(s) na unidade</p>
            <button onClick={() => setShowCreateTeam(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Novo Time</button>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-xl border border-edge bg-surface p-12 text-center shadow-sm">
              <p className="text-ink-tertiary">Nenhum time criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map(t => (
                <div key={t.id} className="rounded-xl border border-edge bg-surface shadow-sm">
                  <button onClick={() => toggleTeam(t.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-canvas/50 rounded-xl transition">
                    <div>
                      <h3 className="font-semibold text-ink">{t.name}</h3>
                      <p className="text-sm text-ink-tertiary">Gerente: {t.managerId || 'Não definido'}</p>
                    </div>
                    <span className={`text-ink-tertiary transition-transform ${expandedTeam === t.id ? 'rotate-180' : ''}`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </span>
                  </button>

                  {expandedTeam === t.id && (
                    <div className="px-5 pb-5 border-t border-edge">
                      <h4 className="text-sm font-medium text-ink mt-4 mb-2">Membros</h4>
                      {teamMembers.length > 0 ? (
                        <div className="space-y-1 mb-4">
                          {teamMembers.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between py-2 border-b border-edge last:border-0 text-sm">
                              <span className="text-ink">{m.userName || m.userId} <span className="text-ink-tertiary ml-1">({m.role || 'sem role'})</span></span>
                              <button onClick={() => handleRemoveFromTeam(t.id, m.userId)} className="text-xs text-danger hover:underline">Remover</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-ink-tertiary mb-4">Nenhum membro.</p>}

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-ink-tertiary mb-1">ID do Usuário</label>
                          <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                            className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                            <option value="">Selecione...</option>
                            {members.filter(m => !teamMembers.find(tm => tm.userId === m.userId)).map(m => (
                              <option key={m.userId} value={m.userId}>{m.userName || m.userId} ({m.userEmail})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-ink-tertiary mb-1">Role</label>
                          <select value={addRole} onChange={e => setAddRole(e.target.value)}
                            className="block rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                            <option value="admin">Admin</option>
                            <option value="gerente">Gerente</option>
                            <option value="representante">Representante</option>
                          </select>
                        </div>
                        <button onClick={() => handleAddToTeam(t.id)}
                          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Adicionar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showCreateTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-ink">Novo Time</h2>
                <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Nome do Time</label>
                    <input value={teamName} onChange={e => setTeamName(e.target.value)}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1">Gerente</label>
                    <select value={teamManager} onChange={e => setTeamManager(e.target.value)}
                      className="block w-full rounded-lg border border-edge bg-surface-input px-3 py-2 text-sm text-ink">
                      <option value="">Selecione...</option>
                      {members.map(m => <option key={m.userId} value={m.userId}>{m.userName || m.userId}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowCreateTeam(false)} className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-secondary">Cancelar</button>
                    <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Criar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

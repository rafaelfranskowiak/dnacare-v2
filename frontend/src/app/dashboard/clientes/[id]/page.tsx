'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type ClientRecord = {
  id: string;
  name: string;
  type: 'holder' | 'dependent' | string;
  status: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  holderId?: string | null;
  holderName?: string | null;
  opportunityId?: string | null;
  sellerId?: string | null;
  subscription?: {
    id: string;
    status: string;
    planName: string;
    recurringValue: number;
    startDate: string;
    asaasSubscriptionId: string;
  } | null;
  dependents?: ClientRecord[];
};

type PaymentRecord = {
  id: string;
  dueDate?: string;
  value?: number | string;
  status?: string;
  billingType?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  paymentUrl?: string;
  transactionReceiptUrl?: string;
  externalReference?: string;
};

type FinancialState = {
  payments: PaymentRecord[];
  totalReceived?: number;
  totalDue?: number;
};

type ClientFormState = {
  name: string;
  document: string;
  phone: string;
  email: string;
  birthDate: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type DependentFormState = {
  name: string;
  document: string;
  phone: string;
  email: string;
  birthDate: string;
};

const RECEIVED_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);

function emptyClientForm(client?: ClientRecord | null): ClientFormState {
  return {
    name: client?.name ?? '',
    document: client?.document ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    birthDate: client?.birthDate ?? '',
    postalCode: client?.postalCode ?? '',
    address: client?.address ?? '',
    addressNumber: client?.addressNumber ?? '',
    addressComplement: client?.addressComplement ?? '',
    neighborhood: client?.neighborhood ?? '',
    city: client?.city ?? '',
    state: client?.state ?? '',
  };
}

function emptyDependentForm(): DependentFormState {
  return {
    name: '',
    document: '',
    phone: '',
    email: '',
    birthDate: '',
  };
}

function parseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toLowerCase();
}

function formatStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === 'ativo') return 'Ativo';
  if (normalized === 'inadimplente') return 'Inadimplente';
  if (normalized === 'inativo') return 'Inativo';
  if (normalized === 'cancelamento_pendente') return 'Cancelamento pendente';
  if (normalized === 'vinculado_a_titular_inativo') return 'Vinculado ao titular inativo';
  if (!status) return '-';

  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(value?: number | string | null) {
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatCityState(client: ClientRecord) {
  const city = client.city?.trim();
  const state = client.state?.trim().toUpperCase();

  if (!city && !state) return '-';
  if (!city) return state || '-';
  if (!state) return city;
  return `${city} - ${state}`;
}

function formatAddress(client: ClientRecord) {
  const parts = [client.address?.trim(), client.addressNumber?.trim()].filter(Boolean);
  const base = parts.length ? parts.join(', ') : '';
  const complement = client.addressComplement?.trim();

  if (!base && !complement) return '-';
  if (!complement) return base || '-';
  return base ? `${base} - ${complement}` : complement;
}

function formatPaymentType(type?: string | null) {
  if (!type) return '-';
  if (type === 'CREDIT_CARD') return 'Cartão';
  if (type === 'BOLETO') return 'Boleto';
  return type;
}

function formatPaymentStatus(status?: string | null) {
  const normalized = normalizeStatus(status).toUpperCase();
  if (normalized === 'RECEIVED' || normalized === 'CONFIRMED' || normalized === 'RECEIVED_IN_CASH') return 'recebido';
  if (normalized === 'OVERDUE') return 'vencida';
  if (normalized === 'PENDING' || normalized === 'WAITING_PAYMENT') return 'pendente';
  if (normalized === 'REFUNDED') return 'estornada';
  if (normalized === 'CANCELLED') return 'cancelada';
  return normalizeStatus(status) || '-';
}

function paymentStatusTone(status?: string | null) {
  const normalized = normalizeStatus(status).toUpperCase();
  if (RECEIVED_STATUSES.has(normalized)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (normalized === 'OVERDUE') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (normalized === 'PENDING' || normalized === 'WAITING_PAYMENT') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function clientStatusTone(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === 'ativo') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (normalized === 'inadimplente') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (normalized === 'cancelamento_pendente') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function paymentUrl(payment: PaymentRecord) {
  return payment.invoiceUrl || payment.bankSlipUrl || payment.paymentUrl || payment.transactionReceiptUrl || '';
}

function toNumber(value?: number | string | null) {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

function computeTotals(payments: PaymentRecord[]) {
  return payments.reduce(
    (acc, payment) => {
      const amount = toNumber(payment.value);
      const normalized = normalizeStatus(payment.status).toUpperCase();

      if (RECEIVED_STATUSES.has(normalized)) {
        acc.received += amount;
      } else if (normalized !== 'CANCELLED' && normalized !== 'REFUNDED') {
        acc.due += amount;
      }

      return acc;
    },
    { received: 0, due: 0 },
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-base font-medium text-white">{value}</p>
    </div>
  );
}

function SectionBadge({ children, tone }: { children: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

function ActionIcon({ kind }: { kind: 'eye' | 'plus' | 'edit' | 'refresh' | 'check' }) {
  switch (kind) {
    case 'plus':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5m6.75-6.75H5.25" />
        </svg>
      );
    case 'edit':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487Z" />
        </svg>
      );
    case 'refresh':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 5.487A9 9 0 1 0 20.25 12h-2.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75v5.25h5.25" />
        </svg>
      );
    case 'check':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 5.25 5.25L19.5 8.25" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
  }
}

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[1px]">
      <div className={`w-full ${maxWidth} rounded-2xl border border-[#323844] bg-[#1b1f27] shadow-sm`}>
        <div className="flex items-center justify-between border-b border-[#323844] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#323844] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
          >
            Fechar
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [financial, setFinancial] = useState<FinancialState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingDependent, setAddingDependent] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [clientError, setClientError] = useState('');
  const [financialError, setFinancialError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [dependentOpen, setDependentOpen] = useState(false);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [editForm, setEditForm] = useState<ClientFormState>(emptyClientForm());
  const [dependentForm, setDependentForm] = useState<DependentFormState>(emptyDependentForm());

  const loadFinancial = useCallback(async (clientId: string) => {
    setLoadingFinancial(true);
    setFinancialError('');

    try {
      const data = await api(`/clients/${clientId}/financial`);
      const payments = Array.isArray(data?.payments) ? (data.payments as PaymentRecord[]) : [];
      setFinancial({
        payments,
        totalReceived: typeof data?.totalReceived === 'number' ? data.totalReceived : undefined,
        totalDue: typeof data?.totalDue === 'number' ? data.totalDue : undefined,
      });
    } catch {
      setFinancial(null);
      setFinancialError('Falha ao carregar o histórico financeiro.');
    } finally {
      setLoadingFinancial(false);
    }
  }, []);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setClientError('');
    setActionError('');
    setSettleResult(null);

    try {
      const data = await api(`/clients/${id}`);
      if (!data) {
        setClient(null);
        setFinancial(null);
        setClientError('Cliente não encontrado.');
        return;
      }

      const nextClient = data as ClientRecord;
      setClient(nextClient);
      setEditForm(emptyClientForm(nextClient));
      setDependentForm(emptyDependentForm());

      if (nextClient.type === 'holder') {
        void loadFinancial(nextClient.id);
      } else {
        setFinancial(null);
      }
    } catch {
      setClient(null);
      setFinancial(null);
      setClientError('Cliente não encontrado.');
    } finally {
      setLoading(false);
    }
  }, [id, loadFinancial]);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.push('/login');
      return;
    }

    void loadClient();
  }, [loadClient, router]);

  const sortedPayments = useMemo(() => {
    if (!financial?.payments?.length) return [];

    return [...financial.payments].sort((a, b) => {
      const left = Date.parse(b.dueDate || '') || 0;
      const right = Date.parse(a.dueDate || '') || 0;
      return left - right;
    });
  }, [financial]);

  const totals = useMemo(() => {
    const computed = computeTotals(sortedPayments);
    const backendReceived = financial?.totalReceived;
    const backendDue = financial?.totalDue;

    return {
      received: typeof backendReceived === 'number' && backendReceived > 0 ? backendReceived : computed.received,
      due: typeof backendDue === 'number' && backendDue > 0 ? backendDue : computed.due,
    };
  }, [financial, sortedPayments]);

  const dependentCount = client?.dependents?.length ?? 0;

  async function handleSaveClient() {
    if (!client) return;

    setSavingEdit(true);
    setActionError('');

    try {
      await api(`/clients/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setEditOpen(false);
      await loadClient();
    } catch (error: unknown) {
      setActionError(parseErrorMessage(error, 'Não foi possível salvar os dados do cliente.'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateDependent() {
    if (!client || client.type !== 'holder') return;

    setAddingDependent(true);
    setActionError('');

    try {
      await api(`/clients/${client.id}/dependents`, {
        method: 'POST',
        body: JSON.stringify(dependentForm),
      });
      setDependentOpen(false);
      setDependentForm(emptyDependentForm());
      await loadClient();
    } catch (error: unknown) {
      setActionError(parseErrorMessage(error, 'Não foi possível adicionar o dependente.'));
    } finally {
      setAddingDependent(false);
    }
  }

  async function handleReactivatePlan() {
    if (!client || client.type !== 'holder') return;

    setReactivating(true);
    setActionError('');

    try {
      await api(`/clients/${client.id}/reactivate-plan`, {
        method: 'POST',
      });
      await loadClient();
    } catch (error: unknown) {
      setActionError(parseErrorMessage(error, 'Não foi possível reativar o plano.'));
    } finally {
      setReactivating(false);
    }
  }

  async function handleSettleDebts() {
    if (!client || client.type !== 'holder') return;

    setSettling(true);
    setSettleResult(null);
    setActionError('');

    try {
      const result = await api(`/clients/${client.id}/settle-debts`, {
        method: 'POST',
      });
      setSettleResult(result);
      await loadFinancial(client.id);
    } catch (error: unknown) {
      setSettleResult({ error: parseErrorMessage(error, 'Não foi possível quitar os débitos.') });
    } finally {
      setSettling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0f1115] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center rounded-2xl border border-[#2c313b] bg-[#1a1d24] px-6 py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0f1115] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center rounded-2xl border border-[#2c313b] bg-[#1a1d24] px-6 py-12">
          <p className="text-sm text-slate-400">{clientError || 'Cliente não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const isHolder = client.type === 'holder';
  const hasSubscription = Boolean(isHolder && client.subscription);
  const renewalPeriod = hasSubscription ? 'Mensal' : '-';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f1115] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {!isHolder && client.holderId && (
              <Link
                href={`/dashboard/clientes/${client.holderId}`}
                className="text-sm font-medium text-slate-400 transition hover:text-emerald-300"
              >
                ← Voltar ao Titular
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#3a404c] bg-[#171a20] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-[#20242c] hover:text-white"
            >
              <ActionIcon kind="edit" />
              Editar Dados
            </button>

            {isHolder && (
              <button
                type="button"
                onClick={handleReactivatePlan}
                disabled={reactivating}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ActionIcon kind="refresh" />
                {reactivating ? 'Reativando...' : 'Reativar Plano'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#323844] bg-[#1b1f27] shadow-sm">
          <div className="px-6 py-5">
            <h1 className="text-2xl font-semibold text-white">Detalhes do Plano</h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-slate-300">Titular</p>
              <SectionBadge tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {isHolder ? 'Titular' : 'Dependente'}
              </SectionBadge>
              <SectionBadge tone={clientStatusTone(client.status)}>{formatStatusLabel(client.status)}</SectionBadge>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <InfoField label="Nome" value={client.name || '-'} />
                <InfoField label="Email" value={client.email || '-'} />
                <InfoField label="Bairro" value={client.neighborhood || '-'} />
              </div>

              <div className="space-y-6">
                <InfoField label="CPF/CNPJ" value={client.document || '-'} />
                <InfoField label="Período de Renovação" value={renewalPeriod} />
                <InfoField label="Cidade/UF" value={formatCityState(client)} />
              </div>

              <div className="space-y-6">
                <InfoField label="Telefone" value={client.phone || '-'} />
                <InfoField label="Endereço" value={formatAddress(client)} />
                <InfoField label="CEP" value={client.postalCode || '-'} />
              </div>
            </div>

            {isHolder && (
              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-300">Dependentes ({dependentCount})</h2>
                  <button
                    type="button"
                    onClick={() => setDependentOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                  >
                    <ActionIcon kind="plus" />
                    Adicionar Dependente
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-[#323844] bg-[#171b22]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#1c2027] text-slate-400">
                        <tr>
                          <th className="px-5 py-3 font-medium">Nome</th>
                          <th className="px-5 py-3 font-medium">CPF</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Telefone</th>
                          <th className="px-5 py-3 font-medium">Nascimento</th>
                          <th className="px-5 py-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a3039]">
                        {(client.dependents || []).map((dependent) => (
                          <tr key={dependent.id} className="transition hover:bg-white/[0.03]">
                            <td className="px-5 py-4">
                              <Link
                                href={`/dashboard/clientes/${client.id}/dependentes/${dependent.id}`}
                                className="font-semibold text-white transition hover:text-emerald-300"
                              >
                                {dependent.name}
                              </Link>
                            </td>
                            <td className="px-5 py-4 text-slate-300">{dependent.document || '-'}</td>
                            <td className="px-5 py-4">
                              <SectionBadge tone={clientStatusTone(dependent.status)}>{formatStatusLabel(dependent.status)}</SectionBadge>
                            </td>
                            <td className="px-5 py-4 text-slate-300">{dependent.phone || '-'}</td>
                            <td className="px-5 py-4 text-slate-300">{formatDate(dependent.birthDate)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4 text-sm">
                                <Link
                                  href={`/dashboard/clientes/${client.id}/dependentes/${dependent.id}`}
                                  className="font-medium text-sky-300 transition hover:text-sky-200"
                                >
                                  Editar
                                </Link>
                                <button
                                  type="button"
                                  className="font-medium text-red-400 transition hover:text-red-300"
                                  onClick={async () => {
                                    const confirmed = window.confirm(`Excluir o dependente ${dependent.name}?`);
                                    if (!confirmed) return;

                                    try {
                                      await api(`/clients/${client.id}/dependents/${dependent.id}`, {
                                        method: 'DELETE',
                                      });
                                      await loadClient();
                                    } catch (error: unknown) {
                                      setActionError(parseErrorMessage(error, 'Não foi possível excluir o dependente.'));
                                    }
                                  }}
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {(client.dependents || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                              Nenhum dependente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {isHolder && (
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-5 shadow-sm">
              <p className="text-sm text-slate-400">Total Recebido</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-400">{formatCurrency(totals.received)}</p>
            </article>

            <article className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-5 shadow-sm">
              <p className="text-sm text-slate-400">Total Devido</p>
              <p className="mt-2 text-2xl font-semibold text-red-400">{formatCurrency(totals.due)}</p>
            </article>
          </div>
        )}

        {isHolder && (
          <section className="overflow-hidden rounded-2xl border border-[#323844] bg-[#1b1f27] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#323844] px-6 py-5">
              <h2 className="text-xl font-semibold text-white">Histórico de Faturas</h2>

              <button
                type="button"
                onClick={handleSettleDebts}
                disabled={settling}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ActionIcon kind="check" />
                {settling ? 'Processando...' : 'Quitar Débitos'}
              </button>
            </div>

            <div className="p-6">
              {settleResult && !settleResult.error && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
                  <p className="font-medium text-emerald-300">Negociação gerada!</p>
                  <p className="mt-1 text-slate-300">
                    Valor consolidado: {formatCurrency(settleResult.consolidatedValue ?? settleResult.totalValue ?? totals.due)}
                  </p>
                  {(settleResult.settlementUrl || settleResult.paymentUrl) && (
                    <a
                      href={settleResult.settlementUrl || settleResult.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-sky-300 transition hover:text-sky-200"
                    >
                      Link de pagamento ↗
                    </a>
                  )}
                </div>
              )}

              {settleResult?.error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {settleResult.error}
                </div>
              )}

              {financialError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {financialError}
                </div>
              )}

              {loadingFinancial && !financial ? (
                <div className="rounded-xl border border-[#323844] bg-[#171b22] px-4 py-10 text-center">
                  <p className="text-sm text-slate-400">Carregando histórico financeiro...</p>
                </div>
              ) : sortedPayments.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#323844] bg-[#171b22]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#1c2027] text-slate-400">
                        <tr>
                          <th className="px-5 py-3 font-medium">Vencimento</th>
                          <th className="px-5 py-3 font-medium">Valor</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Tipo</th>
                          <th className="px-5 py-3 font-medium">Links</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a3039]">
                        {sortedPayments.slice(0, 20).map((payment) => {
                          const href = paymentUrl(payment);

                          return (
                            <tr key={payment.id} className="transition hover:bg-white/[0.03]">
                              <td className="px-5 py-4 text-slate-200">{formatDate(payment.dueDate)}</td>
                              <td className="px-5 py-4 text-slate-200">{formatCurrency(payment.value)}</td>
                              <td className="px-5 py-4">
                                <SectionBadge tone={paymentStatusTone(payment.status)}>{formatPaymentStatus(payment.status)}</SectionBadge>
                              </td>
                              <td className="px-5 py-4">
                                <SectionBadge tone="border-slate-500/20 bg-slate-500/10 text-slate-300">
                                  {formatPaymentType(payment.billingType)}
                                </SectionBadge>
                              </td>
                              <td className="px-5 py-4">
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-slate-400 transition hover:text-emerald-300"
                                    title="Abrir link"
                                  >
                                    <ActionIcon kind="eye" />
                                  </a>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#323844] bg-[#171b22] px-4 py-10 text-center">
                  <p className="text-sm text-slate-400">Nenhuma fatura encontrada.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {!isHolder && (
          <section className="overflow-hidden rounded-2xl border border-[#323844] bg-[#1b1f27] shadow-sm">
            <div className="px-6 py-5">
              <h2 className="text-xl font-semibold text-white">Dados do Cliente</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <InfoField label="Nome" value={client.name || '-'} />
                <InfoField label="CPF/CNPJ" value={client.document || '-'} />
                <InfoField label="Status" value={formatStatusLabel(client.status)} />
                <InfoField label="Telefone" value={client.phone || '-'} />
                <InfoField label="E-mail" value={client.email || '-'} />
                <InfoField label="Nascimento" value={formatDate(client.birthDate)} />
                <InfoField label="Endereço" value={formatAddress(client)} />
                <InfoField label="Cidade/UF" value={formatCityState(client)} />
                <InfoField label="CEP" value={client.postalCode || '-'} />
              </div>
            </div>
          </section>
        )}
      </div>

      {editOpen && (
        <ModalShell title="Editar Dados" onClose={() => setEditOpen(false)} maxWidth="max-w-3xl">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['name', 'Nome'],
              ['document', 'CPF/CNPJ'],
              ['phone', 'Telefone'],
              ['email', 'E-mail'],
              ['birthDate', 'Nascimento', 'date'],
              ['postalCode', 'CEP'],
              ['address', 'Endereço'],
              ['addressNumber', 'Número'],
              ['addressComplement', 'Complemento'],
              ['neighborhood', 'Bairro'],
              ['city', 'Cidade'],
              ['state', 'UF'],
            ].map(([key, label, type]) => {
              const field = key as keyof ClientFormState;
              return (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label as string}</span>
                  <input
                    type={(type as string) || 'text'}
                    value={editForm[field]}
                    onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="block h-11 w-full rounded-xl border border-[#323844] bg-[#171b22] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-xl border border-[#323844] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveClient}
              disabled={savingEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ActionIcon kind="check" />
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </ModalShell>
      )}

      {dependentOpen && (
        <ModalShell title="Adicionar Dependente" onClose={() => setDependentOpen(false)} maxWidth="max-w-2xl">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['name', 'Nome'],
              ['document', 'CPF'],
              ['phone', 'Telefone'],
              ['email', 'E-mail'],
              ['birthDate', 'Nascimento', 'date'],
            ].map(([key, label, type]) => {
              const field = key as keyof DependentFormState;
              return (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label as string}</span>
                  <input
                    type={(type as string) || 'text'}
                    value={dependentForm[field]}
                    onChange={(event) => setDependentForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="block h-11 w-full rounded-xl border border-[#323844] bg-[#171b22] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDependentOpen(false)}
              className="rounded-xl border border-[#323844] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateDependent}
              disabled={addingDependent}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ActionIcon kind="plus" />
              {addingDependent ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

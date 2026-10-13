import { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet, Check, X, CreditCard, Truck, Copy, Download } from '@/icons';
import { adminApi, type AdminWithdrawal } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, TabGroup, Tab, Button, EmptyState, KpiCard, LoadingState, Notice, SearchInput, Toolbar, confirmDialog, exportCsv, fmt, promptDialog, toast, type Column } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const TABS = ['initiated', 'processing', 'completed', 'rejected'] as const;

const CSV_COLUMNS: Column<AdminWithdrawal>[] = [
  { key: 'date', header: 'Requested on', render: () => null, value: (w) => new Date(w.createdAt).toLocaleString('en-IN') },
  { key: 'name', header: 'Name', render: () => null, value: (w) => w.user?.name ?? '' },
  { key: 'email', header: 'Email', render: () => null, value: (w) => w.user?.email ?? '' },
  { key: 'role', header: 'Role', render: () => null, value: (w) => w.user?.role ?? '' },
  { key: 'method', header: 'Method', render: () => null, value: (w) => w.payoutMethod },
  { key: 'details', header: 'Payout details', render: () => null, value: (w) => w.payoutDetails },
  { key: 'amount', header: 'Requested (₹)', render: () => null, value: (w) => w.amount / 100 },
  { key: 'fee', header: 'Platform fee (₹)', render: () => null, value: (w) => w.platformFee / 100 },
  { key: 'net', header: 'Net payout (₹)', render: () => null, value: (w) => w.netPayoutAmount / 100 },
  { key: 'status', header: 'Status', render: () => null, value: (w) => w.status },
  { key: 'note', header: 'Admin note', render: () => null, value: (w) => w.adminNote ?? '' },
];

export default function AdminWithdrawals() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('initiated');
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withdrawals;
    return withdrawals.filter((w) => `${w.user?.name} ${w.user?.email} ${w.payoutDetails}`.toLowerCase().includes(q));
  }, [withdrawals, search]);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listWithdrawals(tab)
      .then(setWithdrawals)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const handleMarkProcessing = async (id: string) => {
    setActingOn(id);
    try {
      await adminApi.markWithdrawalProcessing(id);
      setWithdrawals((prev) => prev.filter((w) => w._id !== id));
      toast.success('Moved to processing');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!(await confirmDialog({ title: 'Mark this payout as paid?', message: 'Only do this after the money has actually been sent by UPI or bank transfer. The creator is told it’s paid.', confirmLabel: 'Yes, it’s paid' }))) return;
    setActingOn(id);
    try {
      await adminApi.markWithdrawalPaid(id);
      setWithdrawals((prev) => prev.filter((w) => w._id !== id));
      toast.success('Marked as paid');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = await promptDialog({ title: 'Reject this withdrawal?', message: 'The amount goes back to their Fanitt wallet.', tone: 'danger', confirmLabel: 'Reject', input: { label: 'Reason (shown to the user)', placeholder: 'e.g. Bank details don’t match the account name', multiline: true } });
    if (reason === null) return;
    setActingOn(id);
    try {
      await adminApi.rejectWithdrawal(id, reason);
      setWithdrawals((prev) => prev.filter((w) => w._id !== id));
      toast.success('Withdrawal rejected — amount returned to their wallet');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Withdrawal Requests" description="Payout requests from creators, brands, and agencies." />

      <Toolbar
        actions={
          <Button variant="outline" size="sm" disabled={!shown.length} onClick={() => exportCsv(`withdrawals-${tab}`, CSV_COLUMNS, shown)}>
            <Download size={13} /> Export CSV
          </Button>
        }
      >
        <TabGroup>
          {TABS.map((t) => (
            <Tab key={t} active={tab === t} onClick={() => setTab(t)} groupId="wd-tabs">
              <span className="capitalize">{t}</span>
            </Tab>
          ))}
        </TabGroup>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, UPI or bank details…" />
      </Toolbar>

      {!loading && withdrawals.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label={`${fmt.label(tab)} requests`} value={fmt.number(shown.length)} icon={Wallet} tone="orange" />
          <KpiCard label="Total requested" value={fmt.rupees(shown.reduce((n, w) => n + w.amount, 0))} icon={CreditCard} tone="sky" />
          <KpiCard label="Net to pay out" value={fmt.rupees(shown.reduce((n, w) => n + w.netPayoutAmount, 0))} icon={Check} tone="emerald" hint="After the platform fee" />
        </div>
      )}

      {error && (
        <Notice tone="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      {loading && <LoadingState text="Loading withdrawals…" />}

      {!loading && shown.length === 0 && (
        <Card>
          <EmptyState icon={Wallet} message={search ? `No ${tab} withdrawals match “${search}”.` : `No ${tab} withdrawals.`} />
        </Card>
      )}

      {!loading && shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((w) => (
            <Card key={w._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-white/60">
                  {w.user?.name || 'Unknown'} <span className="text-gray-400 dark:text-white/40">({w.user?.role})</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                  <CreditCard size={11} /> {w.payoutMethod.toUpperCase()}: <span className="font-mono">{w.payoutDetails}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(w.payoutDetails).then(() => toast.success('Payout details copied'), () => {})}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"
                    aria-label="Copy payout details"
                    title="Copy"
                  >
                    <Copy size={11} />
                  </button>
                </p>
                {w.adminNote && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">Note: {w.adminNote}</p>}
                <p className="mt-1 text-xs text-gray-300 dark:text-white/30">
                  {new Date(w.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>

                {/* Fee breakdown — matches what the user themselves sees
                    on their own wallet page (MyWallet.tsx), so Admin can
                    verify the exact net figure before sending the payout. */}
                <div className="mt-3 flex w-fit gap-4 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-white/[0.03]">
                  <div>
                    <p className="text-gray-400 dark:text-white/40">Requested</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatRupees(w.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-white/40">Platform fee ({w.platformFeePercent}%)</p>
                    <p className="font-bold text-rose-500 dark:text-rose-300">− {formatRupees(w.platformFee)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-white/40">Net payout</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-300">{formatRupees(w.netPayoutAmount)}</p>
                  </div>
                </div>
              </div>

              {tab === 'initiated' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleMarkProcessing(w._id)}
                    disabled={actingOn === w._id}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                  >
                    {actingOn === w._id ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Mark Processing
                  </button>
                  <Button variant="primary" size="md" onClick={() => handleMarkPaid(w._id)} disabled={actingOn === w._id} className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700">
                    {actingOn === w._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Mark Completed
                  </Button>
                  <Button variant="danger" size="md" onClick={() => handleReject(w._id)} disabled={actingOn === w._id}>
                    <X size={14} /> Reject
                  </Button>
                </div>
              )}

              {tab === 'processing' && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="md" onClick={() => handleMarkPaid(w._id)} disabled={actingOn === w._id} className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700">
                    {actingOn === w._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Mark Completed
                  </Button>
                  <Button variant="danger" size="md" onClick={() => handleReject(w._id)} disabled={actingOn === w._id}>
                    <X size={14} /> Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
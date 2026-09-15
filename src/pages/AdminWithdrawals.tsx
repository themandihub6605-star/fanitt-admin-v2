import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Wallet, Check, X, CreditCard, Truck } from 'lucide-react';
import { adminApi, type AdminWithdrawal } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, TabGroup, Tab, Button, EmptyState } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const TABS = ['initiated', 'processing', 'completed', 'rejected'] as const;

export default function AdminWithdrawals() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('initiated');
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

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
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!window.confirm('Confirm you have actually sent this payout via UPI/bank transfer?')) return;
    setActingOn(id);
    try {
      await adminApi.markWithdrawalPaid(id);
      setWithdrawals((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejecting (the amount will be refunded to their wallet):') || '';
    setActingOn(id);
    try {
      await adminApi.rejectWithdrawal(id, reason);
      setWithdrawals((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Withdrawal Requests" description="Payout requests from creators, brands, and agencies." />

      <TabGroup>
        {TABS.map((t) => (
          <Tab key={t} active={tab === t} onClick={() => setTab(t)}>
            <span className="capitalize">{t}</span>
          </Tab>
        ))}
      </TabGroup>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading withdrawals...</p>
        </div>
      )}

      {!loading && withdrawals.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={Wallet} message={`No ${tab} withdrawals.`} />
        </div>
      )}

      {!loading && withdrawals.length > 0 && (
        <div className="mt-6 space-y-3">
          {withdrawals.map((w) => (
            <Card key={w._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-white/60">
                  {w.user?.name || 'Unknown'} <span className="text-gray-400 dark:text-white/40">({w.user?.role})</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/40">
                  <CreditCard size={11} /> {w.payoutMethod.toUpperCase()}: {w.payoutDetails}
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
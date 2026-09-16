import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Receipt, ChevronLeft, ChevronRight, CalendarDays, X, ArrowRight } from 'lucide-react';
import { adminApi, type AdminTransaction } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState, TabGroup, Tab } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const TYPE_LABELS: Record<string, string> = {
  session_payment: 'Session Payment',
  donation: 'Donation',
  campaign_escrow_deposit: 'Escrow Deposit',
  campaign_payout: 'Campaign Payout',
  agency_commission: 'Agency Commission',
  referral_commission: 'Referral Commission',
  platform_commission: 'Platform Commission',
  refund: 'Refund',
};

const TYPE_OPTIONS = ['', ...Object.keys(TYPE_LABELS)];
const STATUS_OPTIONS = ['', 'pending', 'in_escrow', 'success', 'failed', 'refunded', 'released'];

const STATUS_TONE: Record<string, 'emerald' | 'amber' | 'sky' | 'rose' | 'gray'> = {
  success: 'emerald',
  released: 'emerald',
  pending: 'amber',
  in_escrow: 'sky',
  failed: 'rose',
  refunded: 'amber',
};

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'year';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

/** Turns a preset into a concrete [start, end] range in the browser's
 * local time zone. `end` is always "now" — these are always trailing
 * windows up to the current moment, not full calendar buckets. Week
 * starts Monday. Returns null for 'all' (no filtering). */
function getPresetRange(preset: DatePreset): { start: Date; end: Date } | null {
  if (preset === 'all') return null;
  const now = new Date();
  const end = now;
  let start: Date;

  if (preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (preset === 'week') {
    const day = now.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-white/5">
      <span className="text-gray-400 dark:text-white/40">{label}</span>
      <span className={`text-right font-semibold text-gray-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

/** Full detail view for one transaction — everything the list row
 * doesn't have room to show: both commission breakdowns, net amount,
 * full from/to identity, exact timestamp, and the raw transaction id.
 * Built entirely from the object already fetched for the list (the
 * `/admin/transactions` response already includes every field below),
 * so opening it needs no extra request. */
function TransactionDetailModal({ transaction, onClose }: { transaction: AdminTransaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="w-full">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Transaction Detail</p>
            <p className="mt-0.5 text-base font-extrabold text-gray-900 dark:text-white">{TYPE_LABELS[transaction.type] || transaction.type}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-5 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 p-4 text-center dark:from-orange-500/10 dark:to-pink-500/10">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatRupees(transaction.amount)}</p>
            <Badge tone={STATUS_TONE[transaction.status] || 'gray'} className="mt-1.5">
              {transaction.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3.5 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">From</p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{transaction.from?.name || '—'}</p>
              <p className="truncate text-xs text-gray-400 dark:text-white/40">{transaction.from?.email || ''}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-gray-300 dark:text-white/20" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">To</p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{transaction.to?.name || '—'}</p>
              <p className="truncate text-xs text-gray-400 dark:text-white/40">{transaction.to?.email || ''}</p>
            </div>
          </div>

          <DetailRow label="Gross Amount" value={formatRupees(transaction.amount)} />
          {transaction.platformCommission !== undefined && (
            <DetailRow label="Platform Commission" value={formatRupees(transaction.platformCommission)} />
          )}
          {transaction.agencyCommission !== undefined && (
            <DetailRow label="Agency Commission" value={formatRupees(transaction.agencyCommission)} />
          )}
          {transaction.referralCommission !== undefined && (
            <DetailRow label="Referral Commission" value={formatRupees(transaction.referralCommission)} />
          )}
          {transaction.netAmount !== undefined && <DetailRow label="Net Amount" value={formatRupees(transaction.netAmount)} />}
          <DetailRow
            label="Date & Time"
            value={new Date(transaction.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          <DetailRow label="Transaction ID" value={transaction._id} mono />
        </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function AdminTransactions() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminTransaction | null>(null);

  const range = useMemo(() => getPresetRange(datePreset), [datePreset]);

  useEffect(() => {
    setLoading(true);
    setError('');
    adminApi
      .listAllTransactions({
        type: type || undefined,
        status: status || undefined,
        startDate: range?.start.toISOString(),
        endDate: range?.end.toISOString(),
        page,
        limit: 25,
      })
      .then((d) => {
        setTransactions(d.transactions);
        setPages(d.pages);
        setTotal(d.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, status, range, page]);

  return (
    <div>
      <PageHeader title="All Transactions" description={`Every payment on the platform — ${total.toLocaleString('en-IN')} total.`} />

      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={15} className="text-gray-400 dark:text-white/40" />
        <TabGroup>
          {DATE_PRESETS.map((p) => (
            <Tab
              key={p.value}
              groupId="date-preset"
              active={datePreset === p.value}
              onClick={() => {
                setDatePreset(p.value);
                setPage(1);
              }}
            >
              {p.label}
            </Tab>
          ))}
        </TabGroup>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t ? TYPE_LABELS[t] : 'All types'}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm capitalize text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s ? s.replace('_', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Receipt} message="No transactions match these filters." />
        </div>
      ) : (
        <>
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-400 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/40">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">From</th>
                    <th className="px-4 py-3 font-semibold">To</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {transactions.map((t, i) => (
                    <motion.tr
                      key={t._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 20) * 0.02 }}
                      onClick={() => setSelected(t)}
                      className="cursor-pointer transition-colors hover:bg-orange-50/60 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{TYPE_LABELS[t.type] || t.type}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/60">{t.from?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/60">{t.to?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[t.status] || 'gray'}>{t.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-white/50">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatRupees(t.amount)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-white/40">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={14} /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>{selected && <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </div>
  );
}
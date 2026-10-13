import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy, Receipt } from '@/icons';
import { adminApi, type AdminTransaction } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { Avatar, DataTable, Drawer, PageHeader, SegmentedControl, Select, StatusBadge, fmt, toast, type Column } from '@/components/AdminUI';

// Every value of TRANSACTION_TYPE in the backend (constants/enums.js).
const TYPE_LABELS: Record<string, string> = {
  session_payment: 'Session payment',
  donation: 'Donation',
  gift: 'Gift',
  campaign_escrow_deposit: 'Escrow deposit',
  campaign_payout: 'Campaign payout',
  campaign_posting_fee: 'Campaign posting fee',
  agency_commission: 'Agency commission',
  referral_commission: 'Referral commission',
  platform_commission: 'Platform commission',
  subscription_payment: 'Subscription payment',
  extra_proposal_fee: 'Extra proposal fee',
  refund: 'Refund',
  store_sale: 'Store sale',
};
const typeLabel = (t: string) => TYPE_LABELS[t] || fmt.label(t);

const STATUS_OPTIONS = ['pending', 'in_escrow', 'success', 'failed', 'refunded', 'released'];

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'year';

/** Trailing window up to now (week starts Monday). null = all time. */
function getPresetRange(preset: DatePreset): { start: Date; end: Date } | null {
  if (preset === 'all') return null;
  const now = new Date();
  let start: Date;
  if (preset === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (preset === 'week') {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
  } else if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else start = new Date(now.getFullYear(), 0, 1);
  return { start, end: now };
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2.5 text-sm last:border-0 dark:border-white/5">
      <span className="text-gray-500 dark:text-white/45">{label}</span>
      <span className={`text-right font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-xs' : 'tabular-nums'}`}>{value}</span>
    </div>
  );
}

function Party({ who, label, align = 'left' }: { who: AdminTransaction['from']; label: string; align?: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{who?.name || '—'}</p>
      <p className="truncate text-xs text-gray-400">{who?.email || ''}</p>
    </div>
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
  const [reload, setReload] = useState(0);

  const range = useMemo(() => getPresetRange(datePreset), [datePreset]);

  useEffect(() => {
    setLoading(true);
    setError('');
    adminApi
      .listAllTransactions({ type: type || undefined, status: status || undefined, startDate: range?.start.toISOString(), endDate: range?.end.toISOString(), page, limit: 50 })
      .then((d) => {
        setTransactions(d.transactions);
        setPages(d.pages);
        setTotal(d.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, status, range, page, reload]);

  const pageSum = transactions.reduce((n, t) => n + (t.status === 'success' || t.status === 'released' ? t.amount : 0), 0);

  const columns: Column<AdminTransaction>[] = [
    { key: 'type', header: 'Type', sortable: true, value: (t) => typeLabel(t.type), render: (t) => <span className="font-medium text-gray-900 dark:text-white">{typeLabel(t.type)}</span> },
    {
      key: 'from',
      header: 'From',
      sortable: true,
      value: (t) => t.from?.name ?? '',
      render: (t) => (
        <span className="flex items-center gap-2">
          {t.from && <Avatar name={t.from.name} size={22} />}
          <span className="truncate">{t.from?.name || '—'}</span>
        </span>
      ),
    },
    { key: 'to', header: 'To', sortable: true, value: (t) => t.to?.name ?? '', hideOnMobile: true, render: (t) => <span className="truncate">{t.to?.name || '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, value: (t) => t.status, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'date', header: 'Date', sortable: true, value: (t) => t.createdAt, render: (t) => <span className="whitespace-nowrap text-gray-500">{fmt.dateTime(t.createdAt)}</span> },
    { key: 'commission', header: 'Commission (₹)', align: 'right', hideOnMobile: true, value: (t) => (t.platformCommission ?? 0) / 100, render: (t) => <span className="text-gray-500">{t.platformCommission ? fmt.rupees(t.platformCommission) : '—'}</span> },
    { key: 'amount', header: 'Amount (₹)', align: 'right', sortable: true, value: (t) => t.amount / 100, render: (t) => <span className="font-semibold text-gray-900 dark:text-white">{fmt.rupees(t.amount)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`Every payment on the platform — ${total.toLocaleString('en-IN')} matching. Click a row for the full breakdown.`}
        actions={
          <SegmentedControl
            groupId="tx-dates"
            value={datePreset}
            onChange={(v) => {
              setDatePreset(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: 'year', label: 'This year' },
            ]}
          />
        }
      />

      <DataTable
        rows={transactions}
        columns={columns}
        rowKey={(t) => t._id}
        loading={loading}
        error={error}
        onRetry={() => setReload((n) => n + 1)}
        onRowClick={setSelected}
        emptyIcon={Receipt}
        emptyMessage="No transactions match these filters."
        exportName="transactions"
        searchable
        searchPlaceholder="Search this page by name or type…"
        serverPaging={{ page, pages, total, onPage: setPage }}
        toolbar={
          <>
            <Select
              label="Type"
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
              options={[{ value: '', label: 'All types' }, ...Object.keys(TYPE_LABELS).map((k) => ({ value: k, label: TYPE_LABELS[k] }))]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: fmt.label(s) }))]}
            />
            {!loading && transactions.length > 0 && <span className="text-xs text-gray-400">Successful on this page: {fmt.rupees(pageSum)}</span>}
          </>
        }
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? typeLabel(selected.type) : ''} subtitle={selected ? fmt.dateTime(selected.createdAt) : undefined} width="max-w-md">
        {selected && (
          <div>
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-2xl font-bold tabular-nums text-gray-950 dark:text-white">{fmt.rupees(selected.amount)}</p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3.5 dark:border-white/10">
              <Party who={selected.from} label="From" />
              <ArrowRight size={16} className="shrink-0 text-gray-300" />
              <Party who={selected.to} label="To" align="right" />
            </div>
            <Row label="Gross amount" value={fmt.rupees(selected.amount)} />
            {selected.platformCommission !== undefined && <Row label="Platform commission" value={fmt.rupees(selected.platformCommission)} />}
            {selected.agencyCommission !== undefined && <Row label="Agency commission" value={fmt.rupees(selected.agencyCommission)} />}
            {selected.referralCommission !== undefined && <Row label="Referral commission" value={fmt.rupees(selected.referralCommission)} />}
            {selected.netAmount !== undefined && <Row label="Net amount" value={fmt.rupees(selected.netAmount)} />}
            <Row label="Date & time" value={fmt.dateTime(selected.createdAt)} />
            <Row
              label="Transaction ID"
              mono
              value={
                <button
                  className="inline-flex items-center gap-1 hover:text-orange-600"
                  onClick={() => {
                    navigator.clipboard?.writeText(selected._id).then(
                      () => toast.success('Transaction ID copied'),
                      () => {}
                    );
                  }}
                >
                  {selected._id} <Copy size={11} />
                </button>
              }
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Briefcase, Clock, ShieldCheck, FileEdit, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { adminApi, type AdminMilestone } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab, EmptyState } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const STATUS_TABS = [
  { key: '', label: 'All', icon: Briefcase },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'funded', label: 'Funded', icon: ShieldCheck },
  { key: 'submitted', label: 'Submitted', icon: FileEdit },
  { key: 'changes_requested', label: 'Changes Requested', icon: FileEdit },
  { key: 'disputed', label: 'Disputed', icon: ShieldAlert },
  { key: 'released', label: 'Released', icon: CheckCircle2 },
] as const;

const STATUS_TONE: Record<string, 'gray' | 'sky' | 'amber' | 'rose' | 'emerald'> = {
  pending: 'gray',
  funded: 'sky',
  submitted: 'amber',
  changes_requested: 'amber',
  disputed: 'rose',
  released: 'emerald',
};

export default function AdminMilestones() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['key']>('');
  const [milestones, setMilestones] = useState<AdminMilestone[]>([]);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    adminApi
      .listMilestones({ status: tab || undefined, page: p, limit: 40 })
      .then((data) => {
        setMilestones((prev) => (append ? [...prev, ...data.milestones] : data.milestones));
        setCountsByStatus(data.countsByStatus);
        setPage(data.page);
        setPages(data.pages);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => load(1, false), [tab]);

  const totalCount = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Milestones" description="Every campaign milestone, platform-wide — where escrowed money currently stands." />

      <TabGroup>
        {STATUS_TABS.map((t) => {
          const count = t.key === '' ? totalCount : countsByStatus[t.key] || 0;
          return (
            <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              <t.icon size={14} /> {t.label}
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/10">{count}</span>
            </Tab>
          );
        })}
      </TabGroup>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={26} className="animate-spin" />
          <p className="text-sm">Loading milestones...</p>
        </div>
      )}

      {!loading && milestones.length === 0 && (
        <EmptyState icon={Briefcase} message={`No milestones${tab ? ` with status "${tab.replace('_', ' ')}"` : ''} found.`} />
      )}

      {!loading && milestones.length > 0 && (
        <>
          <Card className="mt-6 divide-y divide-gray-100 dark:divide-white/5">
            {milestones.map((m) => (
              <div key={m._id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{m.title}</p>
                    <Badge tone={STATUS_TONE[m.status] || 'gray'}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    {m.campaign?.title || 'Campaign deleted'} · {m.campaign?.brand?.companyName || 'Unknown brand'} → {m.creator?.user?.name || 'Unknown creator'}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-white/30">{new Date(m.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                </div>
                <p className="shrink-0 text-lg font-bold text-gray-900 dark:text-white">{formatRupees(m.amount)}</p>
              </div>
            ))}
          </Card>

          {page < pages && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => load(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
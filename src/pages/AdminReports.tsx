// File: src/pages/AdminReports.tsx
import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Clock, EyeOff, Flag, Trash2, XCircle } from '@/icons';
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, Tab, TabGroup } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { reportApi, type Report, type ReportAction, type ReportList, type ReportStatus, type ReportTargetType } from '@/services/reportApi';
import { ErrorBanner, Loading, Modal, Pagination, dateTime, label } from '@/FanittStore/ui';

// Reports — things users flagged in the app (posts, comments, chats,
// communities, accounts). Apple and Google expect these to be handled
// within 24 hours, so the oldest pending report is shown first.

const TYPE_LABEL: Record<ReportTargetType, string> = {
  post: 'Feed post',
  story: 'Story',
  user: 'Account',
  community: 'Community',
  community_post: 'Community post',
  community_comment: 'Community comment',
  community_message: 'Community chat',
  message: 'Private message',
};

// What "Remove" can delete. Accounts and whole communities are handled with "Suspend".
const REMOVABLE: ReportTargetType[] = ['post', 'story', 'community_post', 'community_comment', 'community_message', 'message'];

const STATUS_TONE = { pending: 'amber', removed: 'rose', suspended: 'rose', dismissed: 'gray' } as const;

type Pending = { report: Report; action: ReportAction } | null;

export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [type, setType] = useState<ReportTargetType | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<Pending>(null);

  const load = async (p = page, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setData(await reportApi.list({ status, type, page: p }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  const goTo = (p: number) => {
    setPage(p);
    load(p);
  };

  const done = async (message: string) => {
    setConfirm(null);
    setNotice(message);
    window.dispatchEvent(new Event('fanitt-admin:changed'));
    await load(page, true);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const c = data?.counts;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Content and accounts users reported. Review every report within 24 hours — Apple and Google check this." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting for review" value={String(c?.pending ?? 0)} icon={Clock} accent="amber" index={0} />
        <StatCard label="Content removed" value={String(c?.removed ?? 0)} icon={Trash2} accent="rose" index={1} />
        <StatCard label="Accounts suspended" value={String(c?.suspended ?? 0)} icon={Ban} accent="pink" index={2} />
        <StatCard label="Dismissed" value={String(c?.dismissed ?? 0)} icon={XCircle} accent="sky" index={3} />
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="flex-1">{notice}</span>
          <button className="text-xs underline" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabGroup>
            <Tab active={status === 'pending'} onClick={() => setStatus('pending')}>
              Pending {c?.pending ? `(${c.pending})` : ''}
            </Tab>
            <Tab active={status === 'removed'} onClick={() => setStatus('removed')}>Removed</Tab>
            <Tab active={status === 'suspended'} onClick={() => setStatus('suspended')}>Suspended</Tab>
            <Tab active={status === 'dismissed'} onClick={() => setStatus('dismissed')}>Dismissed</Tab>
            <Tab active={status === 'all'} onClick={() => setStatus('all')}>All</Tab>
          </TabGroup>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportTargetType | '')}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#EC2A78] dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : !data?.items.length ? (
          <EmptyState icon={Flag} message={status === 'pending' ? 'Nothing to review. 🎉' : 'No reports here.'} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {data.items.map((r) => (
              <Row key={r._id} report={r} onAction={(action) => setConfirm({ report: r, action })} />
            ))}
          </div>
        )}

        {data && pages > 1 && <Pagination page={page} pages={pages} onPage={goTo} />}
      </Card>

      <ConfirmModal pending={confirm} onClose={() => setConfirm(null)} onDone={done} />
    </div>
  );
}

function hoursAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function Row({ report: r, onAction }: { report: Report; onAction: (a: ReportAction) => void }) {
  const owner = r.targetOwner;
  const ownerName = owner?.name || r.snapshot?.ownerName || 'Unknown';
  const age = hoursAgo(r.createdAt);
  const late = r.status === 'pending' && age >= 20;
  return (
    <div className="flex flex-col gap-4 py-5 lg:flex-row">
      {r.snapshot?.mediaUrl ? (
        <a href={r.snapshot.mediaUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={r.snapshot.mediaUrl} alt="" className="h-24 w-24 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-white/10" />
        </a>
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-white/5">
          <EyeOff className="h-6 w-6" />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet">{TYPE_LABEL[r.targetType] ?? label(r.targetType)}</Badge>
          <Badge tone="rose">{r.reasonLabel}</Badge>
          <Badge tone={STATUS_TONE[r.status]}>{label(r.status)}</Badge>
          {r.reportsOnItem > 1 && <Badge tone="orange">{r.reportsOnItem} reports on this</Badge>}
          {late && <Badge tone="rose" dot>{age}h old</Badge>}
        </div>

        {r.snapshot?.text ? (
          <p className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-white/5 dark:text-white/85">{r.snapshot.text}</p>
        ) : (
          <p className="text-sm italic text-gray-400">No text</p>
        )}

        {r.details && <p className="text-sm text-gray-600 dark:text-white/70">Reporter says: “{r.details}”</p>}

        <p className="text-xs text-gray-500 dark:text-white/55">
          By <b className="text-gray-700 dark:text-white/80">{ownerName}</b>
          {owner?.email ? ` (${owner.email})` : ''}
          {owner?.isSuspended ? ' · already suspended' : ''} · reported by {r.reporter?.name || 'a user'} · {dateTime(r.createdAt)}
        </p>
        {r.status !== 'pending' && (
          <p className="text-xs text-gray-400 dark:text-white/40">
            {label(r.status)} by {r.reviewedBy?.name || 'admin'} · {dateTime(r.reviewedAt)}
            {r.adminNote ? ` · “${r.adminNote}”` : ''}
          </p>
        )}
      </div>

      {r.status === 'pending' && (
        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <Button size="sm" variant="outline" onClick={() => onAction('dismiss')}>
            <XCircle className="h-3.5 w-3.5" /> Dismiss
          </Button>
          {REMOVABLE.includes(r.targetType) && (
            <Button size="sm" variant="danger" onClick={() => onAction('remove')}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
          {owner && !owner.isSuspended && owner.role !== 'admin' && (
            <Button size="sm" variant="dark" onClick={() => onAction('suspend')}>
              <Ban className="h-3.5 w-3.5" /> Suspend user
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const ACTION_TEXT: Record<ReportAction, { title: string; body: string; button: string }> = {
  dismiss: { title: 'Dismiss this report?', body: 'Nothing is removed. All open reports about this item are closed.', button: 'Dismiss' },
  remove: { title: 'Remove this content?', body: 'The content is deleted for everyone and all open reports about it are closed. This cannot be undone.', button: 'Remove content' },
  suspend: {
    title: 'Suspend this account?',
    body: 'The person can no longer log in, and the reported content is removed. You can unsuspend them later from All users.',
    button: 'Suspend account',
  },
};

function ConfirmModal({ pending, onClose, onDone }: { pending: Pending; onClose: () => void; onDone: (message: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNote('');
    setError('');
  }, [pending]);

  if (!pending) return null;
  const t = ACTION_TEXT[pending.action];

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await reportApi.resolve(pending.report._id, pending.action, note.trim());
      await onDone(res.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={t.title} subtitle={`${TYPE_LABEL[pending.report.targetType]} · ${pending.report.reasonLabel}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-white/70">{t.body}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Note (optional, internal)"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#EC2A78] dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={pending.action === 'dismiss' ? 'primary' : 'danger'} onClick={submit} loading={busy}>
            {t.button}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
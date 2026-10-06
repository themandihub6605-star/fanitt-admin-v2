import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Mail, RotateCcw, Trash2, UserX } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, Tab, TabGroup } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { accountDeletionApi, type DeletionList, type DeletionRequest, type DeletionTab } from '@/services/accountDeletionApi';
import { ErrorBanner, Loading, Modal, Pagination, SearchBox, dateTime, label, rupees, useDebounced } from '@/FanittStore/ui';

// Account deletions — users who tapped "Delete account". Approve to delete
// the account for good (their email is freed, so they can sign up again);
// Restore to give the account back.

type Pending = { user: DeletionRequest; action: 'approve' | 'reject' } | null;

export default function AdminAccountDeletions() {
  const [tab, setTab] = useState<DeletionTab>('pending');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeletionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<Pending>(null);

  const load = async (p = page, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setData(await accountDeletionApi.list({ status: tab, search: debounced || undefined, page: p }));
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
  }, [tab, debounced]);

  const goTo = (p: number) => {
    setPage(p);
    load(p);
  };

  const done = async (message: string) => {
    setConfirm(null);
    setNotice(message);
    await load(page, true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Account Deletions" description="Users who asked to delete their account. Approve to delete it — they can then sign up again with the same email." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Waiting for review" value={String(data?.counts.pending ?? 0)} icon={Clock} accent="amber" index={0} />
        <StatCard label="Deleted accounts" value={String(data?.counts.approved ?? 0)} icon={UserX} accent="rose" index={1} />
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabGroup>
            <Tab active={tab === 'pending'} onClick={() => setTab('pending')}>
              Pending {data?.counts.pending ? `(${data.counts.pending})` : ''}
            </Tab>
            <Tab active={tab === 'approved'} onClick={() => setTab('approved')}>
              Deleted
            </Tab>
          </TabGroup>
          <div className="sm:w-72">
            <SearchBox value={search} onChange={setSearch} placeholder="Search name, email or phone" />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : !data?.requests.length ? (
          <EmptyState icon={Trash2} message={tab === 'pending' ? 'No deletion requests right now.' : 'No deleted accounts yet.'} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {data.requests.map((u) => (
              <Row key={u._id} user={u} tab={tab} onApprove={() => setConfirm({ user: u, action: 'approve' })} onReject={() => setConfirm({ user: u, action: 'reject' })} />
            ))}
          </div>
        )}

        {data && data.pages > 1 && <Pagination page={page} pages={data.pages} onPage={goTo} />}
      </Card>

      <ConfirmModal
        pending={confirm}
        onClose={() => setConfirm(null)}
        onDone={done}
      />
    </div>
  );
}

function Row({ user, tab, onApprove, onReject }: { user: DeletionRequest; tab: DeletionTab; onApprove: () => void; onReject: () => void }) {
  const email = tab === 'approved' ? user.deletedEmail || '—' : user.email;
  const initial = (user.name || email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F4511E] to-[#EC2A78] text-sm font-black text-white">{initial}</div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-gray-900 dark:text-white">{tab === 'approved' ? 'Deleted user' : user.name}</p>
            <Badge tone="sky">{label(user.role)}</Badge>
            {user.authProvider === 'google' && <Badge tone="gray">Google</Badge>}
          </div>
          <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-white/60">
            <Mail className="h-3 w-3" /> {email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-white/40">
            {tab === 'approved'
              ? `Deleted ${dateTime(user.deletionReviewedAt)}`
              : `Requested ${user.deletionRequestedAt ? dateTime(user.deletionRequestedAt) : '—'} · Joined ${dateTime(user.createdAt)}`}
          </p>
          {user.deletionReason && <p className="mt-1 text-xs italic text-gray-600 dark:text-white/70">“{user.deletionReason}”</p>}
          {!!user.walletBalance && user.walletBalance > 0 && tab === 'pending' && (
            <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">Wallet balance: {rupees(user.walletBalance)} — ask them to withdraw first</p>
          )}
        </div>
      </div>
      {tab === 'pending' && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onReject}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </Button>
          <Button size="sm" variant="danger" onClick={onApprove}>
            <Trash2 className="h-3.5 w-3.5" /> Approve & delete
          </Button>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ pending, onClose, onDone }: { pending: Pending; onClose: () => void; onDone: (message: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNote('');
    setError('');
  }, [pending]);

  if (!pending) return null;
  const approve = pending.action === 'approve';

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = approve ? await accountDeletionApi.approve(pending.user._id, note.trim()) : await accountDeletionApi.reject(pending.user._id, note.trim());
      await onDone(res.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={approve ? 'Delete this account?' : 'Restore this account?'} subtitle={`${pending.user.name} · ${pending.user.email}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-white/70">
          {approve
            ? 'Their name, email, phone and photo are removed and they are signed out everywhere. They can create a new account with the same email or Google. This cannot be undone.'
            : 'The account becomes active again and they can log in as before.'}
        </p>
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
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={approve ? 'danger' : 'primary'} onClick={submit} disabled={busy}>
            {busy ? 'Please wait…' : approve ? 'Delete account' : 'Restore account'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
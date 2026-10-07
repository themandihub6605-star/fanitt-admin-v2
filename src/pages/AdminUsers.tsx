import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  Search,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Users2,
  UserPlus,
  CalendarDays,
  Activity,
  FileWarning,
  Hourglass,
  PenLine,
  Phone,
  Mail,
  BadgeCheck,
  X,
  CheckCircle2,
} from 'lucide-react';
import { adminUsersApi, type UserRow, type UserStats, type UserListParams } from '@/services/adminUsersApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState, StatCard } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const ROLES = ['', 'fan', 'creator', 'brand', 'agency', 'admin'];

const PROFILE_FILTERS: { value: '' | NonNullable<UserListParams['profile']>; label: string }[] = [
  { value: '', label: 'Any profile' },
  { value: 'incomplete', label: 'Incomplete profile' },
  { value: 'unverified', label: 'Not submitted' },
  { value: 'pending', label: 'Pending review' },
  { value: 'rejected', label: 'Changes requested' },
  { value: 'verified', label: 'Approved' },
];

const JOINED_FILTERS: { value: '' | NonNullable<UserListParams['joined']>; label: string }[] = [
  { value: '', label: 'Joined any time' },
  { value: 'today', label: 'Joined today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const PROFILE_ROLES = new Set(['creator', 'brand', 'agency']);

const STATUS_BADGE: Record<string, { label: string; tone: 'gray' | 'amber' | 'emerald' | 'rose' | 'sky' }> = {
  unverified: { label: 'Not submitted', tone: 'gray' },
  pending: { label: 'Pending review', tone: 'amber' },
  verified: { label: 'Approved', tone: 'emerald' },
  rejected: { label: 'Changes requested', tone: 'rose' },
};

const selectClass =
  'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(value?: string) {
  if (!value) return 'Never';
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}

type AskTarget = { kind: 'one'; user: UserRow } | { kind: 'selected'; ids: string[] } | { kind: 'allIncomplete' };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [profile, setProfile] = useState<'' | NonNullable<UserListParams['profile']>>('');
  const [joined, setJoined] = useState<'' | NonNullable<UserListParams['joined']>>('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<AskTarget | null>(null);

  const loadStats = () => {
    adminUsersApi.stats().then(setStats).catch(() => {});
  };

  const load = () => {
    setLoading(true);
    setError('');
    adminUsersApi
      .list({
        search: search.trim() || undefined,
        role: role || undefined,
        profile: profile || undefined,
        joined: joined || undefined,
        page,
        limit: 25,
      })
      .then((d) => {
        setUsers(d.users);
        setPages(d.pages);
        setTotal(d.total);
        setSelected(new Set());
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(loadStats, []);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, profile, joined, page]);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  /** Quick filter from a stat card. */
  const applyQuick = (next: { profile?: typeof profile; joined?: typeof joined; role?: string }) => {
    setProfile(next.profile ?? '');
    setJoined(next.joined ?? '');
    setRole(next.role ?? '');
    setSearch('');
    setPage(1);
  };

  const selectable = useMemo(() => users.filter((u) => PROFILE_ROLES.has(u.role) && u.profileSummary?.profileId), [users]);
  const allSelected = selectable.length > 0 && selectable.every((u) => selected.has(u._id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((u) => u._id)));

  const handleToggleSuspend = async (u: UserRow) => {
    setActingOn(u._id);
    try {
      if (u.isSuspended) {
        const updated = await adminUsersApi.reinstate(u._id);
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...updated, profileSummary: x.profileSummary } : x)));
      } else {
        const reason = window.prompt('Reason for suspension (optional):');
        if (reason === null) return;
        const updated = await adminUsersApi.suspend(u._id, reason);
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...updated, profileSummary: x.profileSummary } : x)));
      }
      loadStats();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const onAsked = (message: string, updatedUser?: UserRow) => {
    setAsk(null);
    setNotice(message);
    if (updatedUser) {
      setUsers((prev) => prev.map((x) => (x._id === updatedUser._id ? { ...x, ...updatedUser } : x)));
    } else {
      load();
    }
    loadStats();
  };

  const statCards = stats
    ? [
        { label: 'Total users', value: stats.total, icon: Users2, accent: 'orange' as const, onClick: () => applyQuick({}) },
        { label: 'New today', value: stats.newToday, icon: UserPlus, accent: 'emerald' as const, onClick: () => applyQuick({ joined: 'today' }) },
        { label: 'New in 7 days', value: stats.new7d, icon: CalendarDays, accent: 'sky' as const, onClick: () => applyQuick({ joined: '7d' }) },
        { label: 'Active today', value: stats.activeToday, icon: Activity, accent: 'pink' as const },
        { label: 'Incomplete profiles', value: stats.incompleteProfiles, icon: FileWarning, accent: 'rose' as const, onClick: () => applyQuick({ profile: 'incomplete' }) },
        { label: 'Pending review', value: stats.pendingReview, icon: Hourglass, accent: 'amber' as const, onClick: () => applyQuick({ profile: 'pending' }) },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Users"
        description={`Every account on the platform — ${total.toLocaleString('en-IN')} matching. Click a row for full details.`}
      />

      {/* Numbers */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {statCards.map((c, i) => (
              <div key={c.label} onClick={c.onClick} className={cn(c.onClick && 'cursor-pointer')}>
                <StatCard label={c.label} value={c.value.toLocaleString('en-IN')} icon={c.icon} accent={c.accent} index={i} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(['fan', 'creator', 'brand', 'agency', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => applyQuick({ role: r })}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold capitalize text-gray-600 hover:border-orange-300 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                {r === 'agency' ? 'Agencies' : `${r}s`} · {(stats.byRole[r] ?? 0).toLocaleString('en-IN')}
              </button>
            ))}
            <span className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-500 dark:bg-white/10 dark:text-white/60">
              Google {stats.google.toLocaleString('en-IN')} · Email {stats.email.toLocaleString('en-IN')}
            </span>
            <button
              onClick={() => applyQuick({ profile: 'rejected' })}
              className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
            >
              Changes requested · {stats.changesRequested.toLocaleString('en-IN')}
            </button>
            <button
              onClick={() => applyQuick({ profile: 'unverified' })}
              className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-600 dark:bg-white/10 dark:text-white/60"
            >
              Not submitted · {stats.notSubmitted.toLocaleString('en-IN')}
            </button>
            {stats.suspended > 0 && (
              <span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                Suspended · {stats.suspended.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
          <input
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20"
          />
        </div>
        <select value={role} onChange={(e) => resetPage(setRole)(e.target.value)} className={selectClass}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All roles'}
            </option>
          ))}
        </select>
        <select value={profile} onChange={(e) => resetPage(setProfile)(e.target.value as typeof profile)} className={selectClass}>
          {PROFILE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select value={joined} onChange={(e) => resetPage(setJoined)(e.target.value as typeof joined)} className={selectClass}>
          {JOINED_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {(selected.size > 0 || (profile === 'incomplete' && total > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm dark:border-orange-500/30 dark:bg-orange-500/10"
          >
            <PenLine size={16} className="text-orange-600 dark:text-orange-300" />
            <span className="flex-1 font-semibold text-orange-900 dark:text-orange-100">
              {selected.size > 0
                ? `${selected.size} selected — ask them to update their profile?`
                : `${total.toLocaleString('en-IN')} users with an incomplete profile${role ? ` (${role}s)` : ''}.`}
            </span>
            {selected.size > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => setAsk({ kind: 'selected', ids: [...selected] })}>
                  Ask {selected.size} to update
                </Button>
              </>
            )}
            {selected.size === 0 && profile === 'incomplete' && (
              <Button size="sm" onClick={() => setAsk({ kind: 'allIncomplete' })}>
                Ask all {total.toLocaleString('en-IN')} to update
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {notice && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" /> <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Users2} message="No users found." />
        </div>
      ) : (
        <>
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-400 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/40">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        disabled={selectable.length === 0}
                        onChange={toggleAll}
                        className="h-4 w-4 accent-orange-500"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Profile</th>
                    <th className="px-4 py-3 font-semibold">Joined · Active</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {users.map((u, i) => {
                    const ps = u.profileSummary;
                    const canAsk = PROFILE_ROLES.has(u.role) && Boolean(ps?.profileId);
                    const badge = ps ? STATUS_BADGE[ps.status] ?? STATUS_BADGE.unverified : null;
                    return (
                      <motion.tr
                        key={u._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: Math.min(i, 20) * 0.02 }}
                        className={cn('align-top transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]', selected.has(u._id) && 'bg-orange-50/60 dark:bg-orange-500/5')}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(u._id)}
                            disabled={!canAsk}
                            onChange={() => toggleOne(u._id)}
                            className="h-4 w-4 accent-orange-500 disabled:opacity-30"
                            aria-label={`Select ${u.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/users/${u._id}`} className="flex items-center gap-2.5">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-[11px] font-bold text-white">
                                {u.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-gray-900 dark:text-white">{u.name}</span>
                              <span className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-white/50">
                                <Mail size={11} className="shrink-0" />
                                {u.email}
                                {u.isEmailVerified && <BadgeCheck size={12} className="shrink-0 text-emerald-500" aria-label="Email verified" />}
                              </span>
                              <span className="text-[11px] text-gray-400 dark:text-white/35">{u.authProvider === 'google' ? 'Google sign-up' : 'Email sign-up'}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-white/70">
                          {u.phone ? (
                            <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 hover:text-orange-600">
                              <Phone size={12} /> {u.phone}
                            </a>
                          ) : (
                            <span className="text-gray-300 dark:text-white/25">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600 dark:text-white/70">{u.role}</td>
                        <td className="min-w-[180px] px-4 py-3">
                          {ps && badge ? (
                            <div className="space-y-1.5">
                              <Badge tone={badge.tone}>{badge.label}</Badge>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                                  <div
                                    className={cn('h-full rounded-full', ps.percent === 100 ? 'bg-emerald-500' : ps.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
                                    style={{ width: `${ps.percent}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-500 dark:text-white/50">{ps.percent}%</span>
                              </div>
                              {ps.missing.length > 0 && (
                                <p className="max-w-[220px] text-[11px] leading-snug text-rose-500 dark:text-rose-300" title={ps.missing.join(', ')}>
                                  Missing: {ps.missing.slice(0, 3).join(', ')}
                                  {ps.missing.length > 3 ? ` +${ps.missing.length - 3}` : ''}
                                </p>
                              )}
                              {ps.status === 'rejected' && ps.rejectionReason && (
                                <p className="max-w-[220px] truncate text-[11px] text-gray-400 dark:text-white/40" title={ps.rejectionReason}>
                                  Note: {ps.rejectionReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-white/35">No profile review</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="block text-gray-700 dark:text-white/75">{formatDate(u.createdAt)}</span>
                          <span className="block text-[11px] text-gray-400 dark:text-white/40">Active {timeAgo(u.lastLoginAt).toLowerCase()}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.deletionStatus === 'pending' ? (
                            <Badge tone="amber">Deleting</Badge>
                          ) : (
                            <Badge tone={u.isSuspended ? 'rose' : 'emerald'}>{u.isSuspended ? 'Suspended' : 'Active'}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-stretch gap-1.5 whitespace-nowrap">
                            {canAsk && (
                              <Button size="sm" variant="outline" onClick={() => setAsk({ kind: 'one', user: u })} disabled={actingOn === u._id}>
                                <PenLine size={12} /> Ask update
                              </Button>
                            )}
                            <Button size="sm" variant={u.isSuspended ? 'outline' : 'danger'} onClick={() => handleToggleSuspend(u)} disabled={actingOn === u._id}>
                              {actingOn === u._id ? <Loader2 size={12} className="animate-spin" /> : u.isSuspended ? <RotateCcw size={12} /> : <Ban size={12} />}
                              {u.isSuspended ? 'Reinstate' : 'Suspend'}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
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

      <AnimatePresence>{ask && <AskUpdateModal target={ask} role={role} total={total} onClose={() => setAsk(null)} onDone={onAsked} />}</AnimatePresence>
    </div>
  );
}

/** Confirms "ask to update profile" and lets the admin write the note the user sees. */
function AskUpdateModal({
  target,
  role,
  total,
  onClose,
  onDone,
}: {
  target: AskTarget;
  role: string;
  total: number;
  onClose: () => void;
  onDone: (message: string, updatedUser?: UserRow) => void;
}) {
  const single = target.kind === 'one' ? target.user : null;
  const count = target.kind === 'one' ? 1 : target.kind === 'selected' ? target.ids.length : total;
  const autoNote = single?.profileSummary?.missing.length
    ? `Please complete your profile: ${single.profileSummary.missing.join(', ')}.`
    : '';
  const [note, setNote] = useState(autoNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (target.kind === 'one') {
        const updated = await adminUsersApi.requestUpdate(target.user._id, note.trim() || undefined);
        onDone(`${target.user.name} has been asked to update their profile.`, updated);
      } else {
        const res = await adminUsersApi.requestUpdateBulk(
          target.kind === 'selected'
            ? { userIds: target.ids, note: note.trim() || undefined }
            : { allIncomplete: true, role: role || undefined, note: note.trim() || undefined }
        );
        onDone(`${res.updated.toLocaleString('en-IN')} users asked to update their profile${res.skipped ? ` (${res.skipped} skipped — no profile yet)` : ''}.`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={busy ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#16161d]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
              {single ? `Ask ${single.name} to update` : `Ask ${count.toLocaleString('en-IN')} users to update`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
              Their profile moves to <b>Changes requested</b>. The app shows your note and locks the dashboard until they update their details and
              submit again — then it comes back to you for approval. They also get a notification and an email.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white/50">Note shown to the user</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder={single ? 'e.g. Please add your phone number and a clear profile photo.' : 'Leave empty to list each user’s own missing fields.'}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {!single && <p className="mt-1 text-xs text-gray-400 dark:text-white/40">Empty note → each user sees exactly which fields they are missing.</p>}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
            {single ? 'Send request' : `Send to ${count.toLocaleString('en-IN')}`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
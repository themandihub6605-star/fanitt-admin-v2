import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Link2,
  Loader2,
  Megaphone,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  TestTube2,
  Users2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  notificationAdminApi,
  EMPTY_FILTERS,
  type AudienceFilters,
  type AudiencePlan,
  type AudienceRole,
  type Broadcast,
  type BroadcastStatus,
} from '@/services/notificationAdminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const ROLE_OPTIONS: { value: AudienceRole; label: string }[] = [
  { value: 'creator', label: 'Creators' },
  { value: 'brand', label: 'Brands' },
  { value: 'agency', label: 'Agencies' },
  { value: 'fan', label: 'Fans' },
];

const PLAN_ROLES: AudienceRole[] = ['creator', 'brand'];
const PROFILE_ROLES: AudienceRole[] = ['creator', 'brand', 'agency'];

const PLAN_OPTIONS: { value: AudienceFilters['plan']; label: string }[] = [
  { value: 'any', label: 'Any plan' },
  { value: 'free', label: 'Free plan (not subscribed)' },
  { value: 'paid', label: 'Paid plan' },
  { value: 'expiring', label: 'Paid, ending in 7 days' },
  { value: 'plans', label: 'Specific plans' },
];

const VERIFICATION_OPTIONS: { value: AudienceFilters['verification']; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Not verified' },
  { value: 'pending', label: 'Pending review' },
  { value: 'rejected', label: 'Rejected' },
];

const YES_NO_OPTIONS = (yes: string, no: string): { value: AudienceFilters['onboarded']; label: string }[] => [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: yes },
  { value: 'no', label: no },
];

/** Login activity is one choice that maps to loginWithinDays / inactiveDays. */
const ACTIVITY_OPTIONS = [
  { key: 'any', label: 'Any', login: null, inactive: null },
  { key: 'a7', label: 'Logged in last 7 days', login: 7, inactive: null },
  { key: 'a30', label: 'Logged in last 30 days', login: 30, inactive: null },
  { key: 'i30', label: 'Not seen 30+ days', login: null, inactive: 30 },
  { key: 'i90', label: 'Not seen 90+ days', login: null, inactive: 90 },
] as const;

const JOINED_OPTIONS = [
  { value: null, label: 'Any time' },
  { value: 1, label: 'Last 24 hours' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
] as const;

/** One-tap audiences for the most common campaigns. */
const PRESETS: { label: string; roles: AudienceRole[]; filters: Partial<AudienceFilters> }[] = [
  { label: 'Creators on free plan', roles: ['creator'], filters: { plan: 'free' } },
  { label: 'Brands on free plan', roles: ['brand'], filters: { plan: 'free' } },
  { label: 'Paid users', roles: [], filters: { plan: 'paid' } },
  { label: 'Plan ending soon', roles: [], filters: { plan: 'expiring' } },
  { label: 'Not verified yet', roles: ['creator', 'brand'], filters: { verification: 'unverified' } },
  { label: "Didn't finish signup", roles: [], filters: { onboarded: 'no' } },
  { label: 'New this week', roles: [], filters: { joinedWithinDays: 7 } },
  { label: 'Not seen in 30 days', roles: [], filters: { inactiveDays: 30 } },
];

function withDefaults(f?: Partial<AudienceFilters> | null): AudienceFilters {
  return { ...EMPTY_FILTERS, ...(f || {}), planIds: (f?.planIds || []).map(String) };
}

function activeFilterCount(f: AudienceFilters) {
  return [
    f.plan !== 'any',
    f.verification !== 'any',
    f.onboarded !== 'any',
    f.emailVerified !== 'any',
    !!(f.loginWithinDays || f.inactiveDays),
    !!f.joinedWithinDays,
    f.appOnly,
  ].filter(Boolean).length;
}

function rupees(paise: number) {
  return paise > 0 ? `₹${(paise / 100).toLocaleString('en-IN')}` : 'Free';
}

/** Short plain-English description of the filters, e.g. "free plan · verified · new in 7 days". */
function describeFilters(f: AudienceFilters, plans: AudiencePlan[]) {
  const parts: string[] = [];
  if (f.plan === 'free') parts.push('free plan');
  if (f.plan === 'paid') parts.push('paid plan');
  if (f.plan === 'expiring') parts.push('paid plan ending in 7 days');
  if (f.plan === 'plans') {
    const names = plans.filter((p) => f.planIds.includes(p._id)).map((p) => `${p.appliesTo} ${p.name}`);
    parts.push(names.length ? `plan: ${names.join(', ')}` : `${f.planIds.length} plan(s)`);
  }
  if (f.verification !== 'any') parts.push(VERIFICATION_OPTIONS.find((o) => o.value === f.verification)!.label.toLowerCase());
  if (f.onboarded === 'yes') parts.push('finished signup');
  if (f.onboarded === 'no') parts.push("didn't finish signup");
  if (f.emailVerified === 'yes') parts.push('email verified');
  if (f.emailVerified === 'no') parts.push('email not verified');
  if (f.loginWithinDays) parts.push(`logged in last ${f.loginWithinDays} days`);
  if (f.inactiveDays) parts.push(`not seen ${f.inactiveDays}+ days`);
  if (f.joinedWithinDays) parts.push(f.joinedWithinDays === 1 ? 'joined today' : `joined last ${f.joinedWithinDays} days`);
  if (f.appOnly) parts.push('app users');
  return parts.join(' · ');
}

/** Roles that actually get the notification once filters are applied. */
function effectiveRoles(roles: AudienceRole[], f: AudienceFilters, plans: AudiencePlan[]): AudienceRole[] {
  let list: AudienceRole[] = roles.length ? roles : ROLE_OPTIONS.map((r) => r.value);
  if (f.plan !== 'any') list = list.filter((r) => PLAN_ROLES.includes(r));
  if (f.plan === 'plans') list = list.filter((r) => plans.some((p) => f.planIds.includes(p._id) && p.appliesTo === r));
  if (f.verification !== 'any') list = list.filter((r) => PROFILE_ROLES.includes(r));
  return list;
}

function OptionChips<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
            value === o.value
              ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-white/10 dark:text-white/60'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[130px_1fr] sm:items-start">
      <span className="pt-1 text-xs font-bold text-gray-700 dark:text-white/80">{label}</span>
      <div>
        {children}
        {hint && <p className="mt-1 text-[11px] text-gray-400 dark:text-white/40">{hint}</p>}
      </div>
    </div>
  );
}

const LINK_PRESETS = [
  { label: 'Communities', value: '/communities' },
  { label: 'Campaigns', value: '/campaigns' },
  { label: 'Pricing', value: '/pricing' },
  { label: 'Feed', value: '/feed' },
];

const STATUS_TONE: Record<BroadcastStatus, 'sky' | 'amber' | 'emerald' | 'rose' | 'gray'> = {
  scheduled: 'sky',
  sending: 'amber',
  sent: 'emerald',
  failed: 'rose',
  cancelled: 'gray',
};

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

/** yyyy-MM-ddTHH:mm in the admin's local time, for <input type="datetime-local">. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'any moment';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}

export default function AdminBroadcast() {
  // --- Composer ---
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState<AudienceRole[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [plans, setPlans] = useState<AudiencePlan[]>([]);
  const [byRole, setByRole] = useState<Partial<Record<AudienceRole, number>>>({});
  const [audience, setAudience] = useState<number | null>(null);
  const [countingAudience, setCountingAudience] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // --- History ---
  const [tab, setTab] = useState<'all' | BroadcastStatus>('all');
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<{ id: string; value: string } | null>(null);

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : imageUrl.trim() || ''), [image, imageUrl]);
  useEffect(() => () => {
    if (image && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [image, imagePreview]);

  // Plans for the "Specific plans" filter
  useEffect(() => {
    notificationAdminApi
      .plans()
      .then((list) => setPlans(list.filter((p) => p.appliesTo === 'creator' || p.appliesTo === 'brand')))
      .catch(() => setPlans([]));
  }, []);

  // Live audience count
  useEffect(() => {
    if (testMode && !testEmail.includes('@')) {
      setAudience(null);
      setByRole({});
      return;
    }
    const handle = window.setTimeout(() => {
      setCountingAudience(true);
      notificationAdminApi
        .audience(testMode ? [] : roles, filters, testMode ? testEmail.trim() : undefined)
        .then((res) => {
          setAudience(res.count);
          setByRole(res.byRole);
        })
        .catch(() => {
          setAudience(null);
          setByRole({});
        })
        .finally(() => setCountingAudience(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [roles, filters, testMode, testEmail]);

  const loadHistory = (quiet = false) => {
    if (!quiet) setHistoryLoading(true);
    notificationAdminApi
      .list({ status: tab === 'all' ? undefined : tab })
      .then((res) => setHistory(res.broadcasts))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Keep refreshing while something is being delivered, so the stats fill in.
  const anySending = history.some((b) => b.status === 'sending');
  useEffect(() => {
    if (!anySending) return;
    const id = window.setInterval(() => loadHistory(true), 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anySending, tab]);

  const toggleRole = (role: AudienceRole) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const setFilter = <K extends keyof AudienceFilters>(key: K, value: AudienceFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const togglePlan = (id: string) =>
    setFilters((prev) => ({
      ...prev,
      planIds: prev.planIds.includes(id) ? prev.planIds.filter((x) => x !== id) : [...prev.planIds, id],
    }));

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setTestMode(false);
    setRoles(p.roles);
    setFilters({ ...EMPTY_FILTERS, ...p.filters });
    setShowFilters(true);
  };

  const filterCount = activeFilterCount(filters);
  const filterText = describeFilters(filters, plans);
  const finalRoles = effectiveRoles(roles, filters, plans);
  const droppedRoles = (roles.length ? roles : ROLE_OPTIONS.map((r) => r.value)).filter((r) => !finalRoles.includes(r));
  const showPlanFilter = roles.length === 0 || roles.some((r) => PLAN_ROLES.includes(r));
  const showVerification = roles.length === 0 || roles.some((r) => PROFILE_ROLES.includes(r));
  const visiblePlans = plans.filter((p) => (roles.length ? roles.includes(p.appliesTo) : true));
  const activityKey =
    ACTIVITY_OPTIONS.find((o) => o.login === filters.loginWithinDays && o.inactive === filters.inactiveDays)?.key ?? 'any';

  const rolesText =
    roles.length === 0 && filterCount === 0
      ? 'Everyone'
      : ROLE_OPTIONS.filter((r) => finalRoles.includes(r.value)).map((r) => r.label).join(', ') || 'Nobody';
  const audienceLabel = testMode
    ? testEmail.trim() || 'one test account'
    : filterText
      ? `${rolesText} · ${filterText}`
      : rolesText;

  const resetComposer = () => {
    setTitle('');
    setMessage('');
    setLink('');
    setImage(null);
    setImageUrl('');
    setScheduleMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim() || !message.trim()) {
      setError('Add a title and a message.');
      return;
    }
    if (testMode && !testEmail.includes('@')) {
      setError('Enter the email of the account to send the test to.');
      return;
    }
    let scheduleIso: string | null = null;
    if (scheduleMode) {
      const when = new Date(scheduledAt);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 1000) {
        setError('Pick a time at least a minute from now.');
        return;
      }
      scheduleIso = when.toISOString();
    }

    const count = audience ?? 0;
    const confirmText = scheduleMode
      ? `Schedule this notification for ${audienceLabel} (${count} users) on ${formatDateTime(scheduleIso)}?`
      : `Send this notification now to ${audienceLabel} (${count} users)? This can't be undone.`;
    if (!window.confirm(confirmText)) return;

    setSending(true);
    try {
      const res = await notificationAdminApi.send({
        title: title.trim(),
        message: message.trim(),
        roles: testMode ? [] : roles,
        filters: testMode ? undefined : filters,
        testEmail: testMode ? testEmail.trim() : undefined,
        link: link.trim() || undefined,
        image,
        imageUrl: image ? undefined : imageUrl.trim() || undefined,
        scheduledAt: scheduleIso,
      });
      setSuccess(
        scheduleMode
          ? `Scheduled for ${formatDateTime(scheduleIso)} — ${res.data.sentTo} users.`
          : `Sending to ${res.data.sentTo} user${res.data.sentTo === 1 ? '' : 's'} — the app, website and phones.`
      );
      if (!testMode) resetComposer();
      setTab(scheduleMode ? 'scheduled' : 'all');
      loadHistory(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const duplicate = (b: Broadcast) => {
    setTitle(b.title);
    setMessage(b.message);
    setLink(b.link);
    setImage(null);
    setImageUrl(b.imageUrl);
    if (b.testEmail) {
      setTestMode(true);
      setTestEmail(b.testEmail);
    } else {
      setTestMode(false);
      setRoles(b.roles);
      const restored = withDefaults(b.filters);
      setFilters(restored);
      setShowFilters(activeFilterCount(restored) > 0);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const act = async (b: Broadcast, action: 'cancel' | 'sendNow') => {
    const text = action === 'cancel' ? 'Cancel this scheduled notification?' : 'Send this notification right now?';
    if (!window.confirm(text)) return;
    setActingOn(b._id);
    try {
      const updated = action === 'cancel' ? await notificationAdminApi.cancel(b._id) : await notificationAdminApi.sendNow(b._id);
      setHistory((prev) => prev.map((x) => (x._id === b._id ? { ...x, ...updated } : x)));
      loadHistory(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const saveReschedule = async () => {
    if (!rescheduling) return;
    const when = new Date(rescheduling.value);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 1000) {
      setError('Pick a time at least a minute from now.');
      return;
    }
    setActingOn(rescheduling.id);
    try {
      const updated = await notificationAdminApi.reschedule(rescheduling.id, when.toISOString());
      setHistory((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
      setRescheduling(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Push Notifications"
        description="Send or schedule a notification with an optional picture and link. It appears in the app and website notification lists and as a push on phones."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Composer */}
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={16} className="shrink-0" /> {success}
              </div>
            )}

            {/* Audience */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Send to</span>
                <button
                  type="button"
                  onClick={() => setTestMode((v) => !v)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
                    testMode ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5'
                  )}
                >
                  <TestTube2 size={12} /> Test on one account
                </button>
              </div>
              {testMode ? (
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email of the account to test on (e.g. your own)"
                  className={inputClasses}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRoles([])}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
                      roles.length === 0
                        ? 'border-orange-400 bg-orange-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-orange-300 dark:border-white/10 dark:text-white/70'
                    )}
                  >
                    Everyone
                  </button>
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(r.value)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
                        roles.includes(r.value)
                          ? 'border-orange-400 bg-orange-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300 dark:border-white/10 dark:text-white/70'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {!testMode && (
                <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-white">
                      <SlidersHorizontal size={13} /> Narrow down
                      {filterCount > 0 && (
                        <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{filterCount}</span>
                      )}
                    </span>
                    <span className="truncate text-[11px] text-gray-400 dark:text-white/40">
                      {filterCount ? filterText : 'Plan, verification, activity, join date…'}
                    </span>
                  </button>

                  {showFilters && (
                    <div className="space-y-3.5 border-t border-gray-200 px-3.5 py-3.5 dark:border-white/10">
                      {/* Presets */}
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
                          <Sparkles size={11} /> Quick audiences
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => applyPreset(p)}
                              className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {showPlanFilter && (
                        <FilterRow label="Subscription" hint="Only creators and brands have plans — fans and agencies are left out when this is set.">
                          <OptionChips options={PLAN_OPTIONS} value={filters.plan} onChange={(v) => setFilter('plan', v)} />
                          {filters.plan === 'plans' && (
                            <div className="mt-2 space-y-2">
                              {(['creator', 'brand'] as const)
                                .filter((r) => visiblePlans.some((p) => p.appliesTo === r))
                                .map((r) => (
                                  <div key={r}>
                                    <p className="mb-1 text-[11px] font-semibold capitalize text-gray-500 dark:text-white/50">{r} plans</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {visiblePlans
                                        .filter((p) => p.appliesTo === r)
                                        .map((p) => (
                                          <button
                                            key={p._id}
                                            type="button"
                                            onClick={() => togglePlan(p._id)}
                                            className={cn(
                                              'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                                              filters.planIds.includes(p._id)
                                                ? 'border-orange-400 bg-orange-500 text-white'
                                                : 'border-gray-200 text-gray-600 hover:border-orange-300 dark:border-white/10 dark:text-white/70',
                                              !p.isActive && 'opacity-60'
                                            )}
                                          >
                                            {p.name} · {rupees(p.price)}
                                            {p.price > 0 && p.billingCycle ? `/${p.billingCycle.replace('ly', '')}` : ''}
                                            {!p.isActive ? ' (retired)' : ''}
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                              {visiblePlans.length === 0 && <p className="text-[11px] text-gray-400">No plans found for the selected roles.</p>}
                              {filters.planIds.length === 0 && visiblePlans.length > 0 && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-300">Pick at least one plan.</p>
                              )}
                            </div>
                          )}
                        </FilterRow>
                      )}

                      {showVerification && (
                        <FilterRow label="Verification" hint="Creator, brand and agency profiles only.">
                          <OptionChips options={VERIFICATION_OPTIONS} value={filters.verification} onChange={(v) => setFilter('verification', v)} />
                        </FilterRow>
                      )}

                      <FilterRow label="Signup">
                        <OptionChips options={YES_NO_OPTIONS('Finished', "Didn't finish")} value={filters.onboarded} onChange={(v) => setFilter('onboarded', v)} />
                      </FilterRow>

                      <FilterRow label="Email">
                        <OptionChips options={YES_NO_OPTIONS('Verified', 'Not verified')} value={filters.emailVerified} onChange={(v) => setFilter('emailVerified', v)} />
                      </FilterRow>

                      <FilterRow label="Activity" hint="Based on the last time they logged in.">
                        <OptionChips
                          options={ACTIVITY_OPTIONS.map((o) => ({ value: o.key as string, label: o.label }))}
                          value={activityKey}
                          onChange={(key) => {
                            const o = ACTIVITY_OPTIONS.find((x) => x.key === key)!;
                            setFilters((prev) => ({ ...prev, loginWithinDays: o.login, inactiveDays: o.inactive }));
                          }}
                        />
                      </FilterRow>

                      <FilterRow label="Joined">
                        <OptionChips
                          options={JOINED_OPTIONS as unknown as { value: number | null; label: string }[]}
                          value={filters.joinedWithinDays}
                          onChange={(v) => setFilter('joinedWithinDays', v)}
                        />
                      </FilterRow>

                      <FilterRow label="Device">
                        <label className="flex w-fit cursor-pointer items-center gap-2 text-[11px] font-semibold text-gray-600 dark:text-white/70">
                          <input
                            type="checkbox"
                            checked={filters.appOnly}
                            onChange={(e) => setFilter('appOnly', e.target.checked)}
                            className="h-3.5 w-3.5 accent-orange-500"
                          />
                          Only people with the app and push turned on
                        </label>
                      </FilterRow>

                      {droppedRoles.length > 0 && (roles.length > 0 || filterCount > 0) && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {ROLE_OPTIONS.filter((r) => droppedRoles.includes(r.value)).map((r) => r.label).join(', ')} won't get this — these filters
                          don't apply to them.
                        </p>
                      )}

                      {filterCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(EMPTY_FILTERS)}
                          className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white"
                        >
                          <RotateCcw size={11} /> Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                <Users2 size={12} />
                {countingAudience ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : audience === null ? (
                  '—'
                ) : (
                  <b className="text-gray-800 dark:text-white">{audience.toLocaleString('en-IN')}</b>
                )}{' '}
                {testMode ? 'account' : 'users'} will get this ({audienceLabel})
              </p>
              {!testMode && !countingAudience && audience !== null && audience > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROLE_OPTIONS.filter((r) => (byRole[r.value] ?? 0) > 0).map((r) => (
                    <span key={r.value} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-white/5 dark:text-white/60">
                      {r.label} {(byRole[r.value] ?? 0).toLocaleString('en-IN')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white">
                Title <span className="text-xs font-normal text-gray-400">{title.length}/100</span>
              </span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="e.g. New brand campaigns are live 🎉" className={inputClasses} />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-sm font-bold text-gray-900 dark:text-white">
                Message <span className="text-xs font-normal text-gray-400">{message.length}/500</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Write what you want users to know…"
                className={cn(inputClasses, 'resize-none')}
              />
            </label>

            {/* Image */}
            <div>
              <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">
                Image <span className="font-normal text-gray-400">(optional — shows in the push and the notification list)</span>
              </span>
              {imagePreview ? (
                <div className="relative w-fit">
                  <img src={imagePreview} alt="" className="max-h-40 rounded-xl border border-gray-200 object-cover dark:border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImageUrl('');
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <ImagePlus size={14} /> Upload image
                  </Button>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="…or paste an image URL"
                    className={cn(inputClasses, 'min-w-[220px] flex-1 py-1.5')}
                  />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 1024 * 1024) setError('Keep the image under 1 MB so it loads fast on phones.');
                  else setImage(file);
                  e.target.value = '';
                }}
              />
              <p className="mt-1 text-[11px] text-gray-400 dark:text-white/40">Best: 2:1 landscape, e.g. 1024 × 512, under 1 MB.</p>
            </div>

            {/* Link */}
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                <Link2 size={14} /> Open on tap <span className="font-normal text-gray-400">(optional)</span>
              </span>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… or a page like /communities" className={inputClasses} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LINK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setLink(p.value)}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* When */}
            <div>
              <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">When</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleMode(false)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold',
                    !scheduleMode ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-white/60'
                  )}
                >
                  <Zap size={14} /> Send now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode(true)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold',
                    scheduleMode ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-white/60'
                  )}
                >
                  <CalendarClock size={14} /> Schedule
                </button>
              </div>
              {scheduleMode && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={toLocalInput(new Date(Date.now() + 2 * 60 * 1000))}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className={inputClasses}
                  />
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-white/40">
                    Your local time. It goes out automatically within 30 seconds of this time.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={sending || !title.trim() || !message.trim() || (!testMode && audience === 0)}
              className="w-full"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : scheduleMode ? <CalendarClock size={16} /> : <Send size={16} />}
              {scheduleMode ? 'Schedule notification' : testMode ? 'Send test' : 'Send notification'}
            </Button>
          </form>
        </Card>

        {/* Live preview */}
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
              <Smartphone size={13} /> Phone preview
            </p>
            <div className="rounded-[28px] bg-gradient-to-b from-gray-800 to-gray-900 p-3">
              <div className="rounded-2xl bg-white/95 p-3 shadow-lg dark:bg-[#23273a]">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-pink-500 text-[10px] font-black text-white">F</span>
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-white/60">Fanitt · now</span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">{title || 'Notification title'}</p>
                <p className="mt-0.5 line-clamp-3 text-xs text-gray-600 dark:text-white/70">{message || 'Your message will show here.'}</p>
                {imagePreview && <img src={imagePreview} alt="" className="mt-2 max-h-36 w-full rounded-xl object-cover" />}
              </div>
            </div>
            {link && (
              <p className="mt-3 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-white/50">
                <Link2 size={12} /> Opens {link}
              </p>
            )}
          </Card>
          <Card className="p-4 text-xs text-gray-500 dark:text-white/55">
            <p className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-white/80">
              <Bell size={13} /> Where it shows
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Push on every phone with the app installed and notifications allowed.</li>
              <li>The bell / Notifications page on the website and app.</li>
              <li>Pictures show in the push when the app is in the background.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* History */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Sent & scheduled</h2>
        <TabGroup>
          {(['all', 'scheduled', 'sent', 'failed', 'cancelled'] as const).map((t) => (
            <Tab key={t} active={tab === t} onClick={() => setTab(t)}>
              <span className="capitalize">{t === 'all' ? 'All' : t}</span>
            </Tab>
          ))}
        </TabGroup>

        {historyLoading ? (
          <div className="mt-10 flex justify-center text-gray-400 dark:text-white/40">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {history.length === 0 && <EmptyState icon={Megaphone} message="No notifications here yet." />}
            {history.map((b) => (
              <Card key={b._id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {b.imageUrl && <img src={b.imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-[220px] flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-gray-900 dark:text-white">{b.title}</p>
                      <Badge tone={STATUS_TONE[b.status]} className="capitalize">
                        {b.status === 'sending' && <Loader2 size={10} className="animate-spin" />}
                        {b.status}
                      </Badge>
                      {b.testEmail && (
                        <Badge tone="pink">
                          <TestTube2 size={10} /> Test
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-white/70">{b.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-white/45">
                      To{' '}
                      {b.testEmail ||
                        (b.roles.length ? ROLE_OPTIONS.filter((r) => b.roles.includes(r.value)).map((r) => r.label).join(', ') : 'Everyone')}
                      {!b.testEmail && describeFilters(withDefaults(b.filters), plans) ? ` · ${describeFilters(withDefaults(b.filters), plans)}` : ''}
                      {b.link ? ` · opens ${b.link}` : ''}
                      {b.createdBy?.name ? ` · by ${b.createdBy.name}` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-white/55">
                      <Clock size={11} />
                      {b.status === 'scheduled'
                        ? `Goes out ${formatDateTime(b.scheduledAt)} (${timeUntil(b.scheduledAt)})`
                        : b.sentAt
                          ? `Sent ${formatDateTime(b.sentAt)}`
                          : formatDateTime(b.scheduledAt)}
                    </p>
                    {(b.status === 'sent' || b.status === 'sending' || b.status === 'failed') && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-white/5 dark:text-white/60">{b.stats.targeted} users</span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-white/5 dark:text-white/60">{b.stats.inApp} in-app</span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {b.stats.pushSent}/{b.stats.devices} phones reached
                        </span>
                        {b.stats.pushFailed > 0 && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{b.stats.pushFailed} failed</span>
                        )}
                      </div>
                    )}
                    {b.status === 'failed' && b.error && <p className="mt-1 text-xs text-rose-500">{b.error}</p>}

                    {rescheduling?.id === b._id && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={rescheduling.value}
                          min={toLocalInput(new Date(Date.now() + 2 * 60 * 1000))}
                          onChange={(e) => setRescheduling({ id: b._id, value: e.target.value })}
                          className={cn(inputClasses, 'w-auto py-1.5')}
                        />
                        <Button size="sm" onClick={saveReschedule} disabled={actingOn === b._id}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRescheduling(null)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {b.status === 'scheduled' && (
                      <>
                        <Button size="sm" onClick={() => act(b, 'sendNow')} disabled={actingOn === b._id}>
                          <Zap size={12} /> Send now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRescheduling({ id: b._id, value: toLocalInput(new Date(b.scheduledAt)) })}
                        >
                          <CalendarClock size={12} /> Reschedule
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => act(b, 'cancel')} disabled={actingOn === b._id}>
                          <XCircle size={12} /> Cancel
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => duplicate(b)}>
                      <Copy size={12} /> Reuse
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
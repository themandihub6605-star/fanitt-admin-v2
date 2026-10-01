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
  Send,
  Smartphone,
  TestTube2,
  Users2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  notificationAdminApi,
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

  // Live audience count
  useEffect(() => {
    if (testMode && !testEmail.includes('@')) {
      setAudience(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setCountingAudience(true);
      notificationAdminApi
        .audience(testMode ? [] : roles, testMode ? testEmail.trim() : undefined)
        .then(setAudience)
        .catch(() => setAudience(null))
        .finally(() => setCountingAudience(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [roles, testMode, testEmail]);

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

  const audienceLabel = testMode
    ? testEmail.trim() || 'one test account'
    : roles.length === 0
      ? 'Everyone'
      : ROLE_OPTIONS.filter((r) => roles.includes(r.value)).map((r) => r.label).join(', ');

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

            <Button type="submit" disabled={sending || !title.trim() || !message.trim()} className="w-full">
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
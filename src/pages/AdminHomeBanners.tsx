// File: src/pages/AdminHomeBanners.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, CalendarClock, Eye, History, ImagePlus, Images, MousePointerClick, PartyPopper, Pencil, Plus, Trash2 } from '@/icons';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { homeBannerApi, type BannerAudience, type BannerInput, type BannerLinkType, type BannerPlatform, type HomeBanner } from '@/services/homeBannerApi';
import { ErrorBanner, Loading, Modal, inputClasses } from '@/FanittStore/ui';
import { cn } from '@/utils/cn';

// Home slider — banners at the top of the app home (and website if chosen).
//  • Tabs per role: see exactly which banners Creators / Brands / Fans /
//    Agencies get (banners for "Everyone" show in every role).
//  • Festival banner: while it's live, the people it's for see ONLY festival
//    banners; when its end date passes, the regular ones come back by themselves.
//  • Replacing a picture keeps the old one — put it back any time.
//  • "Delete" archives (hidden, restorable). Delete for good only from Archived.

const LINK_OPTIONS: { value: BannerLinkType; label: string; hint: string }[] = [
  { value: 'none', label: 'Nothing (just a picture)', hint: '' },
  { value: 'screen', label: 'App screen', hint: '' },
  { value: 'url', label: 'Web link', hint: 'https://…' },
  { value: 'campaign', label: 'Campaign', hint: 'Campaign ID' },
  { value: 'creator', label: 'Creator profile', hint: 'Creator username (slug), e.g. riya-sharma' },
  { value: 'brand', label: 'Brand profile', hint: 'Brand slug' },
  { value: 'community', label: 'Community', hint: 'Community slug or ID' },
  { value: 'store', label: 'Creator store', hint: 'Store slug' },
  { value: 'product', label: 'Digital product', hint: 'Product ID' },
  { value: 'live', label: 'Live stream', hint: 'Live ID' },
  { value: 'meet', label: 'Online session', hint: 'Session ID' },
];

const SCREEN_OPTIONS = [
  { value: 'plans', label: 'Plans / Upgrade' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'referrals', label: 'Refer & earn' },
  { value: 'store', label: 'My store (creators)' },
  { value: 'products', label: 'Digital products' },
  { value: 'stores', label: 'Creator stores' },
  { value: 'communities', label: 'Communities' },
  { value: 'meets', label: 'Online sessions' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'creators', label: 'Creators' },
  { value: 'brands', label: 'Brands' },
  { value: 'feed', label: 'Feed' },
  { value: 'library', label: 'My library' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'search', label: 'Search' },
  { value: 'editProfile', label: 'Edit profile' },
];

const ROLES: { value: BannerAudience; label: string; chip: string }[] = [
  { value: 'creator', label: 'Creators', chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200' },
  { value: 'brand', label: 'Brands', chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200' },
  { value: 'fan', label: 'Fans', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200' },
  { value: 'agency', label: 'Agencies', chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200' },
];
const EVERYONE_CHIP = 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/15 dark:bg-white/10 dark:text-white/80';

type Tab = 'all' | BannerAudience | 'everyone' | 'archived';

const EMPTY: BannerInput = {
  title: '',
  subtitle: '',
  ctaLabel: '',
  linkType: 'none',
  linkValue: '',
  platform: 'app',
  audience: [],
  isActive: true,
  takeover: false,
  startsAt: '',
  endsAt: '',
};

// ---------------------------------------------------------------------------
// Who sees what, right now
// ---------------------------------------------------------------------------

const rolesOf = (b: HomeBanner): BannerAudience[] => (b.audience.length ? b.audience : ROLES.map((r) => r.value));
const isFor = (b: HomeBanner, role: BannerAudience) => !b.audience.length || b.audience.includes(role);

/** On, not archived and inside its dates. */
function isLiveNow(b: HomeBanner, now = Date.now()) {
  if (!b.isActive || b.archivedAt) return false;
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
  return true;
}

/** What a role sees in the app right now (festival banners win while live). */
function showingFor(all: HomeBanner[], role: BannerAudience) {
  const live = all.filter((b) => b.platform !== 'web' && isFor(b, role) && isLiveNow(b));
  const festival = live.filter((b) => b.takeover);
  return { shown: festival.length ? festival : live, paused: festival.length ? live.filter((b) => !b.takeover) : [], festival };
}

function linkLabel(b: HomeBanner) {
  if (b.linkType === 'none') return 'No link';
  if (b.linkType === 'screen') return `Screen · ${SCREEN_OPTIONS.find((s) => s.value === b.linkValue)?.label || b.linkValue}`;
  return `${LINK_OPTIONS.find((o) => o.value === b.linkType)?.label} · ${b.linkValue}`;
}

/** ISO → value for <input type="datetime-local">. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

function state(b: HomeBanner, all: HomeBanner[]): { label: string; tone: 'emerald' | 'amber' | 'gray' | 'rose' | 'sky' } {
  if (b.archivedAt) return { label: 'Archived', tone: 'gray' };
  if (!b.isActive) return { label: 'Off', tone: 'gray' };
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'amber' };
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: 'Ended', tone: 'rose' };
  if (!b.takeover && b.platform !== 'web') {
    const pausedFor = rolesOf(b).filter((r) => showingFor(all, r).festival.length > 0);
    if (pausedFor.length === rolesOf(b).length) return { label: 'Paused · festival on', tone: 'sky' };
  }
  return { label: 'Live', tone: 'emerald' };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null);
  const [busyId, setBusyId] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const load = async () => {
    setError('');
    try {
      setBanners(await homeBannerApi.list());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current = useMemo(() => banners.filter((b) => !b.archivedAt), [banners]);
  const archived = useMemo(() => banners.filter((b) => b.archivedAt), [banners]);
  const counts: Record<Tab, number> = {
    all: current.length,
    everyone: current.filter((b) => !b.audience.length).length,
    creator: current.filter((b) => isFor(b, 'creator')).length,
    brand: current.filter((b) => isFor(b, 'brand')).length,
    fan: current.filter((b) => isFor(b, 'fan')).length,
    agency: current.filter((b) => isFor(b, 'agency')).length,
    archived: archived.length,
  };
  const list =
    tab === 'archived' ? archived : tab === 'all' ? current : tab === 'everyone' ? current.filter((b) => !b.audience.length) : current.filter((b) => isFor(b, tab));

  const replace = (saved: HomeBanner) => setBanners((all) => (all.some((x) => x._id === saved._id) ? all.map((x) => (x._id === saved._id ? saved : x)) : [...all, saved]));

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...current];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBanners([...next, ...archived]);
    try {
      setBanners(await homeBannerApi.reorder(next.map((b) => b._id)));
    } catch (err) {
      setError(getApiErrorMessage(err));
      load();
    }
  };

  const run = async (b: HomeBanner, fn: () => Promise<void>) => {
    setBusyId(b._id);
    try {
      await fn();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const toggle = (b: HomeBanner) => run(b, async () => replace(await homeBannerApi.update(b._id, { isActive: !b.isActive })));
  const archive = (b: HomeBanner) => {
    if (!window.confirm('Archive this banner? It stops showing, and you can restore it from the Archived tab.')) return;
    run(b, async () => replace(await homeBannerApi.archive(b._id)));
  };
  const restore = (b: HomeBanner) => run(b, async () => replace(await homeBannerApi.restore(b._id)));
  const deleteForever = (b: HomeBanner) => {
    if (!window.confirm('Delete this banner for good? This cannot be undone.')) return;
    run(b, async () => {
      await homeBannerApi.deleteForever(b._id);
      setBanners((all) => all.filter((x) => x._id !== b._id));
    });
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All' },
    ...ROLES.map((r) => ({ value: r.value as Tab, label: r.label })),
    { value: 'everyone', label: 'Everyone' },
    { value: 'archived', label: 'Archived' },
  ];
  const roleTab = ROLES.find((r) => r.value === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Slider"
        description="Banners at the top of the app home. Pick a role tab to see exactly what that role sees."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Add banner
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
              tab === t.value
                ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
            )}
          >
            {t.value === 'archived' && <Archive size={14} />}
            {t.label}
            <span className={cn('rounded-full px-2 py-0.5 text-[11px]', tab === t.value ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-gray-100 dark:bg-white/10')}>{counts[t.value]}</span>
          </button>
        ))}
      </div>

      {/* What this role sees right now */}
      {roleTab && <NowShowing role={roleTab.value} label={roleTab.label} banners={banners} />}

      <Card>
        {loading ? (
          <Loading />
        ) : !list.length ? (
          <EmptyState
            icon={tab === 'archived' ? Archive : Images}
            message={tab === 'archived' ? 'Nothing archived. Banners you delete land here, so you can bring them back.' : 'No banners here yet. Add one to show a slider on the app home.'}
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {list.map((b) => {
              const s = state(b, banners);
              const i = current.findIndex((x) => x._id === b._id);
              return (
                <div key={b._id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  {tab === 'all' && (
                    <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                      <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10" disabled={i <= 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10"
                        disabled={i === current.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  )}
                  <BannerPreview imageUrl={b.imageUrl} title={b.title} subtitle={b.subtitle} ctaLabel={b.ctaLabel} className="w-full sm:w-60" small />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-gray-900 dark:text-white">{b.title || 'Banner'}</p>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {b.takeover && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                          <PartyPopper size={12} /> Festival
                        </span>
                      )}
                      <Badge tone="sky">{b.platform === 'all' ? 'App + Web' : b.platform === 'app' ? 'App' : 'Web'}</Badge>
                    </div>
                    {/* Who it's for — always visible */}
                    <RoleChips audience={b.audience} />
                    {(b.startsAt || b.endsAt) && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/60">
                        <CalendarClock size={13} />
                        {b.startsAt ? shortDate(b.startsAt) : 'Now'} → {b.endsAt ? shortDate(b.endsAt) : 'No end'}
                      </p>
                    )}
                    <p className="truncate text-xs text-gray-500 dark:text-white/60">{linkLabel(b)}</p>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-600 dark:text-white/70">
                      <span className="flex items-center gap-1">
                        <Eye size={13} /> {b.views.toLocaleString('en-IN')} views
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick size={13} /> {b.clicks.toLocaleString('en-IN')} taps
                      </span>
                      {b.imageHistory.length > 0 && (
                        <span className="flex items-center gap-1">
                          <History size={13} /> {b.imageHistory.length} earlier {b.imageHistory.length === 1 ? 'picture' : 'pictures'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {b.archivedAt ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busyId === b._id} onClick={() => restore(b)}>
                          <ArchiveRestore size={14} /> Restore
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === b._id} onClick={() => deleteForever(b)} aria-label="Delete for good">
                          <Trash2 size={14} className="text-rose-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Toggle on={b.isActive} disabled={busyId === b._id} onChange={() => toggle(b)} />
                        <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                          <Pencil size={13} /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === b._id} onClick={() => archive(b)} aria-label="Archive">
                          <Archive size={14} className="text-gray-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <BannerForm
        banner={editing}
        defaultAudience={roleTab ? [roleTab.value] : []}
        onClose={() => setEditing(null)}
        onChanged={replace}
        onSaved={(saved) => {
          replace(saved);
          setEditing(null);
        }}
      />
    </div>
  );
}

/** "Creators see now": the live banners in order, plus any festival note. */
function NowShowing({ role, label, banners }: { role: BannerAudience; label: string; banners: HomeBanner[] }) {
  const { shown, paused, festival } = showingFor(banners, role);
  const ends = festival.map((b) => b.endsAt).filter(Boolean).sort()[0] ?? null;
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {label} see now <span className="font-semibold text-gray-500 dark:text-white/60">· {shown.length} in the app</span>
          </p>
          {festival.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              <PartyPopper size={13} /> Festival on till {shortDate(ends)} · {paused.length} regular {paused.length === 1 ? 'banner' : 'banners'} come back after
            </span>
          )}
        </div>
        {shown.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {shown.map((b) => (
              <BannerPreview key={b._id} imageUrl={b.imageUrl} title={b.title} subtitle="" ctaLabel="" className="w-36" small />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-white/60">No banner is live for {label.toLowerCase()} right now — the slider is hidden for them.</p>
        )}
      </div>
    </Card>
  );
}

function RoleChips({ audience }: { audience: BannerAudience[] }) {
  if (!audience.length) return <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold', EVERYONE_CHIP)}>Everyone</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLES.filter((r) => audience.includes(r.value)).map((r) => (
        <span key={r.value} className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold', r.chip)}>
          {r.label}
        </span>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', on ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/15')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/** Same look as the app: rounded picture, soft dark fade at the bottom, optional text. */
function BannerPreview({ imageUrl, title, subtitle, ctaLabel, className, small }: { imageUrl: string; title: string; subtitle: string; ctaLabel: string; className?: string; small?: boolean }) {
  return (
    <div className={cn('relative aspect-[5/4] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4511E] to-[#EC2A78]', className)}>
      {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <ImagePlus className="absolute inset-0 m-auto text-white/60" size={32} />}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      {(title || subtitle || ctaLabel) && (
        <div className={cn('absolute inset-x-0 bottom-0 space-y-1', small ? 'p-3' : 'p-4')}>
          {title && <p className={cn('font-black leading-tight text-white drop-shadow', small ? 'text-sm' : 'text-lg')}>{title}</p>}
          {subtitle && <p className={cn('leading-snug text-white/85', small ? 'line-clamp-1 text-[11px]' : 'line-clamp-2 text-xs')}>{subtitle}</p>}
          {ctaLabel && (
            <span className={cn('mt-1 inline-flex items-center rounded-full bg-white font-bold text-gray-900', small ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs')}>{ctaLabel} →</span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / edit
// ---------------------------------------------------------------------------

function BannerForm({
  banner,
  defaultAudience,
  onClose,
  onSaved,
  onChanged,
}: {
  banner: HomeBanner | 'new' | null;
  defaultAudience: BannerAudience[];
  onClose: () => void;
  onSaved: (b: HomeBanner) => void;
  onChanged: (b: HomeBanner) => void;
}) {
  const isNew = banner === 'new';
  const [form, setForm] = useState<BannerInput>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [history, setHistory] = useState<HomeBanner['imageHistory']>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setError('');
    setFile(null);
    if (!banner) return;
    if (banner === 'new') {
      // Opened from a role tab → that role is picked already.
      setForm({ ...EMPTY, audience: defaultAudience });
      setPreview('');
      setHistory([]);
    } else {
      setForm({
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        linkType: banner.linkType,
        linkValue: banner.linkValue,
        platform: banner.platform,
        audience: banner.audience,
        isActive: banner.isActive,
        takeover: banner.takeover,
        startsAt: toLocalInput(banner.startsAt),
        endsAt: toLocalInput(banner.endsAt),
      });
      setPreview(banner.imageUrl);
      setHistory(banner.imageHistory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = <K extends keyof BannerInput>(k: K, v: BannerInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const link = LINK_OPTIONS.find((o) => o.value === form.linkType)!;

  const restoreOld = async (url: string) => {
    if (!banner || banner === 'new') return;
    setBusy(true);
    setError('');
    try {
      const saved = await homeBannerApi.useOldImage(banner._id, url);
      setFile(null);
      setPreview(saved.imageUrl);
      setHistory(saved.imageHistory);
      onChanged(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    if (isNew && !file) return setError('Choose a banner image');
    if (form.linkType !== 'none' && !form.linkValue.trim()) return setError('Add where the banner should open');
    if (form.takeover && (!form.startsAt || !form.endsAt)) return setError('A festival banner needs a start and an end date');
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return setError('End must be after start');
    setBusy(true);
    try {
      const payload: BannerInput = {
        ...form,
        linkValue: form.linkType === 'none' ? '' : form.linkValue.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : '',
      };
      const saved = isNew ? await homeBannerApi.create(payload, file!) : await homeBannerApi.update((banner as HomeBanner)._id, payload, file);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={banner !== null}
      title={isNew ? 'Add banner' : 'Edit banner'}
      subtitle="Best size: 1440 × 1150 px. Top 15% sits behind the app icons and the bottom fades into the page — keep key text in the middle-left."
      onClose={onClose}
      wide
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="block w-full text-left">
            <BannerPreview imageUrl={preview} title={form.title} subtitle={form.subtitle} ctaLabel={form.ctaLabel} />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={15} /> {preview ? 'Change image' : 'Upload image'}
          </Button>
          {!isNew && file && <p className="text-xs text-gray-500 dark:text-white/50">The current picture is kept — you can put it back later.</p>}

          {/* Earlier pictures of this banner */}
          {!isNew && history.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-gray-200 p-3 dark:border-white/10">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-white/70">
                <History size={13} /> Earlier pictures
              </p>
              <div className="grid grid-cols-3 gap-2">
                {history.map((h) => (
                  <div key={h.url} className="space-y-1">
                    <img src={h.url} alt="" className="aspect-[5/4] w-full rounded-xl object-cover" />
                    <p className="truncate text-[10px] text-gray-500 dark:text-white/50">{shortDate(h.replacedAt)}</p>
                    <Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => restoreOld(h.url)}>
                      Use this
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-white/50">Text below is optional — leave it empty if your image already has text.</p>
        </div>

        <div className="space-y-4">
          {/* Who sees it — first, so it's never missed */}
          <Field label="Who sees it">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set('audience', [])}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  !form.audience.length ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-white/60'
                )}
              >
                Everyone
              </button>
              {ROLES.map((a) => {
                const on = form.audience.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => set('audience', on ? form.audience.filter((x) => x !== a.value) : [...form.audience, a.value])}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                      on ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-white/60'
                    )}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{form.audience.length ? 'Only the selected roles see it.' : 'Everyone sees it.'}</p>
          </Field>

          {/* Festival / special */}
          <div className={cn('rounded-2xl border p-3', form.takeover ? 'border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-500/10' : 'border-gray-200 dark:border-white/10')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                  <PartyPopper size={15} /> Festival / special banner
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-white/60">
                  Between the start and end dates, the roles above see only festival banners. After the end date, the regular banners come back by themselves.
                </p>
              </div>
              <Toggle on={form.takeover} onChange={() => set('takeover', !form.takeover)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={form.takeover ? 'Start' : 'Start (optional)'}>
              <input type="datetime-local" className={inputClasses} value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
            </Field>
            <Field label={form.takeover ? 'End' : 'End (optional)'}>
              <input type="datetime-local" className={inputClasses} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
            </Field>
          </div>

          <Field label="Title (optional)">
            <input className={inputClasses} maxLength={70} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. ₹32 Cr in brand collabs" />
          </Field>
          <Field label="Subtitle (optional)">
            <input className={inputClasses} maxLength={120} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="One short line" />
          </Field>
          <Field label="Button text (optional)">
            <input className={inputClasses} maxLength={24} value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="e.g. Explore now" />
          </Field>

          <Field label="On tap, open">
            <select className={inputClasses} value={form.linkType} onChange={(e) => setForm((f) => ({ ...f, linkType: e.target.value as BannerLinkType, linkValue: '' }))}>
              {LINK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {form.linkType === 'screen' && (
            <Field label="Screen">
              <select className={inputClasses} value={form.linkValue} onChange={(e) => set('linkValue', e.target.value)}>
                <option value="">Choose a screen…</option>
                {SCREEN_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.linkType !== 'none' && form.linkType !== 'screen' && (
            <Field label={link.label}>
              <input className={inputClasses} value={form.linkValue} onChange={(e) => set('linkValue', e.target.value)} placeholder={link.hint} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Show on">
              <select className={inputClasses} value={form.platform} onChange={(e) => set('platform', e.target.value as BannerPlatform)}>
                <option value="app">App</option>
                <option value="web">Website</option>
                <option value="all">App + Website</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClasses} value={form.isActive ? 'on' : 'off'} onChange={(e) => set('isActive', e.target.value === 'on')}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </Field>
          </div>

          {error && <ErrorBanner message={error} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Add banner' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-white/70">{label}</span>
      {children}
    </label>
  );
}
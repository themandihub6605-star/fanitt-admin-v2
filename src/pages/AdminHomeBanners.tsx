import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, ImagePlus, Images, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { homeBannerApi, type BannerAudience, type BannerInput, type BannerLinkType, type BannerPlatform, type HomeBanner } from '@/services/homeBannerApi';
import { ErrorBanner, Loading, Modal, inputClasses } from '@/FanittStore/ui';
import { cn } from '@/utils/cn';

// Home slider — banners at the top of the app home (and website if chosen).
// Tap opens a screen, a creator/store/product…, or a web link.

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

const AUDIENCES: { value: BannerAudience; label: string }[] = [
  { value: 'creator', label: 'Creators' },
  { value: 'brand', label: 'Brands' },
  { value: 'fan', label: 'Fans' },
  { value: 'agency', label: 'Agencies' },
];

const EMPTY: BannerInput = {
  title: '',
  subtitle: '',
  ctaLabel: '',
  linkType: 'none',
  linkValue: '',
  platform: 'app',
  audience: [],
  isActive: true,
  startsAt: '',
  endsAt: '',
};

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

function liveState(b: HomeBanner): { label: string; tone: 'emerald' | 'amber' | 'gray' | 'rose' } {
  if (!b.isActive) return { label: 'Off', tone: 'gray' };
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'amber' };
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: 'Ended', tone: 'rose' };
  return { label: 'Live', tone: 'emerald' };
}

export default function AdminHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeBanner | 'new' | null>(null);
  const [busyId, setBusyId] = useState('');

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

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...banners];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next);
    try {
      setBanners(await homeBannerApi.reorder(next.map((b) => b._id)));
    } catch (err) {
      setError(getApiErrorMessage(err));
      load();
    }
  };

  const toggle = async (b: HomeBanner) => {
    setBusyId(b._id);
    try {
      const saved = await homeBannerApi.update(b._id, { isActive: !b.isActive });
      setBanners((list) => list.map((x) => (x._id === saved._id ? saved : x)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const remove = async (b: HomeBanner) => {
    if (!window.confirm('Delete this banner?')) return;
    setBusyId(b._id);
    try {
      await homeBannerApi.remove(b._id);
      setBanners((list) => list.filter((x) => x._id !== b._id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Slider"
        description="Banners at the top of the app home. They slide automatically; a tap opens the link you choose."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Add banner
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <Card>
        {loading ? (
          <Loading />
        ) : !banners.length ? (
          <EmptyState icon={Images} message="No banners yet. Add one to show a slider on the app home." />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {banners.map((b, i) => {
              const state = liveState(b);
              return (
                <div key={b._id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                    <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10"
                      disabled={i === banners.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <BannerPreview imageUrl={b.imageUrl} title={b.title} subtitle={b.subtitle} ctaLabel={b.ctaLabel} className="w-full sm:w-64" small />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-gray-900 dark:text-white">{b.title || `Banner ${i + 1}`}</p>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      <Badge tone="sky">{b.platform === 'all' ? 'App + Web' : b.platform === 'app' ? 'App' : 'Web'}</Badge>
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-white/60">{linkLabel(b)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/60">
                      {b.audience.length ? `For: ${b.audience.map((a) => AUDIENCES.find((x) => x.value === a)?.label).join(', ')}` : 'For: everyone'}
                    </p>
                    <div className="flex gap-4 text-xs font-semibold text-gray-600 dark:text-white/70">
                      <span className="flex items-center gap-1">
                        <Eye size={13} /> {b.views.toLocaleString('en-IN')} views
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick size={13} /> {b.clicks.toLocaleString('en-IN')} taps
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Toggle on={b.isActive} disabled={busyId === b._id} onChange={() => toggle(b)} />
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                      <Pencil size={13} /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === b._id} onClick={() => remove(b)} aria-label="Delete">
                      <Trash2 size={14} className="text-rose-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <BannerForm
        banner={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setBanners((list) => (list.some((x) => x._id === saved._id) ? list.map((x) => (x._id === saved._id ? saved : x)) : [...list, saved]));
          setEditing(null);
        }}
      />
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

function BannerForm({ banner, onClose, onSaved }: { banner: HomeBanner | 'new' | null; onClose: () => void; onSaved: (b: HomeBanner) => void }) {
  const isNew = banner === 'new';
  const [form, setForm] = useState<BannerInput>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setError('');
    setFile(null);
    if (!banner) return;
    if (banner === 'new') {
      setForm(EMPTY);
      setPreview('');
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
        startsAt: toLocalInput(banner.startsAt),
        endsAt: toLocalInput(banner.endsAt),
      });
      setPreview(banner.imageUrl);
    }
  }, [banner]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = <K extends keyof BannerInput>(k: K, v: BannerInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const link = LINK_OPTIONS.find((o) => o.value === form.linkType)!;

  const submit = async () => {
    setError('');
    if (isNew && !file) return setError('Choose a banner image');
    if (form.linkType !== 'none' && !form.linkValue.trim()) return setError('Add where the banner should open');
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
    <Modal open={banner !== null} title={isNew ? 'Add banner' : 'Edit banner'} subtitle="Best size: 1440 × 1150 px. Top 15% sits behind the app icons and the bottom fades into the page — keep key text in the middle-left." onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="block w-full text-left">
            <BannerPreview imageUrl={preview} title={form.title} subtitle={form.subtitle} ctaLabel={form.ctaLabel} />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={15} /> {preview ? 'Change image' : 'Upload image'}
          </Button>
          <p className="text-xs text-gray-500 dark:text-white/50">Text below is optional — leave it empty if your image already has text.</p>
        </div>

        <div className="space-y-4">
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

          <Field label="Who sees it">
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => {
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
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{form.audience.length ? 'Only the selected roles see it.' : 'Nothing selected = everyone sees it.'}</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start (optional)">
              <input type="datetime-local" className={inputClasses} value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
            </Field>
            <Field label="End (optional)">
              <input type="datetime-local" className={inputClasses} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
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
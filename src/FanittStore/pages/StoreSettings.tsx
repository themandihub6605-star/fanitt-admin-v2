import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Save, Smartphone } from 'lucide-react';
import { Badge, Button, Card } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type StoreSettings as Settings, type ToolCard, type WebBanner } from '../api';
import { ErrorBanner, Loading, inputClasses } from '../ui';

const TOOL_LABELS: Record<ToolCard['key'], string> = {
  virtual_meet: 'Virtual Meet',
  stream_live: 'Stream Live',
  chat_calls: 'Chat & Calls',
  digital_products: 'Your Store (digital products)',
  community: 'Community',
  affiliate: 'Affiliate Store',
  fanbox: 'FanBox',
};

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', on ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/15')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
      <Check size={13} /> Saved
    </span>
  ) : null;
}

function useFlash() {
  const [on, setOn] = useState(false);
  const flash = () => {
    setOn(true);
    window.setTimeout(() => setOn(false), 1800);
  };
  return [on, flash] as const;
}

/** Picks one image file (max 3 MB) and hands it to `onFile`. */
function ImagePicker({ onFile, busy, label }: { onFile: (f: File) => void; busy: boolean; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} {label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) {
            setError('Keep images under 3 MB');
            return;
          }
          setError('');
          onFile(file);
        }}
      />
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </>
  );
}

export default function StoreSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    storeAdminApi.settings().then(setSettings).catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  return (
    <StoreLayout description="Fees, store terms, the Store Home cards in the app and the website banner.">
      <ErrorBanner message={error} onClose={() => setError('')} />
      {!settings ? (
        <Loading text="Loading settings…" />
      ) : (
        <div className="space-y-6">
          <FeesCard settings={settings} onSaved={setSettings} />
          <ToolCardsCard cards={settings.toolCards} onSaved={(toolCards) => setSettings({ ...settings, toolCards })} />
          <BannerCard banner={settings.webBanner} onSaved={(webBanner) => setSettings({ ...settings, webBanner })} />
        </div>
      )}
    </StoreLayout>
  );
}

function FeesCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const [storeFee, setStoreFee] = useState(String(settings.storeFeePercent));
  const [fanboxFee, setFanboxFee] = useState(String(settings.fanboxFeePercent));
  const [version, setVersion] = useState(settings.termsVersion);
  const [terms, setTerms] = useState(settings.termsText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, flash] = useFlash();

  const save = async () => {
    const sf = Number(storeFee);
    const ff = Number(fanboxFee);
    if (!Number.isFinite(sf) || sf < 0 || sf > 50 || !Number.isFinite(ff) || ff < 0 || ff > 50) {
      setError('Fees must be between 0 and 50%');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onSaved(await storeAdminApi.updateSettings({ storeFeePercent: sf, fanboxFeePercent: ff, termsVersion: version.trim(), termsText: terms.trim() }));
      flash();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-white">Fees & terms</h3>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">New fees apply to sales from now on. Past orders keep the fee they were charged.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-800 dark:text-white/85">Store sale fee (%)</span>
          <input type="number" min={0} max={50} step={0.5} value={storeFee} onChange={(e) => setStoreFee(e.target.value)} className={inputClasses} />
          <span className="mt-1 block text-[11px] text-gray-400">Products, live tickets and calls</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-800 dark:text-white/85">FanBox fee (%)</span>
          <input type="number" min={0} max={50} step={0.5} value={fanboxFee} onChange={(e) => setFanboxFee(e.target.value)} className={inputClasses} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-800 dark:text-white/85">Terms version</span>
          <input value={version} onChange={(e) => setVersion(e.target.value)} maxLength={20} className={inputClasses} />
          <span className="mt-1 block text-[11px] text-gray-400">Change it when you edit the terms — new stores accept the latest version</span>
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-800 dark:text-white/85">Store terms (shown to creators before activating)</span>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} className={cn(inputClasses, 'resize-y')} />
      </label>
      <ErrorBanner message={error} />
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save fees & terms
        </Button>
        <Saved show={saved} />
      </div>
    </Card>
  );
}

function ToolCardsCard({ cards, onSaved }: { cards: ToolCard[]; onSaved: (c: ToolCard[]) => void }) {
  const sorted = [...cards].sort((a, b) => a.order - b.order);
  const [error, setError] = useState('');

  const move = async (index: number, dir: -1 | 1) => {
    const other = sorted[index + dir];
    const current = sorted[index];
    if (!other) return;
    setError('');
    try {
      await storeAdminApi.updateToolCard(current.key, { order: other.order });
      onSaved(await storeAdminApi.updateToolCard(other.key, { order: current.order }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-white">Store Home cards (app)</h3>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">The seven tools creators see on Store Home. Best image: 1200 × 800, under 1 MB.</p>
      <ErrorBanner message={error} onClose={() => setError('')} />
      <div className="mt-4 space-y-3">
        {sorted.map((card, i) => (
          <ToolCardRow key={card.key} card={card} first={i === 0} last={i === sorted.length - 1} onMove={(d) => move(i, d)} onSaved={onSaved} />
        ))}
      </div>
    </Card>
  );
}

function ToolCardRow({ card, first, last, onMove, onSaved }: { card: ToolCard; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onSaved: (c: ToolCard[]) => void }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [busy, setBusy] = useState<'save' | 'image' | 'toggle' | null>(null);
  const [error, setError] = useState('');
  const [saved, flash] = useFlash();
  const dirty = title !== card.title || description !== card.description;

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
  }, [card.title, card.description]);

  const run = async (kind: 'save' | 'image' | 'toggle', fn: () => Promise<ToolCard[]>) => {
    setBusy(kind);
    setError('');
    try {
      onSaved(await fn());
      flash();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn('rounded-2xl border p-4 transition-opacity dark:border-white/10', card.enabled ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-70')}>
      <div className="flex flex-wrap gap-4">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20">
          {card.imageUrl && <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />}
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">{title || TOOL_LABELS[card.key]}</span>
        </div>
        <div className="min-w-[240px] flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gray">{TOOL_LABELS[card.key]}</Badge>
            {!card.enabled && <Badge tone="rose">Hidden in app</Badge>}
            <span className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => onMove(-1)} disabled={first} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5" aria-label="Move up">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => onMove(1)} disabled={last} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5" aria-label="Move down">
                <ArrowDown size={14} />
              </button>
              <Toggle on={card.enabled} disabled={busy !== null} onChange={(v) => run('toggle', () => storeAdminApi.updateToolCard(card.key, { enabled: v }))} />
            </span>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="Title" className={cn(inputClasses, 'py-2')} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} placeholder="Short description" className={cn(inputClasses, 'py-2')} />
          <div className="flex flex-wrap items-center gap-2">
            <ImagePicker label={card.imageUrl ? 'Change image' : 'Upload image'} busy={busy === 'image'} onFile={(f) => run('image', () => storeAdminApi.uploadToolCardImage(card.key, f))} />
            <Button size="sm" onClick={() => run('save', () => storeAdminApi.updateToolCard(card.key, { title: title.trim(), description: description.trim() }))} disabled={!dirty || busy !== null || title.trim().length < 2}>
              {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </Button>
            <Saved show={saved} />
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function BannerCard({ banner, onSaved }: { banner: WebBanner; onSaved: (b: WebBanner) => void }) {
  const [form, setForm] = useState(banner);
  const [busy, setBusy] = useState<'save' | 'image' | null>(null);
  const [error, setError] = useState('');
  const [saved, flash] = useFlash();

  useEffect(() => setForm(banner), [banner]);
  const set = <K extends keyof WebBanner>(key: K, value: WebBanner[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      onSaved(
        await storeAdminApi.updateBanner({
          enabled: form.enabled,
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          buttonText: form.buttonText.trim(),
          playStoreUrl: form.playStoreUrl.trim(),
          appDeepLink: form.appDeepLink.trim(),
        })
      );
      flash();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    setBusy('image');
    setError('');
    try {
      const updated = await storeAdminApi.uploadBannerImage(file);
      onSaved(updated);
      setForm((f) => ({ ...f, imageUrl: updated.imageUrl }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Website banner</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">Shown on the website home page. Opens the app's store if installed, otherwise Google Play.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white/80">
          <Toggle on={form.enabled} onChange={(v) => set('enabled', v)} /> {form.enabled ? 'On' : 'Off'}
        </label>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="Title" className={inputClasses} />
          <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={160} placeholder="Subtitle" className={inputClasses} />
          <input value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} maxLength={30} placeholder="Button text" className={inputClasses} />
          <input value={form.playStoreUrl} onChange={(e) => set('playStoreUrl', e.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" className={inputClasses} />
          <input value={form.appDeepLink} onChange={(e) => set('appDeepLink', e.target.value)} placeholder="App link, e.g. fanitt://store" className={inputClasses} />
          <div className="flex flex-wrap items-center gap-2">
            <ImagePicker label={form.imageUrl ? 'Change image' : 'Upload image'} busy={busy === 'image'} onFile={upload} />
            <span className="text-[11px] text-gray-400">Best: 1600 × 600 (wide), under 1 MB. Keep important text away from the edges.</span>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
            <Smartphone size={13} /> Preview
          </p>
          {/* Same layout as the website: full image (never cropped), text strip below only if filled in. */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="block h-auto w-full" />
            ) : (
              <div className="flex aspect-[16/5] items-center justify-center bg-gradient-to-br from-orange-600/60 to-pink-600/40 text-xs font-semibold text-white/80">
                Upload a banner image
              </div>
            )}
            {(form.title || form.subtitle || form.buttonText) && (
              <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {form.title && <p className="break-words text-base font-bold text-white">{form.title}</p>}
                  {form.subtitle && <p className="mt-0.5 break-words text-xs text-white/70">{form.subtitle}</p>}
                </div>
                <span className="inline-flex shrink-0 justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white">{form.buttonText || 'Get the app'}</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-400 dark:text-white/40">The whole image always shows on desktop and mobile. Leave title, subtitle and button empty if your image already has text.</p>
        </div>
      </div>

      <ErrorBanner message={error} />
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={busy !== null}>
          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save banner
        </Button>
        <Saved show={saved} />
      </div>
    </Card>
  );
}
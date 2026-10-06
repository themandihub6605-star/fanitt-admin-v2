import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Pin,
  Radio,
  RotateCcw,
  Save,
  Search,
  Store,
  Users,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { homeLayoutApi, type HomeSection, type PinItem, type SectionKey } from '@/services/homeLayoutApi';

const META: Record<SectionKey, { label: string; icon: LucideIcon; noun: string; color: string }> = {
  live: { label: 'Live now', icon: Radio, noun: 'live', color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/15' },
  creators: { label: 'Creators', icon: Users, noun: 'creator', color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/15' },
  campaigns: { label: 'Open campaigns', icon: Briefcase, noun: 'campaign', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15' },
  meets: { label: 'Virtual Meets', icon: Video, noun: 'meet', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/15' },
  brands: { label: 'Brands', icon: Building2, noun: 'brand', color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/15' },
  communities: { label: 'Communities', icon: UsersRound, noun: 'community', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/15' },
  products: { label: 'Digital products', icon: Package, noun: 'product', color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/15' },
  stores: { label: 'Creator stores', icon: Store, noun: 'store', color: 'text-pink-500 bg-pink-50 dark:bg-pink-500/15' },
};

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-orange-500/20';

function Thumb({ item, size = 36 }: { item: PinItem; size?: number }) {
  return item.imageUrl ? (
    <img src={item.imageUrl} alt="" className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 text-sm font-bold text-white" style={{ width: size, height: size }}>
      {(item.title || '?').charAt(0).toUpperCase()}
    </span>
  );
}

/** Search box that pins items to one section. */
function PinPicker({ section, onPick }: { section: HomeSection; onPick: (item: PinItem) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PinItem[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();
  const pinnedIds = useMemo(() => new Set(section.pinned.map((p) => p.id)), [section.pinned]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setBusy(true);
    timer.current = window.setTimeout(async () => {
      try {
        setResults(await homeLayoutApi.search(section.key, text));
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 350);
  }, [q, section.key]);

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Pin a ${META[section.key].noun}… (type to search)`} className={`${inputCls} pl-9`} />
      {busy && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-gray-400" />}
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1B1F2A]">
          {results.map((r) => {
            const already = pinnedIds.has(r.id);
            return (
              <button
                key={r.id}
                disabled={already}
                onClick={() => {
                  onPick(r);
                  setQ('');
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
              >
                <Thumb item={r} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{r.title}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-white/50">{r.subtitle}</span>
                </span>
                {already ? <Check size={15} className="text-emerald-500" /> : <Pin size={14} className="text-orange-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminHomeLayout() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [defaults, setDefaults] = useState<{ key: SectionKey; title: string; subtitle: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState<SectionKey | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await homeLayoutApi.get();
      setSections(data.sections);
      setDefaults(data.defaults);
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key: SectionKey, patch: Partial<HomeSection>) => {
    setSections((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    setDirty(true);
  };

  const movePin = (s: HomeSection, index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= s.pinned.length) return;
    const next = [...s.pinned];
    [next[index], next[target]] = [next[target], next[index]];
    update(s.key, { pinned: next });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await homeLayoutApi.save(sections);
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const resetTitles = () => {
    setSections((list) =>
      list.map((s) => {
        const d = defaults.find((x) => x.key === s.key);
        return d ? { ...s, title: d.title, subtitle: d.subtitle } : s;
      })
    );
    setDirty(true);
  };

  return (
    <div>
      <PageHeader
        title="App home screen"
        description="Choose which sections show on the app home, their order and names, and which items appear first in each. Changes go live when you save."
        actions={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <Check size={15} /> Saved
              </span>
            )}
            <Button variant="outline" onClick={resetTitles} disabled={loading || saving}>
              <RotateCcw size={14} /> Default names
            </Button>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {dirty && !saving && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          You have unsaved changes.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sections.map((s, i) => {
              const meta = META[s.key];
              const Icon = meta.icon;
              const isOpen = open === s.key;
              return (
                <motion.div key={s.key} layout transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
                  <Card className={`p-4 ${s.enabled ? '' : 'opacity-60'}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-white/70">{i + 1}</span>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                        <Icon size={19} />
                      </span>
                      <div className="min-w-[180px] flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{s.title || meta.label}</p>
                        <p className="text-xs text-gray-500 dark:text-white/50">
                          {meta.label}
                          {s.canPin ? ` · ${s.pinned.length} pinned` : ' · fills automatically'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10" aria-label="Move up">
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => moveSection(i, 1)}
                          disabled={i === sections.length - 1}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10"
                          aria-label="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => update(s.key, { enabled: !s.enabled })}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                            s.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50'
                          }`}
                        >
                          {s.enabled ? <Eye size={14} /> : <EyeOff size={14} />} {s.enabled ? 'Showing' : 'Hidden'}
                        </button>
                        <Button size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : s.key)}>
                          {isOpen ? 'Close' : 'Edit'}
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 dark:border-white/10 lg:grid-cols-2">
                            <div className="space-y-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">Section title</span>
                                <input value={s.title} maxLength={60} onChange={(e) => update(s.key, { title: e.target.value })} className={inputCls} />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">Small line under the title</span>
                                <input value={s.subtitle} maxLength={120} onChange={(e) => update(s.key, { subtitle: e.target.value })} className={inputCls} />
                              </label>
                            </div>

                            {s.canPin ? (
                              <div>
                                <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">
                                  Pinned first (max 20) — the rest fill in automatically after these
                                </span>
                                <PinPicker section={s} onPick={(item) => update(s.key, { pinned: [...s.pinned, item].slice(0, 20) })} />
                                <ul className="mt-3 space-y-2">
                                  {s.pinned.length === 0 && <li className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-white/10">Nothing pinned — the app shows its usual picks.</li>}
                                  {s.pinned.map((p, pi) => (
                                    <li key={p.id} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2 dark:border-white/10">
                                      <Badge tone="orange">{pi + 1}</Badge>
                                      <Thumb item={p} />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{p.title}</span>
                                        <span className="block truncate text-xs text-gray-500 dark:text-white/50">{p.subtitle}</span>
                                      </span>
                                      <button onClick={() => movePin(s, pi, -1)} disabled={pi === 0} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10" aria-label="Move up">
                                        <ArrowUp size={14} />
                                      </button>
                                      <button
                                        onClick={() => movePin(s, pi, 1)}
                                        disabled={pi === s.pinned.length - 1}
                                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10"
                                        aria-label="Move down"
                                      >
                                        <ArrowDown size={14} />
                                      </button>
                                      <button onClick={() => update(s.key, { pinned: s.pinned.filter((x) => x.id !== p.id) })} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Unpin">
                                        <X size={14} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-white/5 dark:text-white/50">
                                This section shows whoever is live right now, so there’s nothing to pin. You can still rename, move or hide it.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
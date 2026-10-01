import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { Badge, Button } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import type { ItemType, Paged } from './api';

// Shared building blocks for every Fanitt Store admin page.

// ---------- formatting ----------

export function rupees(paise: number | null | undefined) {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function compactRupees(paise: number) {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function label(value: string) {
  return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

type Tone = 'gray' | 'orange' | 'emerald' | 'amber' | 'rose' | 'sky' | 'pink';

const TONES: Record<string, Tone> = {
  active: 'emerald',
  verified: 'emerald',
  published: 'emerald',
  paid: 'emerald',
  live: 'rose',
  completed: 'emerald',
  confirmed: 'emerald',
  pending_review: 'amber',
  pending: 'amber',
  requested: 'amber',
  awaiting_payment: 'amber',
  scheduled: 'sky',
  draft: 'gray',
  not_submitted: 'gray',
  unpublished: 'gray',
  hidden: 'gray',
  ended: 'gray',
  rejected: 'rose',
  suspended: 'rose',
  removed: 'rose',
  refunded: 'pink',
  failed: 'rose',
  cancelled: 'gray',
  declined: 'gray',
  missed: 'gray',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] || 'gray'}>{status === 'live' ? '● Live' : label(status)}</Badge>;
}

export const ITEM_LABEL: Record<ItemType, string> = {
  digital_product: 'Product',
  live_stream: 'Live ticket',
  call: 'Call',
  fanbox: 'FanBox',
};

// ---------- small components ----------

export const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20';

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="mt-14 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
      <Loader2 size={26} className="animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-md">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputClasses, 'pl-11 pr-9')} />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:text-white/40" aria-label="Clear">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputClasses, 'w-auto py-2')}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-xs text-gray-400 dark:text-white/40">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} /> Prev
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, title, subtitle, onClose, children, wide }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'my-8 w-full rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#171B26]',
              wide ? 'max-w-4xl' : 'max-w-md'
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Asks for a reason (shown to the creator) before a moderation action. */
export function ReasonModal({
  open,
  title,
  hint,
  presets = [],
  confirmLabel = 'Confirm',
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  hint: string;
  presets?: string[];
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} subtitle={hint} onClose={busy ? () => undefined : onClose}>
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={500} placeholder="Reason the creator will see…" className={cn(inputClasses, 'resize-none')} />
      <ErrorBanner message={error} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={submit} disabled={busy || reason.trim().length < 5}>
          {busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ---------- data hooks ----------

/** Waits until typing pauses before returning the value. */
export function useDebounced<T>(value: T, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Loads one page of a list. Re-loads when `deps` change (filters) and resets
 * to page 1. `reload()` refreshes the current page after an action.
 */
export function usePagedList<T>(fetcher: (page: number) => Promise<Paged<T>>, deps: unknown[]) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<T>>({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const load = useCallback(async (p: number, quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const res = await fetcherRef.current(p);
      if (id === requestId.current) setData(res); // ignore stale responses
    } catch (err) {
      if (id === requestId.current) setError(getApiErrorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // Filters changed → back to page 1.
  const depsKey = JSON.stringify(deps);
  useEffect(() => {
    setPage(1);
    load(1);
  }, [depsKey, load]);

  const goTo = (p: number) => {
    setPage(p);
    load(p);
  };

  return { ...data, page, loading, error, setError, goTo, reload: () => load(page, true) };
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Notice, fmt, useDebouncedValue } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { isMissingMonitor } from '@/services/monitorApi';
import type { MiniUser, Paged } from '@/services/manageApi';
import { cn } from '@/utils/cn';

/** Server-paged list with search + filters. Reloads when `filters` change. */
export function usePaged<T, S = undefined>(fetcher: (q: Record<string, string | number | boolean | undefined>) => Promise<Paged<T, S>>, filters: Record<string, string | number | boolean | undefined>) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<T, S> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(filters);
  const lastKey = useRef(key);

  useEffect(() => {
    // New filters → back to page 1.
    const p = lastKey.current !== key ? 1 : page;
    if (p !== page) {
      lastKey.current = key;
      setPage(1);
      return;
    }
    lastKey.current = key;
    let alive = true;
    setLoading(true);
    setError('');
    fetcher({ ...filters, page: p })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setMissing(false);
      })
      .catch((err) => {
        if (!alive) return;
        if (isMissingMonitor(err)) setMissing(true);
        else setError(getApiErrorMessage(err));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, rows: data?.items ?? [], loading, error, missing, page, setPage, reload };
}

/** Search box state with debounce. */
export function useSearch(initial = '') {
  const [term, setTerm] = useState(initial);
  const debounced = useDebouncedValue(term, 350);
  return { term, setTerm, search: debounced.trim() };
}

export function MissingBackend({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Notice tone="warning" className="mb-4">
      This page needs the latest backend files: <code className="font-mono text-xs">src/monitor/manage.controller.js</code> (new) and the updated <code className="font-mono text-xs">src/monitor/monitor.routes.js</code>. Add them and restart the server.
    </Notice>
  );
}

/** Row of summary numbers above a list — one joined card with dividers. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; tone?: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'gray'; hint?: string; onClick?: () => void; active?: boolean }[] }) {
  const bar: Record<string, string> = { violet: 'bg-orange-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', sky: 'bg-sky-500', gray: 'bg-gray-400' };
  const text: Record<string, string> = { violet: 'text-orange-600 dark:text-orange-300', emerald: 'text-emerald-600 dark:text-emerald-300', amber: 'text-amber-600 dark:text-amber-300', rose: 'text-rose-600 dark:text-rose-300', sky: 'text-sky-600 dark:text-sky-300', gray: 'text-gray-500' };
  return (
    <div className="rise mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/[0.07] dark:bg-[#12161f] md:grid-cols-4">
      {items.map((it, i) => {
        const tone = it.tone || 'violet';
        const inner = (
          <>
            <p className="text-[12px] font-medium text-gray-500 dark:text-white/45">{it.label}</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums text-gray-950 dark:text-white">{it.value}</p>
            <p className={cn('mt-1.5 truncate text-[11.5px] font-medium', it.hint ? text[tone] : 'text-transparent')}>{it.hint || '·'}</p>
            {it.active && <span className={cn('absolute inset-x-0 bottom-0 h-[3px]', bar[tone])} />}
          </>
        );
        const cls = cn(
          'relative px-4 py-3.5 text-left transition-colors',
          i % 2 === 1 && 'border-l border-gray-100 dark:border-white/[0.06]',
          i >= 2 && 'border-t border-gray-100 md:border-t-0 dark:border-white/[0.06]',
          i % 4 !== 0 && 'md:border-l',
          it.active && 'bg-orange-50/50 dark:bg-orange-500/[0.06]',
          it.onClick && 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
        );
        return it.onClick ? (
          <button key={it.label} type="button" onClick={it.onClick} className={cls}>
            {inner}
          </button>
        ) : (
          <div key={it.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Avatar + name + email, linking to the user's page. */
export function UserCell({ user, sub, size = 30 }: { user: MiniUser | null | undefined; sub?: ReactNode; size?: number }) {
  if (!user) return <span className="text-gray-400">—</span>;
  return (
    <Link to={`/users/${user._id}`} onClick={(e) => e.stopPropagation()} className="group/u flex min-w-0 items-center gap-2.5">
      <Avatar name={user.name} src={user.avatarUrl} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-gray-900 group-hover/u:text-orange-600 dark:text-white dark:group-hover/u:text-orange-300">{user.name}</span>
        <span className="block truncate text-xs text-gray-400 dark:text-white/40">{sub ?? user.email ?? fmt.label(user.role || '')}</span>
      </span>
    </Link>
  );
}

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" className={i < Math.round(value) ? 'text-amber-400' : 'text-gray-200 dark:text-white/15'} fill="currentColor" aria-hidden>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

/** Chip-style filter buttons. */
export function FilterChips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number | null }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            value === o.value
              ? 'border-orange-500 bg-orange-500 text-white shadow-[0_4px_12px_-6px_rgba(255,90,31,0.8)]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60 dark:hover:text-white'
          )}
        >
          {o.label}
          {o.count !== undefined && o.count !== null && <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', value === o.value ? 'bg-white/25' : 'bg-gray-100 dark:bg-white/10')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

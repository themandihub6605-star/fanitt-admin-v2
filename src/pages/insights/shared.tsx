import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, RefreshCw } from '@/icons';
import { Avatar, Button, Card, ErrorState, Notice, SegmentedControl, Skeleton, fmt } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { isMissingMonitor } from '@/services/monitorApi';
import { cn } from '@/utils/cn';

export const DAY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
];

/** Load an insights endpoint for the chosen period. */
export function useInsight<T>(fetcher: (days: number) => Promise<T>, initialDays = 30) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetcher(days)
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
  }, [days, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { days, setDays, data, loading, error, missing, reload };
}

export function PeriodActions({ days, setDays, onReload, loading, groupId, extra }: { days: number; setDays: (d: number) => void; onReload: () => void; loading: boolean; groupId: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      <SegmentedControl groupId={groupId} value={days} onChange={setDays} options={DAY_OPTIONS} />
      <Button variant="outline" size="sm" onClick={onReload} disabled={loading} aria-label="Refresh">
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  );
}

export function InsightStatus({ missing, error, onRetry }: { missing: boolean; error: string; onRetry: () => void }) {
  if (missing)
    return (
      <Notice tone="warning">
        This page needs the latest backend files (<code className="font-mono text-xs">src/monitor/insights.controller.js</code> and the updated <code className="font-mono text-xs">monitor.routes.js</code>). Add them and restart the server.
      </Notice>
    );
  if (error)
    return (
      <Card>
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  return null;
}

export function SkeletonGrid({ cards = 4, tall = false }: { cards?: number; tall?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className={cn('rounded-xl', tall ? 'h-72' : 'h-28')} />
      ))}
    </div>
  );
}

const MEDAL = ['bg-gradient-to-br from-amber-300 to-amber-500 text-white', 'bg-gradient-to-br from-gray-200 to-gray-400 text-white', 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'];

/** Rank badge: gold / silver / bronze for the top three. */
export function Rank({ n }: { n: number }) {
  return (
    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums', MEDAL[n] ?? 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-white/50')}>
      {n === 0 ? <Crown size={12} weight="fill" /> : n + 1}
    </span>
  );
}

/** A ranked list row. */
export function RankRow({ n, name, sub, value, avatar, to, thumb }: { n: number; name: string; sub?: string; value: string; avatar?: string; to?: string; thumb?: string }) {
  const inner = (
    <>
      <Rank n={n} />
      {thumb !== undefined ? (
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/[0.06]">{thumb && <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}</span>
      ) : (
        <Avatar name={name} src={avatar} size={32} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-gray-900 dark:text-white">{name}</span>
        {sub && <span className="block truncate text-xs text-gray-400 dark:text-white/40">{sub}</span>}
      </span>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-gray-950 dark:text-white">{value}</span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-xl px-2.5 py-2';
  return to ? (
    <Link to={to} className={cn(cls, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]')}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export const roleLabel = (r?: string) => (r ? fmt.label(r) : '');

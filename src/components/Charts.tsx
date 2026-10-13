import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, fmt } from '@/components/AdminUI';
import type { LucideIcon } from '@/icons';
import type { Point } from '@/services/monitorApi';

/** Chart colours — violet first (the panel's primary). */
export const CHART_COLORS = ['#FF5A1F', '#0EA5E9', '#EC2A78', '#10B981', '#F59E0B', '#EC2A78', '#64748B', '#F43F5E'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDay = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]}`;
};
export const shortMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
export const sumPoints = (pts: Point[] | null | undefined) => (pts ? pts.reduce((n, p) => n + p.value, 0) : 0);

const axis = { fontSize: 11, fill: '#9CA3AF' };

export function ChartTip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1a1f2b]">
      {label && <p className="mb-1 font-semibold text-gray-900 dark:text-white">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-gray-600 dark:text-white/70">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{money ? fmt.rupees(p.value) : fmt.number(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Several daily series on one area chart. */
export function TrendChart({
  series,
  money,
  height = 260,
  emptyIcon,
  emptyMessage = 'Nothing in this period yet.',
  stacked,
}: {
  series: { name: string; points: Point[] | null | undefined; color?: string }[];
  money?: boolean;
  height?: number;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  stacked?: boolean;
}) {
  const usable = series.filter((s) => s.points && s.points.length);
  const rows = useMemo(() => {
    const base = usable[0]?.points ?? [];
    const maps = usable.map((s) => new Map((s.points ?? []).map((p) => [p.date, p.value])));
    return base.map((p) => Object.fromEntries([['date', shortDay(p.date)], ...usable.map((s, i) => [s.name, maps[i].get(p.date) ?? 0])]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(series.map((s) => s.points?.length ?? 0)), series]);
  const empty = !rows.length || usable.every((s) => sumPoints(s.points) === 0);
  if (empty) return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  const uid = usable.map((s) => s.name.replace(/\W/g, '')).join('');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 10, right: 12, left: money ? -4 : -18, bottom: 0 }}>
        <defs>
          {usable.map((s, i) => (
            <linearGradient key={s.name} id={`tg-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color || CHART_COLORS[i]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color || CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
        <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={money ? 56 : 40} tickFormatter={money ? (v) => fmt.rupeesCompact(v) : undefined} />
        <Tooltip content={<ChartTip money={money} />} />
        {usable.map((s, i) => (
          <Area
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stackId={stacked ? 'a' : undefined}
            stroke={s.color || CHART_COLORS[i]}
            strokeWidth={i === 0 ? 2 : 1.7}
            fill={`url(#tg-${uid}-${i})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for a ranked breakdown. */
export function BarList({ rows, money, emptyMessage = 'Nothing to show yet.' }: { rows: { label: string; value: number; sub?: string }[] | null | undefined; money?: boolean; emptyMessage?: string }) {
  if (!rows || !rows.length || rows.every((r) => !r.value)) return <p className="px-1 py-6 text-center text-sm text-gray-400 dark:text-white/40">{emptyMessage}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((n, r) => n + r.value, 0) || 1;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-gray-700 dark:text-white/80">{r.label}</span>
            <span className="shrink-0 tabular-nums text-gray-900 dark:text-white">
              <span className="font-semibold">{money ? fmt.rupees(r.value) : fmt.number(r.value)}</span>
              <span className="ml-1.5 text-xs text-gray-400">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.value / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Donut with a centre total. */
export function Donut({ rows, money, size = 180, centerLabel = 'Total' }: { rows: { label: string; value: number }[]; money?: boolean; size?: number; centerLabel?: string }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-gray-400 dark:text-white/40">Nothing to show yet.</p>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius={size * 0.32} outerRadius={size * 0.48} paddingAngle={2} strokeWidth={0}>
              {rows.map((r, i) => (
                <Cell key={r.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTip money={money} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-gray-400">{centerLabel}</span>
          <span className="text-lg font-bold tabular-nums text-gray-950 dark:text-white">{money ? fmt.rupeesCompact(total) : fmt.compact(total)}</span>
        </div>
      </div>
      <div className="min-w-[150px] space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="flex-1 truncate text-gray-600 dark:text-white/65">{r.label}</span>
            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{Math.round((r.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grouped monthly bars. */
export function MonthlyBars({ rows, keys, money }: { rows: Record<string, number | string>[]; keys: { key: string; label: string; color?: string }[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 12, left: money ? -4 : -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={money ? 56 : 40} tickFormatter={money ? (v) => fmt.rupeesCompact(v) : undefined} />
        <Tooltip content={<ChartTip money={money} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color || CHART_COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

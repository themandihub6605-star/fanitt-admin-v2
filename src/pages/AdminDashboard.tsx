import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  Users2,
  Sparkles,
  Building2,
  Video,
  Briefcase,
  Wallet,
  Percent,
  Lock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { adminApi, type AdminAnalytics } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, StatCard, Button, BalanceCard, RadialProgress, StatRow } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function formatRupeesCompact(paise: number) {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(1)}Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  return `₹${Math.round(rupees)}`;
}

const STATS = (a: AdminAnalytics) => [
  { label: 'Total Users', value: a.totalUsers.toLocaleString('en-IN'), icon: Users2, accent: 'orange' as const },
  { label: 'Creators', value: a.totalCreators.toLocaleString('en-IN'), icon: Sparkles, accent: 'pink' as const },
  { label: 'Brands', value: a.totalBrands.toLocaleString('en-IN'), icon: Building2, accent: 'sky' as const },
  { label: 'Sessions', value: a.totalSessions.toLocaleString('en-IN'), icon: Video, accent: 'pink' as const },
  { label: 'Campaigns', value: a.totalCampaigns.toLocaleString('en-IN'), icon: Briefcase, accent: 'amber' as const },
  { label: 'Total Revenue', value: formatRupeesCompact(a.totalRevenue), icon: Wallet, accent: 'emerald' as const },
  { label: 'Platform Commission', value: formatRupeesCompact(a.totalPlatformCommission), icon: Percent, accent: 'orange' as const },
  { label: 'Held in Escrow', value: formatRupeesCompact(a.totalInEscrow), icon: Lock, accent: 'rose' as const },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Small pulsing dot + "Live" label — a plain visual cue that a card is
 * wired to the 30s auto-refresh, not a static snapshot. Purely
 * cosmetic; the actual freshness comes from the polling in the
 * component below, this just makes that fact visible. */
function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

/** Custom tooltip so amounts read as ₹ instead of a raw recharts
 * number, and so it matches the panel's card styling in both themes. */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1F2433]">
      <p className="mb-0.5 font-bold text-gray-900 dark:text-white">{label}</p>
      <p className="font-semibold text-orange-600 dark:text-orange-400">{formatRupeesCompact(payload[0].value * 100)}</p>
    </div>
  );
}

/** Revenue trend, drawn as a smooth filled area (the "Balance History"
 * treatment) instead of flat bars — real monthlyRevenue values only,
 * re-rendered automatically whenever the dashboard's 30s poll brings
 * in fresh data since it's driven straight off the `data` prop.
 * With fewer than 2 months of history an area/line chart has nothing
 * to draw a line between, so it renders as a near-empty axis grid
 * with one floating dot — technically correct but reads as "broken".
 * Below 2 points we show the one real number as a plain, honest
 * headline instead of forcing a trend chart that can't exist yet. */
function RevenueTrendChart({ data }: { data: AdminAnalytics['monthlyRevenue'] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: `${MONTH_NAMES[d._id.month - 1]} '${String(d._id.year).slice(2)}`,
        value: Math.round(d.total / 100), // paise -> rupees for a readable axis
      })),
    [data]
  );

  if (chartData.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400 dark:text-white/40">No revenue recorded yet.</p>;
  }

  if (chartData.length === 1) {
    const only = chartData[0];
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{formatRupeesCompact(only.value * 100)}</p>
        <p className="text-sm font-semibold text-gray-500 dark:text-white/50">Total revenue in {only.name}</p>
        <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-white/40">
          A trend line needs at least two months of history — this chart fills in automatically once next month's numbers come in.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6A1F" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#EC2A78" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 8" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatRupeesCompact(v * 100)} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#EC2A78"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          isAnimationActive
          animationDuration={600}
          dot={false}
          activeDot={{ r: 5, fill: '#FF6A1F', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ['#FF5A1F', '#EC2A78', '#F5C42E', '#3AA6FF', '#22C55E', '#A855F7'];

/** Subscription mix, drawn as a donut (the "Expense Statistics"
 * treatment) — real activeSubscriptionsByPlan counts and percentages
 * only, computed fresh on every data refresh. */
function SubscriptionDonutChart({ data }: { data: NonNullable<AdminAnalytics['activeSubscriptionsByPlan']> }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (!data || data.length === 0 || total === 0) {
    return <p className="py-16 text-center text-sm text-gray-400 dark:text-white/40">No active paid subscriptions yet.</p>;
  }

  const chartData = data.map((d) => ({ name: d._id, value: d.count }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={3}
              isAnimationActive
              animationDuration={600}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [`${value} active (${((value / total) * 100).toFixed(0)}%)`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-900 dark:text-white">{total}</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-white/40">active subs</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:w-auto">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-600 dark:text-white/70">{d.name}</span>
            <span className="shrink-0 font-extrabold text-gray-900 dark:text-white">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback((isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    adminApi
      .getAnalytics()
      .then((d) => {
        setData(d);
        setLastUpdated(new Date());
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    // Real-time dashboard: silently refetch every 30s so every chart on
    // this page — the revenue trend area chart, the subscription donut,
    // the commission ring, the stat tiles — redraws itself against the
    // latest database numbers without a manual reload. Charts below are
    // driven entirely off `data`, so a fresh fetch is all it takes for
    // them to animate to their new values.
    intervalRef.current = setInterval(() => fetchData(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Derived, real numbers only — never fabricated. Both come straight
  // out of the analytics payload already being fetched.
  const commissionPercentOfRevenue = data && data.totalRevenue > 0 ? (data.totalPlatformCommission / data.totalRevenue) * 100 : 0;

  const monthly = data?.monthlyRevenue ?? [];
  const currentMonth = monthly[monthly.length - 1];
  const previousMonth = monthly[monthly.length - 2];
  const monthOverMonthPercent =
    currentMonth && previousMonth && previousMonth.total > 0
      ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
      : null;
  const monthOverMonthPositive = (monthOverMonthPercent ?? 0) >= 0;

  return (
    <div>
      <PageHeader
        title="Admin Overview"
        description={
          lastUpdated
            ? `Live platform numbers — last updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : 'Platform-wide numbers, live from the database.'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading analytics...</p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Hero row — wallet-style revenue card + a live revenue-trend
              area chart alongside it. */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <BalanceCard
              title="Total Platform Revenue"
              amount={formatRupees(data.totalRevenue)}
              footLeft={{ label: 'Commission earned', value: formatRupeesCompact(data.totalPlatformCommission) }}
              footRight={{ label: 'Held in escrow', value: formatRupeesCompact(data.totalInEscrow) }}
            />

            <Card className="p-5 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                    <TrendingUp size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Revenue Trend</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">Last 12 months, auto-refreshes every 30s</p>
                  </div>
                </div>
                <LiveBadge />
              </div>
              <RevenueTrendChart data={data.monthlyRevenue} />
            </Card>
          </div>

          {/* Second row — commission-health ring, month-over-month
              revenue card, and a compact snapshot of the remaining
              headline metrics. */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 p-6 dark:from-orange-500/5 dark:to-pink-500/5">
              <RadialProgress percent={commissionPercentOfRevenue} label="of revenue" />
              <p className="mt-4 text-center text-sm font-bold text-gray-900 dark:text-white">Commission Health</p>
              <p className="mt-1 text-center text-xs text-gray-400 dark:text-white/40">
                Platform commission as a share of total revenue collected
              </p>
            </Card>

            <Card
              className={cn(
                'p-6',
                monthOverMonthPositive
                  ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/5 dark:to-transparent'
                  : 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/5 dark:to-transparent'
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">This Month's Revenue</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[28px] font-extrabold text-gray-900 dark:text-white">
                  {currentMonth ? formatRupeesCompact(currentMonth.total) : '₹0'}
                </p>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    monthOverMonthPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                  }`}
                >
                  {monthOverMonthPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </span>
              </div>
              {monthOverMonthPercent !== null ? (
                <p className={`mt-2 flex items-center gap-1 text-xs font-bold ${monthOverMonthPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {monthOverMonthPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(monthOverMonthPercent).toFixed(1)}% vs last month
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-400 dark:text-white/40">Not enough history yet</p>
              )}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(6, monthOverMonthPositive ? 100 : 100 - Math.min(90, Math.abs(monthOverMonthPercent ?? 0))))}%` }}
                />
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Platform Snapshot</p>
              <p className="mb-1 text-xs text-gray-400 dark:text-white/40">Headline counts at a glance</p>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                <StatRow icon={Users2} label="Total Users" value={data.totalUsers.toLocaleString('en-IN')} accent="orange" />
                <StatRow icon={Sparkles} label="Creators" value={data.totalCreators.toLocaleString('en-IN')} accent="pink" />
                <StatRow icon={Building2} label="Brands" value={data.totalBrands.toLocaleString('en-IN')} accent="sky" />
                <StatRow icon={Briefcase} label="Campaigns" value={data.totalCampaigns.toLocaleString('en-IN')} accent="amber" />
              </div>
            </Card>
          </div>

          {/* Full metric grid + subscription donut */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {STATS(data).map((s, i) => (
              <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} index={i} />
            ))}
          </div>

          <div className="mt-5">
            <Card className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400">
                    <Layers size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Subscription Mix</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">Active paid subscriptions, by plan</p>
                  </div>
                </div>
                <LiveBadge />
              </div>
              <SubscriptionDonutChart data={data.activeSubscriptionsByPlan || []} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

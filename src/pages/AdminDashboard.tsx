import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clapperboard,
  ClipboardCheck,
  CreditCard,
  FileText,
  HeartPulse,
  History,
  Layers,
  Lock,
  Percent,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users2,
  Wallet,
} from '@/icons';
import { adminApi, type AdminAnalytics } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { monitorApi, isMissingMonitor, type Overview } from '@/services/monitorApi';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, KpiCard, Notice, CountUp, Skeleton, StatRow, fmt, toneHex, type Tone } from '@/components/AdminUI';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]}`;
};
const sumOf = (pts: { value: number }[] | null | undefined) => (pts ? pts.reduce((n, p) => n + p.value, 0) : 0);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ChartTip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1a1f2b]">
      <p className="mb-1 font-semibold text-gray-900 dark:text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-gray-600 dark:text-white/70">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{money ? fmt.rupees(p.value) : fmt.number(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const axis = { fontSize: 11, fill: '#9CA3AF' };

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function GrowthChart({ data }: { data: Overview }) {
  const rows = useMemo(() => {
    const s = data.series.signups ?? [];
    const l = data.series.logins ?? [];
    const lm = new Map(l.map((p) => [p.date, p.value]));
    return s.map((p) => ({ date: shortDay(p.date), 'Sign-ups': p.value, Logins: lm.get(p.date) ?? 0 }));
  }, [data]);
  const hasLogins = !!data.series.logins && sumOf(data.series.logins) > 0;
  if (!rows.length || rows.every((r) => r['Sign-ups'] === 0 && r.Logins === 0)) return <EmptyState icon={UserPlus} message="No sign-ups in this period yet." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="g-signups" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-logins" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
        <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<ChartTip />} />
        {hasLogins && <Area type="monotone" dataKey="Logins" stroke="#0EA5E9" strokeWidth={1.8} fill="url(#g-logins)" dot={false} />}
        <Area type="monotone" dataKey="Sign-ups" stroke="#FF5A1F" strokeWidth={2} fill="url(#g-signups)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RevenueChart({ data }: { data: Overview }) {
  const rows = useMemo(() => (data.series.revenue ?? []).map((p) => ({ date: shortDay(p.date), Revenue: p.value })), [data]);
  if (!rows.length || rows.every((r) => r.Revenue === 0)) return <EmptyState icon={Banknote} message="No payments came in during this period." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
        <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmt.rupeesCompact(v)} />
        <Tooltip content={<ChartTip money />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="Revenue" fill="#FF5A1F" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const ROLE_COLORS: Record<string, string> = { Creators: '#FF5A1F', Brands: '#0EA5E9', Fans: '#EC2A78', Agencies: '#8B5CF6' };

function UserMix({ data }: { data: Overview }) {
  const r = data.users.byRole;
  const rows = [
    { name: 'Creators', value: r.creator ?? 0 },
    { name: 'Brands', value: r.brand ?? 0 },
    { name: 'Fans', value: r.fan ?? 0 },
    { name: 'Agencies', value: r.agency ?? 0 },
  ];
  const total = rows.reduce((n, x) => n + x.value, 0);
  if (!total) return <EmptyState icon={Users2} message="No users yet." />;
  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-5 pt-2 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none">
              {rows.map((x) => (
                <Cell key={x.name} fill={ROLE_COLORS[x.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, n: string) => [`${fmt.number(v)} (${((v / total) * 100).toFixed(0)}%)`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-gray-950 dark:text-white">{fmt.compact(total)}</span>
          <span className="text-[10px] text-gray-400">accounts</span>
        </div>
      </div>
      <div className="w-full space-y-2">
        {rows.map((x) => (
          <div key={x.name} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: ROLE_COLORS[x.name] }} />
            <span className="flex-1 text-gray-600 dark:text-white/70">{x.name}</span>
            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{fmt.number(x.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-gray-400">{((x.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Long-term revenue by month + paid subscription mix (from /admin/analytics/overview). */
function LongTerm({ legacy }: { legacy: AdminAnalytics | null }) {
  if (!legacy) return null;
  const months = legacy.monthlyRevenue.map((m) => ({ name: `${MONTHS[m._id.month - 1]} ’${String(m._id.year).slice(2)}`, Revenue: m.total }));
  const subs = (legacy.activeSubscriptionsByPlan ?? []).filter((s) => s.count > 0);
  const subTotal = subs.reduce((n, s) => n + s.count, 0);
  const palette = ['#FF5A1F', '#EC2A78', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6'];
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Revenue by month" description="Successful and released payments, last 12 months (all-time view)" icon={TrendingUp} />
        <div className="p-4">
          {months.length === 0 ? (
            <EmptyState icon={Banknote} message="No revenue recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={months} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-month" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC2A78" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#EC2A78" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmt.rupeesCompact(v)} />
                <Tooltip content={<ChartTip money />} />
                <Area type="monotone" dataKey="Revenue" stroke="#EC2A78" strokeWidth={2} fill="url(#g-month)" dot={months.length < 3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader title="Paid subscriptions" description="Active paid plans right now" icon={Layers} actions={<Badge tone="gray">{fmt.number(subTotal)} active</Badge>} />
        <div className="space-y-3 p-5">
          {subs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No active paid subscriptions yet.</p>
          ) : (
            subs.map((s, i) => (
              <div key={s._id}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-gray-700 dark:text-white/75">{s._id}</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{fmt.number(s.count)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(s.count / subTotal) * 100}%`, background: palette[i % palette.length] }} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ATTENTION_ICON: Record<string, typeof BadgeCheck> = {
  verifications: BadgeCheck,
  withdrawals: Wallet,
  campaigns: ClipboardCheck,
  disputes: AlertTriangle,
  deletions: Users2,
  'store-kyc': ShoppingBag,
  reviews: FileText,
  api: HeartPulse,
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [legacy, setLegacy] = useState<AdminAnalytics | null>(null);
  const [monitorMissing, setMonitorMissing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      const [o, l] = await Promise.allSettled([monitorApi.overview(days), adminApi.getAnalytics()]);
      if (o.status === 'fulfilled') {
        setData(o.value);
        setMonitorMissing(false);
        setError('');
      } else {
        setData(null);
        setMonitorMissing(isMissingMonitor(o.reason));
        if (!isMissingMonitor(o.reason)) setError(getApiErrorMessage(o.reason));
      }
      if (l.status === 'fulfilled') setLegacy(l.value);
      setUpdatedAt(new Date());
      setLoading(false);
    },
    [days]
  );

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const d = data;
  const periodLabel = `last ${days} days`;
  const attention = (d?.attention ?? []).filter((a) => a.count > 0);

  return (
    <div>
      {/* Hero */}
      <div className="hero-dark relative mb-6 overflow-hidden rounded-xl p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
              {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
            </h1>
            <p className="mt-1 text-sm text-white/75">
              {updatedAt ? `Live numbers · updated ${updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · refreshes every minute` : 'Live numbers from the database.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-white/15 p-1 backdrop-blur">
              {[7, 30, 90].map((n) => (
                <button key={n} onClick={() => setDays(n)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', days === n ? 'bg-white text-gray-900 shadow-sm' : 'text-white/75 hover:bg-white/10')}>
                  {n} days
                </button>
              ))}
            </div>
            <button onClick={() => load()} aria-label="Refresh" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur hover:bg-white/25">
              <RefreshCw size={15} className={loading && data ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Money in', value: d ? fmt.rupeesCompact(d.money.gmv.current) : '—', sub: periodLabel },
            { label: 'Commission', value: d ? fmt.rupeesCompact(d.money.commission.current) : '—', sub: periodLabel },
            { label: 'Money in', value: d?.money.allTime ? fmt.rupeesCompact(d.money.allTime.moneyIn) : legacy ? fmt.rupeesCompact(legacy.totalRevenue) : '—', sub: 'all-time' },
            { label: 'Commission', value: d?.money.allTime ? fmt.rupeesCompact(d.money.allTime.commission) : legacy ? fmt.rupeesCompact(legacy.totalPlatformCommission) : '—', sub: 'all-time' },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/65">{x.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                <CountUp value={x.value} />
              </p>
              <p className="text-[11px] text-white/55">{x.sub}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { to: '/insights/finance', label: 'Finance center' },
            { to: '/insights/growth', label: 'Growth funnel' },
            { to: '/insights/content', label: 'Content analytics' },
            { to: '/insights/leaderboards', label: 'Leaderboards' },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
              {l.label} <ArrowRight size={12} />
            </Link>
          ))}
        </div>
      </div>

      {monitorMissing && (
        <Notice tone="warning" className="mb-5">
          The new tracking API (<code className="font-mono text-xs">/api/admin/monitor</code>) isn’t on the server yet, so only the all-time totals are shown. Deploy the backend <b>src/monitor</b> folder
          (see README) to turn on period comparisons, activity tracking and system health.
        </Notice>
      )}
      {error && !d && <Card className="mb-5"><ErrorState message={error} onRetry={() => load()} /></Card>}

      {/* Needs your action */}
      {d && (
        <div className="mb-5">
          {attention.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200">
              <CheckCircle2 size={16} /> Nothing needs your action right now — approvals, payouts, reviews and disputes are all clear.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {attention.map((a) => {
                const Icon = ATTENTION_ICON[a.key] ?? AlertTriangle;
                const tone: Tone = a.tone === 'gray' ? 'gray' : a.tone;
                return (
                  <Link
                    key={a.key}
                    to={a.href}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-gray-300 dark:border-white/[0.08] dark:bg-[#141821] dark:hover:border-white/20"
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${toneHex(tone)}14`, color: toneHex(tone) }}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold leading-tight tabular-nums text-gray-950 dark:text-white">{fmt.number(a.count)}</span>
                      <span className="block truncate text-xs text-gray-500 dark:text-white/50">
                        {a.label}
                        {a.amount ? ` · ${fmt.rupeesCompact(a.amount)}` : ''}
                      </span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {(d || loading) && !monitorMissing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard loading={!d} label={`New users · ${periodLabel}`} value={fmt.number(d?.users.new.current)} change={d && fmt.change(d.users.new.current, d.users.new.previous)} icon={UserPlus} tone="orange" spark={d?.series.signups?.map((p) => p.value)} to="/users" hint={d ? `${fmt.number(d.users.total)} accounts in total` : undefined} />
          <KpiCard
            loading={!d}
            label={`Active users · ${periodLabel}`}
            value={fmt.number(d?.users.active.period.current)}
            icon={Activity}
            tone="sky"
            hint={d ? `${fmt.number(d.users.active.day)} today · ${fmt.number(d.users.active.week)} this week${d.users.appVisitors !== null ? ` · ${fmt.number(d.users.appVisitors)} app visitors` : ''}` : undefined}
            to="/activity?tab=logins"
          />
          <KpiCard loading={!d} label={`Money in · ${periodLabel}`} value={fmt.rupeesCompact(d?.money.gmv.current)} change={d && fmt.change(d.money.gmv.current, d.money.gmv.previous)} icon={Banknote} tone="emerald" spark={d?.series.revenue?.map((p) => p.value)} to="/transactions" hint="Payments, gifts, deposits & plans" />
          <KpiCard loading={!d} label={`Platform commission · ${periodLabel}`} value={fmt.rupeesCompact(d?.money.commission.current)} change={d && fmt.change(d.money.commission.current, d.money.commission.previous)} icon={Percent} tone="violet" to="/transactions" />
          <KpiCard
            loading={!d}
            label={`Posts & reels · ${periodLabel}`}
            value={fmt.number(d ? (d.content.posts.current ?? 0) + (d.content.reels.current ?? 0) : null)}
            change={d && fmt.change((d.content.posts.current ?? 0) + (d.content.reels.current ?? 0), (d.content.posts.previous ?? 0) + (d.content.reels.previous ?? 0))}
            icon={Clapperboard}
            tone="pink"
            spark={d?.series.posts?.map((p) => p.value)}
            to="/posts"
            hint={d ? `${fmt.number(d.content.reels.current)} reels · ${fmt.number(d.content.storiesLive)} stories live` : undefined}
          />
          <KpiCard loading={!d} label={`Campaigns created · ${periodLabel}`} value={fmt.number(d?.business.campaigns.current)} change={d && fmt.change(d.business.campaigns.current, d.business.campaigns.previous)} icon={ClipboardCheck} tone="amber" to="/campaigns" hint={d ? `${fmt.number(d.business.campaigns.total)} campaigns all-time` : undefined} />
          <KpiCard
            loading={!d}
            label={`Store & shop orders · ${periodLabel}`}
            value={fmt.number(d ? (d.store.digitalOrders.current ?? 0) + (d.store.shopOrders.current ?? 0) : null)}
            change={d && fmt.change((d.store.digitalOrders.current ?? 0) + (d.store.shopOrders.current ?? 0), (d.store.digitalOrders.previous ?? 0) + (d.store.shopOrders.previous ?? 0))}
            icon={ShoppingBag}
            tone="orange"
            to="/store"
            unavailable={!!d && d.store.digitalOrders.current === null && d.store.shopOrders.current === null}
            hint={d ? `${fmt.rupeesCompact((d.store.digitalRevenue ?? 0) + (d.store.shopRevenue ?? 0))} in sales · ${fmt.number(d.store.activeStores)} live stores` : undefined}
          />
          <KpiCard loading={!d} label={`Failed payments · ${periodLabel}`} value={fmt.number(d?.money.failedPayments.current)} change={d && fmt.change(d.money.failedPayments.current, d.money.failedPayments.previous)} invert icon={CreditCard} tone="rose" to="/transactions" hint={d ? `${fmt.number(d.money.refunds)} refunds in this period` : undefined} />
        </div>
      )}

      {/* Legacy-only summary when the monitor API is missing */}
      {monitorMissing && legacy && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total users" value={fmt.number(legacy.totalUsers)} icon={Users2} to="/users" hint={`${fmt.number(legacy.totalCreators)} creators · ${fmt.number(legacy.totalBrands)} brands`} />
          <KpiCard label="Total revenue" value={fmt.rupeesCompact(legacy.totalRevenue)} icon={Banknote} tone="emerald" to="/transactions" />
          <KpiCard label="Platform commission" value={fmt.rupeesCompact(legacy.totalPlatformCommission)} icon={Percent} tone="violet" />
          <KpiCard label="Held in escrow" value={fmt.rupeesCompact(legacy.totalInEscrow)} icon={Lock} tone="amber" to="/milestones" hint={`${fmt.number(legacy.totalCampaigns)} campaigns · ${fmt.number(legacy.totalSessions)} sessions`} />
        </div>
      )}

      {/* Charts */}
      {d && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Sign-ups and logins"
                description={`Per day, ${periodLabel} (India time)`}
                icon={UserPlus}
                actions={!d.trackingSince.logins ? <Badge tone="gray">Logins: tracking starts after deploy</Badge> : <Badge tone="gray">Logins tracked since {fmt.date(d.trackingSince.logins)}</Badge>}
              />
              <div className="p-4">
                <GrowthChart data={d} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Who’s on Fanitt" description="All accounts by type" icon={Users2} actions={d.users.suspended ? <Badge tone="rose">{fmt.number(d.users.suspended)} suspended</Badge> : undefined} />
              <UserMix data={d} />
            </Card>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Money coming in" description={`Per day, ${periodLabel} — ${fmt.rupees(sumOf(d.series.revenue))} in total`} icon={Banknote} actions={<Link to="/transactions" className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400">All transactions</Link>} />
              <div className="p-4">
                <RevenueChart data={d} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Money on hold" description="Right now" icon={Lock} />
              <div className="divide-y divide-gray-100 px-5 py-1 dark:divide-white/[0.05]">
                <StatRow icon={Lock} label="Held in escrow" value={fmt.rupees(d.money.inEscrow)} accent="violet" to="/milestones" />
                <StatRow icon={Wallet} label="Payouts waiting" value={fmt.rupees(d.money.pendingPayouts)} accent="rose" to="/withdrawals" />
                <StatRow icon={Layers} label="Active subscriptions" value={fmt.number(d.business.activeSubscriptions)} accent="sky" to="/subscription-plans" />
                <StatRow icon={FileText} label="Community posts" value={fmt.number(d.content.communityPosts.current)} accent="pink" to="/posts" />
                <StatRow icon={Users2} label="Communities" value={`${fmt.number(d.content.communities.total)}${d.content.communities.new ? ` (+${d.content.communities.new})` : ''}`} accent="orange" to="/communities" />
                <StatRow icon={Activity} label="Upcoming live sessions" value={fmt.number(d.business.sessions.upcoming)} accent="emerald" to="/live-sessions" />
              </div>
            </Card>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent admin actions"
                description={d.trackingSince.adminActions ? `Every change made in this panel · recorded since ${fmt.date(d.trackingSince.adminActions)}` : 'Every change made in this panel shows here once the new backend is live'}
                icon={History}
                actions={<Link to="/activity?tab=audit" className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400">Full audit log</Link>}
              />
              {d.recentAdmin.length === 0 ? (
                <EmptyState icon={History} message="No admin changes recorded yet." />
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {d.recentAdmin.map((a) => (
                    <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={a.actorName} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-gray-800 dark:text-white/85">
                          <span className="font-semibold">{a.actorName || 'Admin'}</span> · {a.message || `${a.method} ${a.path.replace('/api', '')}`}
                        </p>
                        <p className="truncate font-mono text-[11px] text-gray-400">
                          {a.method} {a.path.replace('/api', '')}
                        </p>
                      </div>
                      {!a.success && <Badge tone="rose">Failed {a.status}</Badge>}
                      <span className="shrink-0 text-xs text-gray-400">{fmt.ago(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="API health · last 24h" description={d.trackingSince.api ? `Measured since ${fmt.date(d.trackingSince.api)}` : 'Starts measuring after the backend is deployed'} icon={HeartPulse} actions={<Link to="/system" className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400">Details</Link>} />
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-white/[0.05]">
                {[
                  { label: 'Requests', value: fmt.compact(d.api.requests24h) },
                  { label: 'Server errors', value: fmt.number(d.api.errors24h), bad: d.api.errors24h > 0 },
                  { label: 'Error rate', value: d.api.errorRate === null ? '—' : `${(d.api.errorRate * 100).toFixed(2)}%`, bad: (d.api.errorRate ?? 0) > 0.01 },
                  { label: 'Avg response', value: d.api.avgMs === null ? '—' : `${d.api.avgMs} ms`, bad: (d.api.avgMs ?? 0) > 800 },
                ].map((m) => (
                  <div key={m.label} className="bg-white px-5 py-4 dark:bg-[#141821]">
                    <p className="text-xs text-gray-500 dark:text-white/45">{m.label}</p>
                    <p className={cn('mt-1 text-xl font-bold tabular-nums', m.bad ? 'text-rose-600 dark:text-rose-400' : 'text-gray-950 dark:text-white')}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 text-xs text-gray-500 dark:text-white/45">
                {d.api.openIssues ? (
                  <Link to="/system" className="flex items-center gap-1.5 font-semibold text-rose-600 hover:underline dark:text-rose-400">
                    <AlertTriangle size={13} /> {d.api.openIssues} endpoint{d.api.openIssues === 1 ? '' : 's'} failing — open System health
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={13} /> No failing endpoints
                  </span>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {loading && !d && !monitorMissing && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      )}

      <LongTerm legacy={legacy} />
    </div>
  );
}

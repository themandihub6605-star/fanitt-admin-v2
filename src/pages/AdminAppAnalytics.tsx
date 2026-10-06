import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Clock, Layers, LogOut, MonitorSmartphone, RefreshCw, Trophy, Users2 } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatCard, Tab, TabGroup } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { appAnalyticsApi, type AnalyticsRole, type ScreenReport } from '@/services/appAnalyticsApi';
import { ErrorBanner, Loading, Select } from '@/FanittStore/ui';
import { cn } from '@/utils/cn';

// App Analytics — which screens people spend the most time on, traffic by
// day and hour, and where they leave the app. Data comes from the app's
// screen tracker (screen names + time only).

const RANGES = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const ROLE_LABEL: Record<string, string> = {
  creator: 'Creators',
  brand: 'Brands',
  fan: 'Fans',
  agency: 'Agencies',
  guest: 'Not signed in',
  admin: 'Admins',
};

/** 75000 → "1m 15s", 5400000 → "1h 30m". */
function duration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

const num = (n: number) => n.toLocaleString('en-IN');

function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function hourLabel(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function ChartTip({ active, payload, label, kind }: { active?: boolean; payload?: { value: number }[]; label?: string | number; kind: 'users' | 'views' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1F2433]">
      <p className="mb-0.5 font-bold text-gray-900 dark:text-white">{kind === 'users' ? shortDate(String(label)) : `${hourLabel(Number(label))} – ${hourLabel((Number(label) + 1) % 24)}`}</p>
      <p className="font-semibold text-gray-700 dark:text-white/80">
        {num(payload[0].value)} {kind === 'users' ? 'active users' : 'screen views'}
      </p>
    </div>
  );
}

export default function AdminAppAnalytics() {
  const [days, setDays] = useState(7);
  const [role, setRole] = useState<AnalyticsRole>('all');
  const [data, setData] = useState<ScreenReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await appAnalyticsApi.screens(days, role));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, role]);

  const topShare = data?.screens[0]?.sharePct || 0;
  const screens = useMemo(() => (showAll ? data?.screens || [] : (data?.screens || []).slice(0, 15)), [data, showAll]);
  const peakHour = useMemo(() => {
    const h = data?.hours || [];
    return h.reduce((best, x) => (x.views > best.views ? x : best), { hour: -1, views: 0 });
  }, [data]);

  const empty = !loading && data && data.totals.views === 0;

  return (
    <div>
      <PageHeader
        title="App Analytics"
        description="Which screens people use most in the app, how long they stay, when they come, and where they leave."
        actions={
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <TabGroup>
          {RANGES.map((r) => (
            <Tab key={r.value} active={days === r.value} onClick={() => setDays(r.value)} groupId="analytics-range">
              {r.label}
            </Tab>
          ))}
        </TabGroup>
        <Select<AnalyticsRole>
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'creator', label: 'Creators' },
            { value: 'brand', label: 'Brands' },
            { value: 'fan', label: 'Fans' },
            { value: 'agency', label: 'Agencies' },
            { value: 'guest', label: 'Not signed in' },
          ]}
        />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {loading && !data ? (
        <Loading text="Loading analytics…" />
      ) : empty ? (
        <div className="mt-6">
          <EmptyState icon={Activity} message="No app activity in this period yet. Data starts coming in once people use the updated app." />
        </div>
      ) : data ? (
        <div className={cn('mt-5 space-y-5 transition-opacity', loading && 'opacity-60')}>
          {/* headline numbers */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard index={0} label="Active today" value={num(data.totals.activeToday)} icon={Users2} accent="orange" />
            <StatCard index={1} label={`Users · ${RANGES.find((r) => r.value === days)?.label}`} value={num(data.totals.visitors)} icon={MonitorSmartphone} accent="pink" />
            <StatCard index={2} label="Avg time per session" value={duration(data.totals.avgSessionMs)} icon={Clock} accent="sky" />
            <StatCard index={3} label="Screens per session" value={String(data.totals.screensPerSession)} icon={Layers} accent="emerald" />
          </div>

          {/* top screen callout */}
          {data.screens[0] && (
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white">
                <Trophy size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/50">Most used screen</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">{data.screens[0].screen}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">
                  {data.screens[0].sharePct}% of all time in the app · {num(data.screens[0].views)} visits · {num(data.screens[0].visitors)} users
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/50">Total time in app</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">{duration(data.totals.totalMs)}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">{num(data.totals.sessions)} sessions</p>
              </div>
            </Card>
          )}

          {/* screens ranked by time */}
          <Card className="p-0">
            <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Screens by time spent</h2>
                <p className="text-xs text-gray-500 dark:text-white/50">Sorted by total time · share = % of all time people spent in the app</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-y border-gray-100 bg-gray-50/70 text-[11px] uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
                  <tr>
                    <th className="w-10 px-5 py-2.5">#</th>
                    <th className="px-2 py-2.5">Screen</th>
                    <th className="w-[30%] px-2 py-2.5">Share of time</th>
                    <th className="px-2 py-2.5 text-right">Total time</th>
                    <th className="px-2 py-2.5 text-right">Avg / visit</th>
                    <th className="px-2 py-2.5 text-right">Visits</th>
                    <th className="px-5 py-2.5 text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {screens.map((s, i) => (
                    <tr key={s.screen} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 text-xs font-bold text-gray-400 dark:text-white/35">{i + 1}</td>
                      <td className="px-2 py-2.5 font-semibold text-gray-900 dark:text-white">{s.screen}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${topShare ? Math.max(2, (s.sharePct / topShare) * 100) : 0}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs font-bold tabular-nums text-gray-700 dark:text-white/80">{s.sharePct}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-gray-700 dark:text-white/80">{duration(s.totalMs)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-gray-700 dark:text-white/80">{duration(s.avgMs)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-gray-700 dark:text-white/80">{num(s.views)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-gray-700 dark:text-white/80">{num(s.visitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.screens.length > 15 && (
              <button onClick={() => setShowAll((v) => !v)} className="w-full border-t border-gray-100 py-3 text-xs font-bold text-orange-600 hover:bg-gray-50 dark:border-white/10 dark:text-orange-300 dark:hover:bg-white/[0.03]">
                {showAll ? 'Show top 15' : `Show all ${data.screens.length} screens`}
              </button>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* daily users */}
            <Card className="p-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Active users per day</h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-white/50">Unique people who opened the app each day (India time)</p>
              {data.daily.length < 2 ? (
                <p className="py-14 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                  {num(data.daily[0]?.visitors || 0)} <span className="block text-xs font-semibold text-gray-500 dark:text-white/50">active users today</span>
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dauFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4511E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#EC2A78" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTip kind="users" />} cursor={{ stroke: '#9CA3AF', strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="visitors" stroke="#EC2A78" strokeWidth={2} fill="url(#dauFill)" dot={false} activeDot={{ r: 5, fill: '#F4511E', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* traffic by hour */}
            <Card className="p-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Busiest hours</h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-white/50">
                Screen views by hour of day (India time){peakHour.hour >= 0 ? ` · peak ${hourLabel(peakHour.hour)}–${hourLabel((peakHour.hour + 1) % 24)}` : ''}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid strokeDasharray="4 8" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
                  <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTip kind="views" />} cursor={{ fill: 'rgba(156,163,175,0.12)' }} />
                  <Bar dataKey="views" fill="#F4511E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* exits */}
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                <LogOut size={16} className="text-rose-500" /> Where people leave the app
              </h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-white/50">Last screen of each session · bounce = left from the first screen they saw</p>
              {data.exits.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-white/50">No sessions yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.exits.slice(0, 8).map((e) => (
                    <div key={e.screen}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-semibold text-gray-800 dark:text-white/90">{e.screen}</span>
                        <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-white/55">
                          {e.sharePct}% · {num(e.sessions)} sessions{e.bounces ? ` · ${num(e.bounces)} bounces` : ''}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(2, e.sharePct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* roles */}
            <Card className="p-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Time by user type</h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-white/50">Share of all time in the app, and how many people</p>
              <div className="space-y-2.5">
                {data.roles.map((r) => (
                  <div key={r.role}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-gray-800 dark:text-white/90">{ROLE_LABEL[r.role] || r.role}</span>
                      <span className="text-xs tabular-nums text-gray-500 dark:text-white/55">
                        {r.sharePct}% · {duration(r.totalMs)} · {num(r.visitors)} users
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(2, r.sharePct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <p className="text-center text-[11px] text-gray-400 dark:text-white/35">
            Only screen names and time are recorded — never what people type or view. Data older than 90 days is deleted automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}
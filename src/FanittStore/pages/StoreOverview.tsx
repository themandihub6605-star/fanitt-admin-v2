import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, IndianRupee, Percent, PhoneCall, Radio, ShoppingBag, Store, MousePointerClick } from 'lucide-react';
import { Card, StatCard, TabGroup, Tab } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type ItemType, type Overview, type PlatformAnalytics } from '../api';
import { ErrorBanner, Loading, compactRupees, rupees } from '../ui';

const SOURCE_LABELS: Record<ItemType, string> = {
  digital_product: 'Digital products',
  live_stream: 'Live tickets',
  call: 'Calls',
  fanbox: 'FanBox',
};

const SOURCE_COLORS: Record<ItemType, string> = {
  digital_product: 'bg-orange-500',
  live_stream: 'bg-rose-500',
  call: 'bg-sky-500',
  fanbox: 'bg-pink-500',
};

export default function StoreOverview() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    storeAdminApi.overview().then(setOverview).catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    setAnalytics(null);
    storeAdminApi.analytics(days).then(setAnalytics).catch((err) => setError(getApiErrorMessage(err)));
  }, [days]);

  const t = analytics?.totals;
  const sources = analytics ? (Object.keys(SOURCE_LABELS) as ItemType[]).map((k) => ({ key: k, ...analytics.bySource[k] })) : [];
  const maxSource = Math.max(1, ...sources.map((s) => s.gross));

  return (
    <StoreLayout description="Everything happening across creator stores — sales, reviews, live, calls and settings.">
      <ErrorBanner message={error} onClose={() => setError('')} />

      {overview && overview.pendingKyc > 0 && (
        <Link
          to="/store/stores?kyc=pending"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AlertTriangle size={18} />
          {overview.pendingKyc} store{overview.pendingKyc === 1 ? '' : 's'} waiting for KYC review →
        </Link>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-white/50">Performance</h2>
        <TabGroup>
          {[7, 30, 90, 365].map((d) => (
            <Tab key={d} active={days === d} onClick={() => setDays(d)} groupId="store-days">
              {d === 365 ? '1 year' : `${d} days`}
            </Tab>
          ))}
        </TabGroup>
      </div>

      {!analytics || !overview ? (
        <Loading text="Loading store numbers…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} label="Store sales (gross)" value={rupees(t!.gross)} icon={IndianRupee} accent="orange" />
            <StatCard index={1} label="Fanitt fee revenue" value={rupees(t!.fees)} icon={Percent} accent="emerald" />
            <StatCard index={2} label="Paid orders" value={t!.orders.toLocaleString('en-IN')} icon={ShoppingBag} accent="sky" />
            <StatCard index={3} label="Active stores" value={(overview.stores.active || 0).toLocaleString('en-IN')} icon={Store} accent="pink" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
            <Card className="p-5">
              <p className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Daily sales</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.daily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4511E" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#F4511E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-white/5" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} stroke="#9ca3af" minTickGap={16} />
                    <YAxis tickFormatter={(v: number) => compactRupees(v)} tick={{ fontSize: 11 }} stroke="#9ca3af" width={56} />
                    <Tooltip
                      formatter={(value: number, name: string) => [rupees(value), name === 'gross' ? 'Gross' : 'Creator net']}
                      labelFormatter={(d: string) => d}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="gross" stroke="#F4511E" strokeWidth={2} fill="url(#grossFill)" />
                    <Area type="monotone" dataKey="net" stroke="#EC4899" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Where the money comes from</p>
              <div className="space-y-4">
                {sources.map((s) => (
                  <div key={s.key}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-white/80">{SOURCE_LABELS[s.key]}</span>
                      <span className="text-gray-500 dark:text-white/50">
                        {rupees(s.gross)} · {s.orders} orders
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className={`h-full rounded-full ${SOURCE_COLORS[s.key]}`} style={{ width: `${(s.gross / maxSource) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/40">Fanitt fee {rupees(s.fees)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={4} label="Live now" value={overview.lives.live || 0} icon={Radio} accent="rose" />
            <StatCard index={5} label={`Call minutes (${days}d)`} value={t!.callMinutes.toLocaleString('en-IN')} icon={PhoneCall} accent="sky" />
            <StatCard index={6} label={`Affiliate clicks (${days}d)`} value={t!.affiliateClicks.toLocaleString('en-IN')} icon={MousePointerClick} accent="amber" />
            <StatCard index={7} label="Refunded (all time)" value={rupees(overview.sales.refundedAmount)} icon={IndianRupee} accent="rose" />
          </div>

          <Card className="mt-5 p-5">
            <p className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Top stores ({days} days)</p>
            {analytics.topStores.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40">No sales in this period yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {analytics.topStores.map((s, i) => (
                  <Link key={s.store} to={`/store/stores?open=${s.store}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">{i + 1}</span>
                      {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" /> : null}
                      <span className="truncate font-semibold text-gray-800 dark:text-white/85">{s.name}</span>
                    </span>
                    <span className="text-right">
                      <b className="text-gray-900 dark:text-white">{rupees(s.gross)}</b>
                      <span className="ml-2 text-xs text-gray-400">{s.orders} orders · fee {rupees(s.fees)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </StoreLayout>
  );
}

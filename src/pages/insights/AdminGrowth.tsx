import { Funnel, LogIn, UserPlus, Users2 } from '@/icons';
import { Card, CardHeader, KpiCard, PageHeader, fmt } from '@/components/AdminUI';
import { CHART_COLORS, Donut, TrendChart } from '@/components/Charts';
import { insightsApi } from '@/services/monitorApi';
import { InsightStatus, PeriodActions, SkeletonGrid, useInsight } from './shared';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function AdminGrowth() {
  const { days, setDays, data, loading, error, missing, reload } = useInsight(insightsApi.growth, 30);
  const top = data?.funnel[0]?.count ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Growth funnel"
        description="Of the people who signed up in this period — how many went on to finish onboarding, get verified, post, pay and earn."
        actions={<PeriodActions groupId="gr-days" days={days} setDays={setDays} onReload={reload} loading={loading} />}
      />
      <InsightStatus missing={missing} error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonGrid cards={4} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="New sign-ups" value={fmt.number(top)} icon={UserPlus} tone="orange" spark={data.series?.map((p) => p.value)} to="/users" />
            <KpiCard label="Came back after signing up" value={fmt.number(data.cameBack)} icon={LogIn} tone="sky" hint={`${pct(data.cameBack, top)} of sign-ups`} />
            <KpiCard label="Creators" value={fmt.number(data.byRole?.find((r) => r.role === 'creator')?.count ?? 0)} icon={Users2} tone="pink" hint="Signed up as creator" />
            <KpiCard label="Brands" value={fmt.number(data.byRole?.find((r) => r.role === 'brand')?.count ?? 0)} icon={Users2} tone="emerald" hint="Signed up as brand" />
          </div>

          <Card className="mt-4">
            <CardHeader title="Sign-up funnel" description="Each step counts people from this period's sign-ups" icon={Funnel} />
            <div className="space-y-3 p-5">
              {top === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No sign-ups in this period yet.</p>
              ) : (
                data.funnel.map((step, i) => {
                  const base = step.of ?? top;
                  const width = base && step.count ? Math.max((step.count / top) * 100, 3) : 0;
                  return (
                    <div key={step.key} className="grid items-center gap-2 sm:grid-cols-[220px_1fr_110px] sm:gap-4">
                      <p className="text-[13px] font-medium text-gray-700 dark:text-white/80">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">{i + 1}</span>
                        {step.label}
                      </p>
                      <div className="h-9 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/[0.05]">
                        <div className="flex h-full items-center rounded-xl px-3 text-xs font-semibold text-white transition-[width] duration-700" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${CHART_COLORS[0]}, #EC2A78)`, opacity: 1 - i * 0.1 }}>
                          {width > 12 ? fmt.number(step.count) : ''}
                        </div>
                      </div>
                      <p className="text-right text-[13px] tabular-nums">
                        <span className="font-bold text-gray-950 dark:text-white">{fmt.number(step.count)}</span>
                        <span className="ml-1.5 text-xs text-gray-400">{step.of !== undefined ? `${pct(step.count, step.of)} of ${fmt.number(step.of)}` : pct(step.count, top)}</span>
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Sign-ups per day" description={`Last ${days} days`} icon={UserPlus} />
              <div className="p-4">
                <TrendChart series={[{ name: 'Sign-ups', points: data.series }]} emptyIcon={UserPlus} emptyMessage="No sign-ups in this period." />
              </div>
            </Card>
            <div className="grid gap-4">
              <Card>
                <CardHeader title="Who signed up" description="By account type" icon={Users2} />
                <div className="p-5">
                  <Donut size={150} rows={(data.byRole ?? []).map((r) => ({ label: fmt.label(r.role), value: r.count }))} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Sign-up method" description="Email, Google, Apple, phone…" icon={LogIn} />
                <div className="p-5">
                  <Donut size={150} rows={(data.byMethod ?? []).map((r) => ({ label: r.method === 'local' ? 'Email & password' : fmt.label(r.method), value: r.count }))} />
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

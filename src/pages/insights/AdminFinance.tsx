import { useMemo } from 'react';
import { AlertTriangle, ArrowDownRight, Banknote, Download, HandCoins, Percent, RotateCcw, ShoppingBag, Storefront2, Wallet } from '@/icons';
import { Button, Card, CardHeader, KpiCard, PageHeader, fmt, type Column, exportCsv } from '@/components/AdminUI';
import { BarList, ChartLegend, CHART_COLORS, Donut, MonthlyBars, TrendChart, shortMonth } from '@/components/Charts';
import { insightsApi, type FinanceStats } from '@/services/monitorApi';
import { InsightStatus, PeriodActions, SkeletonGrid, useInsight } from './shared';

type MonthRow = FinanceStats['monthly'][number];
const MONTH_COLUMNS: Column<MonthRow>[] = [
  { key: 'month', header: 'Month', value: (r) => r.month, render: () => null },
  { key: 'moneyIn', header: 'Money in (₹)', value: (r) => (r.moneyIn ?? 0) / 100, render: () => null },
  { key: 'commission', header: 'Platform commission (₹)', value: (r) => (r.commission ?? 0) / 100, render: () => null },
  { key: 'payouts', header: 'Payouts (₹)', value: (r) => (r.payouts ?? 0) / 100, render: () => null },
  { key: 'refunds', header: 'Refunds (₹)', value: (r) => (r.refunds ?? 0) / 100, render: () => null },
  { key: 'storeSales', header: 'Store sales (₹)', value: (r) => (r.storeSales ?? 0) / 100, render: () => null },
];

export default function AdminFinance() {
  const { days, setDays, data, loading, error, missing, reload } = useInsight(insightsApi.finance, 30);
  const t = data?.totals;
  const takeRate = t && t.moneyIn ? (t.commission ?? 0) / t.moneyIn : null;

  const monthly = useMemo(() => (data?.monthly ?? []).map((m) => ({ label: shortMonth(m.month), 'Money in': m.moneyIn ?? 0, Commission: m.commission ?? 0, Payouts: m.payouts ?? 0 })), [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Finance center"
        description="Money in, platform earnings, payouts and refunds — counted from real transactions. All amounts in ₹."
        actions={
          <PeriodActions
            groupId="fin-days"
            days={days}
            setDays={setDays}
            onReload={reload}
            loading={loading}
            extra={
              data && (
                <Button variant="outline" size="sm" onClick={() => exportCsv('finance-monthly', MONTH_COLUMNS, data.monthly)}>
                  <Download size={14} /> Monthly report
                </Button>
              )
            }
          />
        }
      />
      <InsightStatus missing={missing} error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonGrid cards={8} />
      ) : data && t ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Money in" value={fmt.rupeesCompact(t.moneyIn)} icon={Banknote} tone="orange" hint="Payments by fans & brands" spark={data.series.moneyIn?.map((p) => p.value)} to="/transactions" />
            <KpiCard label="Platform commission" value={fmt.rupeesCompact(t.commission)} icon={Percent} tone="emerald" hint={takeRate !== null ? `${(takeRate * 100).toFixed(1)}% take rate` : undefined} spark={data.series.commission?.map((p) => p.value)} />
            <KpiCard label="Paid out to creators" value={fmt.rupeesCompact(t.payoutsPaid)} icon={Wallet} tone="sky" hint="Completed withdrawals" spark={data.series.payouts?.map((p) => p.value)} to="/withdrawals" />
            <KpiCard label="Payouts waiting" value={fmt.rupeesCompact(t.payoutsPending)} icon={HandCoins} tone="amber" hint="Requested, not paid yet" to="/withdrawals" />
            <KpiCard label="Refunded" value={fmt.rupeesCompact(t.refunds)} icon={RotateCcw} tone="rose" hint="Money sent back" />
            <KpiCard label="Failed payments" value={fmt.number(t.failedPayments)} icon={AlertTriangle} tone="rose" hint="Checkout attempts that failed" to="/transactions" />
            <KpiCard label="Fanitt Store sales" value={fmt.rupeesCompact(t.storeSales)} icon={Storefront2} tone="violet" hint="Paid store orders" to="/store" />
            <KpiCard label="Shop orders" value={fmt.rupeesCompact(t.shopSales)} icon={ShoppingBag} tone="pink" hint="Product orders (excl. failed)" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Daily money flow"
                description={`Last ${days} days`}
                icon={ArrowDownRight}
                actions={<ChartLegend items={[{ label: 'Money in', color: CHART_COLORS[0] }, { label: 'Commission', color: CHART_COLORS[3] }, { label: 'Payouts', color: CHART_COLORS[1] }]} />}
              />
              <div className="p-4">
                <TrendChart
                  money
                  series={[
                    { name: 'Money in', points: data.series.moneyIn, color: CHART_COLORS[0] },
                    { name: 'Commission', points: data.series.commission, color: CHART_COLORS[3] },
                    { name: 'Payouts', points: data.series.payouts, color: CHART_COLORS[1] },
                  ]}
                  emptyIcon={Banknote}
                  emptyMessage="No money moved in this period."
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Where money comes from" description="Money in by payment type" icon={Banknote} />
              <div className="p-5">
                <Donut money rows={(data.byType ?? []).map((r) => ({ label: fmt.label(r.type), value: r.amount }))} />
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Commission by source" description="What the platform earned from each type" icon={Percent} />
              <div className="p-5">
                <BarList money rows={(data.commissionByType ?? []).map((r) => ({ label: fmt.label(r.type), value: r.amount }))} emptyMessage="No commission in this period." />
              </div>
            </Card>
            <Card>
              <CardHeader title="Refunds & failures" description="Refunded amount and failed payment attempts by type" icon={RotateCcw} />
              <div className="grid gap-6 p-5 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Refunded</p>
                  <BarList money rows={(data.refundsByType ?? []).map((r) => ({ label: fmt.label(r.type), value: r.amount }))} emptyMessage="No refunds." />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Failed attempts</p>
                  <BarList rows={(data.failedByType ?? []).map((r) => ({ label: fmt.label(r.type), value: r.count }))} emptyMessage="No failed payments." />
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader title="Last 12 months" description="Monthly totals — download the report for your accountant" icon={Banknote} />
            <div className="p-4">
              <MonthlyBars
                money
                rows={monthly}
                keys={[
                  { key: 'Money in', label: 'Money in', color: CHART_COLORS[0] },
                  { key: 'Commission', label: 'Commission', color: CHART_COLORS[3] },
                  { key: 'Payouts', label: 'Payouts', color: CHART_COLORS[1] },
                ]}
              />
            </div>
            <div className="overflow-x-auto border-t border-gray-100 dark:border-white/[0.06]">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-2.5">Month</th>
                    <th className="px-5 py-2.5 text-right">Money in</th>
                    <th className="px-5 py-2.5 text-right">Commission</th>
                    <th className="px-5 py-2.5 text-right">Payouts</th>
                    <th className="px-5 py-2.5 text-right">Refunds</th>
                    <th className="px-5 py-2.5 text-right">Store sales</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.monthly].reverse().map((m) => (
                    <tr key={m.month} className="border-t border-gray-100 tabular-nums dark:border-white/[0.05]">
                      <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{shortMonth(m.month)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-900 dark:text-white">{fmt.rupees(m.moneyIn)}</td>
                      <td className="px-5 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{fmt.rupees(m.commission)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600 dark:text-white/70">{fmt.rupees(m.payouts)}</td>
                      <td className="px-5 py-2.5 text-right text-rose-600 dark:text-rose-400">{fmt.rupees(m.refunds)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600 dark:text-white/70">{fmt.rupees(m.storeSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

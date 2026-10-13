import { useCallback, useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Cpu, Database, HeartPulse, RefreshCw, Route, ServerCrash, Timer } from '@/icons';
import { monitorApi, isMissingMonitor, type ApiIssue, type SystemHealth } from '@/services/monitorApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { Badge, Button, Card, CardHeader, DataTable, ErrorState, KpiCard, LoadingState, Notice, PageHeader, SegmentedControl, confirmDialog, fmt, toast, type Column } from '@/components/AdminUI';

function uptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

export default function AdminSystem() {
  const [days, setDays] = useState(7);
  const [showResolved, setShowResolved] = useState(false);
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await monitorApi.system(days, showResolved));
      setError('');
    } catch (e) {
      if (isMissingMonitor(e)) setMissing(true);
      else setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [days, showResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (issue: ApiIssue) => {
    const ok = await confirmDialog({
      title: 'Mark this as fixed?',
      message: `${issue.method} ${issue.path} — it disappears from this list and comes back automatically if the error happens again.`,
      confirmLabel: 'Mark as fixed',
    });
    if (!ok) return;
    try {
      await monitorApi.resolveIssue(issue._id);
      toast.success('Marked as fixed');
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const columns: Column<ApiIssue>[] = [
    {
      key: 'endpoint',
      header: 'Endpoint',
      value: (r) => `${r.method} ${r.path}`,
      render: (r) => (
        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-900 dark:text-white">
            <span className="font-semibold">{r.method}</span> {r.path}
          </p>
          <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-gray-500">{r.lastMessage}</p>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', value: (r) => r.kind, render: (r) => (r.kind === 'missing_route' ? <Badge tone="amber">Missing route · {r.status}</Badge> : <Badge tone="rose">Server error · {r.status}</Badge>) },
    { key: 'count', header: 'Times', align: 'right', sortable: true, value: (r) => r.count, render: (r) => <span className="font-semibold">{fmt.number(r.count)}</span> },
    { key: 'who', header: 'Last seen from', value: (r) => `${r.lastClient} ${r.lastRole}`, hideOnMobile: true, render: (r) => <span className="text-xs text-gray-500">{fmt.label(r.lastClient)} · {fmt.label(r.lastRole)}</span> },
    { key: 'last', header: 'Last seen', sortable: true, value: (r) => r.lastSeenAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500" title={`First seen ${fmt.dateTime(r.firstSeenAt)}`}>{fmt.ago(r.lastSeenAt)}</span> },
    {
      key: 'act',
      header: '',
      noExport: true,
      align: 'right',
      render: (r) =>
        r.resolvedAt ? (
          <Badge tone="emerald">Fixed</Badge>
        ) : (
          <Button size="xs" variant="outline" onClick={() => resolve(r)}>
            Mark fixed
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="System health"
        description="How the API is doing: request volume, errors, slow responses, and every endpoint that is failing or being called but doesn’t exist."
        actions={
          <>
            <SegmentedControl groupId="sys-days" value={days} onChange={setDays} options={[{ value: 1, label: '24h' }, { value: 7, label: '7 days' }, { value: 30, label: '30 days' }]} />
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              {!loading && <RefreshCw size={13} />} Refresh
            </Button>
          </>
        }
      />

      {missing ? (
        <Notice tone="warning">
          System monitoring needs the new backend module (<code className="font-mono text-xs">src/monitor</code>). After it’s deployed, request counts and errors are measured from that moment on.
        </Notice>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {data.trackingSince && <p className="mb-3 text-xs text-gray-400">Measuring since {fmt.dateTime(data.trackingSince)}. Older traffic wasn’t recorded.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Requests" value={fmt.number(data.totals.requests)} icon={HeartPulse} tone="sky" hint={`${fmt.number(data.totals.clientErrors)} client errors (4xx)`} />
            <KpiCard label="Server errors (5xx)" value={fmt.number(data.totals.serverErrors)} icon={ServerCrash} tone="rose" hint={data.totals.errorRate === null ? 'No traffic yet' : `${(data.totals.errorRate * 100).toFixed(2)}% of requests`} />
            <KpiCard label="Average response" value={data.totals.avgMs === null ? '—' : `${data.totals.avgMs} ms`} icon={Timer} tone="amber" hint="Across all endpoints" />
            <KpiCard
              label="Server"
              value={uptime(data.server.uptimeSeconds)}
              icon={Cpu}
              tone="emerald"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Database size={11} /> DB {data.server.database} · {data.server.memoryMb} MB RAM · Node {data.server.node}
                </span>
              }
            />
          </div>

          <Card className="mt-5">
            <CardHeader title="Traffic and errors" description="Requests per day (bars) and server errors (line)" icon={HeartPulse} />
            <div className="p-4">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data.traffic.map((t) => ({ ...t, date: shortDay(t.date) }))} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} className="stroke-gray-100 dark:stroke-white/5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmt.compact(v)} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#F43F5E' }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                  <Tooltip formatter={(v: number, n: string) => [fmt.number(v), n === 'requests' ? 'Requests' : n === 'serverErrors' ? 'Server errors' : n]} />
                  <Bar yAxisId="l" dataKey="requests" fill="#0EA5E9" fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line yAxisId="r" type="monotone" dataKey="serverErrors" stroke="#F43F5E" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Route size={15} /> Failing endpoints
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Grouped by endpoint. “Missing route” means the app, website or admin called a URL the server doesn’t have — usually a deploy that’s out of date.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-orange-500" /> Show fixed ones too
            </label>
          </div>
          {data.issues.length === 0 ? (
            <Card className="flex items-center gap-2 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} /> No failing endpoints. Everything that was called answered correctly.
            </Card>
          ) : (
            <DataTable rows={data.issues} columns={columns} rowKey={(r) => r._id} exportName="api-issues" searchable searchPlaceholder="Search endpoint or message…" />
          )}
        </>
      )}
    </div>
  );
}

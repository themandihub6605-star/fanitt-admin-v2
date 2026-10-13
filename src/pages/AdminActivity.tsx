import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, Globe, History, LogIn, Monitor, RefreshCw, ShieldAlert, Smartphone } from '@/icons';
import { monitorApi, isMissingMonitor, type ActivityItem, type ActivityPage, type AuditLog, type AuthEvent } from '@/services/monitorApi';
import { getApiErrorMessage } from '@/services/apiClient';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Select,
  Toolbar,
  fmt,
  useDebouncedValue,
  type Column,
} from '@/components/AdminUI';
import { cn } from '@/utils/cn';

type TabKey = 'feed' | 'audit' | 'logins';

const DAY_OPTIONS = [
  { value: 1, label: 'Last 24 hours' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const TONE_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  gray: 'bg-gray-400',
};

function MissingBackend() {
  return (
    <Notice tone="warning">
      Activity tracking needs the new backend module (<code className="font-mono text-xs">src/monitor</code>). Once it’s deployed, admin actions, logins and API errors are recorded from that moment on — older history
      can’t be recovered because it was never stored.
    </Notice>
  );
}

// ---------------------------------------------------------------------------
// Platform activity (timeline)
// ---------------------------------------------------------------------------
function Feed() {
  const [days, setDays] = useState(7);
  const [types, setTypes] = useState<string[]>([]);
  const [data, setData] = useState<ActivityPage | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const r = await monitorApi.activity({ days, type: types.join(',') || undefined, page: p, limit: 40 });
        setData(r);
        setItems((cur) => (p === 1 ? r.items : [...cur, ...r.items]));
        setPage(p);
        setError('');
      } catch (e) {
        if (isMissingMonitor(e)) setMissing(true);
        else setError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [days, types]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // Group by day.
  const groups = useMemo(() => {
    const out: { day: string; items: ActivityItem[] }[] = [];
    items.forEach((it) => {
      const day = new Date(it.at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(it);
      else out.push({ day, items: [it] });
    });
    return out;
  }, [items]);

  const toggle = (k: string) => setTypes((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));

  if (missing) return <MissingBackend />;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit p-4 lg:sticky lg:top-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Period</p>
        <Select value={days} onChange={setDays} options={DAY_OPTIONS} className="w-full" label="Period" />
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Show</p>
        <div className="space-y-0.5">
          <button onClick={() => setTypes([])} className={cn('flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px]', !types.length ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' : 'text-gray-600 hover:bg-gray-50 dark:text-white/65 dark:hover:bg-white/5')}>
            Everything <span className="text-xs tabular-nums text-gray-400">{data && !types.length ? fmt.number(data.total) : ''}</span>
          </button>
          {(data?.sources ?? []).map((s) => (
            <button
              key={s.key}
              disabled={!s.available}
              onClick={() => toggle(s.key)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] disabled:opacity-40',
                types.includes(s.key) ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' : 'text-gray-600 hover:bg-gray-50 dark:text-white/65 dark:hover:bg-white/5'
              )}
            >
              <span className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={types.includes(s.key)} className="h-3.5 w-3.5 accent-orange-500" />
                {s.label}
              </span>
              <span className="text-xs tabular-nums text-gray-400">{s.count === null ? (s.available ? '' : 'n/a') : fmt.number(s.count)}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">“Logins” is off by default because it’s busy — tick it to include sign-ins. Counts are for the selected period.</p>
      </Card>

      <div className="min-w-0">
        <Toolbar actions={<Button variant="outline" size="sm" onClick={() => load(1)} loading={loading}>{!loading && <RefreshCw size={13} />} Refresh</Button>}>
          <p className="text-sm text-gray-500">{data ? `${fmt.number(data.total)} events · ${DAY_OPTIONS.find((o) => o.value === days)?.label.toLowerCase()}` : ' '}</p>
        </Toolbar>
        <Card>
          {error ? (
            <ErrorState message={error} onRetry={() => load(1)} />
          ) : loading && !items.length ? (
            <LoadingState rows={8} />
          ) : !items.length ? (
            <EmptyState icon={Activity} message="Nothing happened in this period for the selected types." />
          ) : (
            <div className="px-5 py-2">
              {groups.map((g) => (
                <div key={g.day}>
                  <p className="sticky top-14 z-[1] -mx-5 border-b border-gray-100 bg-white/95 px-5 py-2 text-xs font-semibold text-gray-500 backdrop-blur dark:border-white/[0.05] dark:bg-[#141821]/95">{g.day}</p>
                  <ol className="relative ml-3 border-l border-gray-100 py-1 dark:border-white/[0.06]">
                    {g.items.map((it) => {
                      const content = (
                        <>
                          <span className={cn('absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#141821]', TONE_DOT[it.tone] || 'bg-gray-400')} />
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            {it.actor?.name ? <Avatar name={it.actor.name} src={it.actor.avatarUrl} size={28} /> : null}
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] text-gray-800 dark:text-white/85">{it.title}</p>
                              {it.meta && <p className="mt-0.5 truncate text-xs text-gray-400">{it.meta}</p>}
                            </div>
                            {it.thumb && <img src={it.thumb} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />}
                            <span className="shrink-0 text-xs tabular-nums text-gray-400" title={fmt.dateTime(it.at)}>
                              {new Date(it.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </>
                      );
                      return (
                        <li key={it.id} className="relative pl-5">
                          {it.href ? (
                            <Link to={it.href} className="-mx-2 flex rounded-lg px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                              {content}
                            </Link>
                          ) : (
                            <div className="flex py-2.5">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
              {data?.hasMore && (
                <div className="py-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => load(page + 1)} loading={loading}>
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin audit log
// ---------------------------------------------------------------------------
function Audit() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 350);
  const [actor, setActor] = useState('');
  const [area, setArea] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof monitorApi.auditLogs>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await monitorApi.auditLogs({ days, search: q || undefined, actor: actor || undefined, area: area || undefined, result: result || undefined, page, limit: 30 }));
      setError('');
    } catch (e) {
      if (isMissingMonitor(e)) setMissing(true);
      else setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [days, q, actor, area, result, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [days, q, actor, area, result]);

  if (missing) return <MissingBackend />;

  const columns: Column<AuditLog>[] = [
    { key: 'when', header: 'When', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500" title={fmt.dateTime(r.createdAt)}>{fmt.dateTime(r.createdAt)}</span> },
    {
      key: 'admin',
      header: 'Admin',
      value: (r) => r.actorName,
      render: (r) => (
        <span className="flex items-center gap-2">
          <Avatar name={r.actorName} size={24} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-gray-900 dark:text-white">{r.actorName || '—'}</span>
            <span className="block truncate text-[11px] text-gray-400">{r.actorEmail}</span>
          </span>
        </span>
      ),
    },
    { key: 'action', header: 'What happened', value: (r) => r.message, render: (r) => <span className="text-[13px]">{r.message || '—'}</span> },
    { key: 'area', header: 'Area', value: (r) => r.area, render: (r) => <Badge tone="gray">{fmt.label(r.area || '—')}</Badge>, hideOnMobile: true },
    {
      key: 'request',
      header: 'Request',
      value: (r) => `${r.method} ${r.path}`,
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono text-[11px] text-gray-500">
          <span className="font-semibold text-gray-700 dark:text-white/70">{r.method}</span> {r.path.replace('/api', '')}
        </span>
      ),
    },
    { key: 'result', header: 'Result', value: (r) => (r.success ? 'success' : `failed ${r.status}`), render: (r) => (r.success ? <Badge tone="emerald" dot>OK</Badge> : <Badge tone="rose" dot>Failed {r.status}</Badge>) },
  ];

  return (
    <>
      {data?.trackingSince && (
        <p className="mb-3 text-xs text-gray-400">Recording admin changes since {fmt.dateTime(data.trackingSince)}. Passwords and other secrets are never stored.</p>
      )}
      <DataTable
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={setOpen}
        emptyIcon={History}
        emptyMessage="No admin changes match these filters."
        exportName="admin-audit-log"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search message, path, admin, record id…" />
            <Select value={days} onChange={setDays} options={DAY_OPTIONS} label="Period" />
            <Select value={actor} onChange={setActor} label="Admin" options={[{ value: '', label: 'All admins' }, ...(data?.actors ?? []).map((a) => ({ value: a._id, label: `${a.name} (${a.count})` }))]} />
            <Select value={area} onChange={setArea} label="Area" options={[{ value: '', label: 'All areas' }, ...(data?.areas ?? []).map((a) => ({ value: a, label: fmt.label(a) }))]} />
            <Select value={result} onChange={setResult} label="Result" options={[{ value: '', label: 'Any result' }, { value: 'success', label: 'Succeeded' }, { value: 'failed', label: 'Failed' }]} />
          </>
        }
      />
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.message || 'Admin action'} subtitle={open ? fmt.dateTime(open.createdAt) : undefined}>
        {open && (
          <dl className="space-y-4 text-sm">
            {[
              ['Admin', `${open.actorName} · ${open.actorEmail}`],
              ['Result', open.success ? `Succeeded (${open.status})` : `Failed (${open.status})`],
              ['Request', `${open.method} ${open.rawPath || open.path}`],
              ['Area', fmt.label(open.area)],
              ['Record', open.targetId ? `${open.targetType} · ${open.targetId}` : '—'],
              ['Took', `${open.durationMs} ms`],
              ['IP address', open.ip || '—'],
              ['Browser', open.userAgent || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-gray-400">{k}</dt>
                <dd className="mt-0.5 break-words text-gray-800 dark:text-white/85">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium text-gray-400">Data sent</dt>
              <dd className="mt-1">
                {open.changes ? (
                  <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-[11px] text-gray-700 dark:bg-white/5 dark:text-white/70">{JSON.stringify(open.changes, null, 2)}</pre>
                ) : (
                  <span className="text-gray-400">No body</span>
                )}
              </dd>
            </div>
            {open.targetType === 'users' && open.targetId && (
              <Link to={`/users/${open.targetId}`} className="inline-flex text-sm font-semibold text-orange-600 hover:underline">
                Open this user →
              </Link>
            )}
          </dl>
        )}
      </Drawer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Logins
// ---------------------------------------------------------------------------
const CLIENT_ICON: Record<string, typeof Globe> = { app: Smartphone, web: Globe, admin: Monitor };

function Logins() {
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 350);
  const [result, setResult] = useState('');
  const [client, setClient] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof monitorApi.authEvents>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await monitorApi.authEvents({ days, search: q || undefined, result: result || undefined, client: client || undefined, page, limit: 30 }));
      setError('');
    } catch (e) {
      if (isMissingMonitor(e)) setMissing(true);
      else setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [days, q, result, client, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [days, q, result, client]);

  if (missing) return <MissingBackend />;

  const columns: Column<AuthEvent>[] = [
    { key: 'when', header: 'When', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt.dateTime(r.createdAt)}</span> },
    {
      key: 'who',
      header: 'Account',
      value: (r) => `${r.name} ${r.email}`,
      render: (r) =>
        r.user ? (
          <Link to={`/users/${r.user}`} className="flex items-center gap-2 hover:underline">
            <Avatar name={r.name || r.email} size={24} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-gray-900 dark:text-white">{r.name || r.email}</span>
              <span className="block truncate text-[11px] text-gray-400">{r.email}</span>
            </span>
          </Link>
        ) : (
          <span className="text-[13px] text-gray-700 dark:text-white/70">{r.email || 'Unknown'}</span>
        ),
    },
    { key: 'role', header: 'Role', value: (r) => r.role, render: (r) => (r.role ? <Badge tone="gray">{fmt.label(r.role)}</Badge> : <span className="text-gray-300">—</span>), hideOnMobile: true },
    { key: 'method', header: 'Method', value: (r) => r.action, render: (r) => <span className="text-xs text-gray-500">{fmt.label(r.action)}</span> },
    {
      key: 'client',
      header: 'From',
      value: (r) => r.client,
      render: (r) => {
        const I = CLIENT_ICON[r.client] ?? Globe;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <I size={13} /> {fmt.label(r.client || 'unknown')}
          </span>
        );
      },
    },
    { key: 'ip', header: 'IP', value: (r) => r.ip, render: (r) => <span className="font-mono text-[11px] text-gray-400">{r.ip || '—'}</span>, hideOnMobile: true },
    {
      key: 'result',
      header: 'Result',
      value: (r) => (r.success ? 'success' : `failed: ${r.reason}`),
      render: (r) => (r.success ? <Badge tone="emerald" dot>Signed in</Badge> : <span title={r.reason}><Badge tone="rose" dot>Failed</Badge></span>),
    },
  ];

  return (
    <>
      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <Card className="px-4 py-3">
            <p className="text-xs text-gray-500">Successful sign-ins</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-gray-950 dark:text-white">{fmt.number(data.summary.succeeded)}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <ShieldAlert size={12} /> Failed attempts
            </p>
            <p className={cn('mt-1 text-xl font-bold tabular-nums', data.summary.failed ? 'text-rose-600' : 'text-gray-950 dark:text-white')}>{fmt.number(data.summary.failed)}</p>
          </Card>
        </div>
      )}
      {data?.trackingSince && <p className="mb-3 text-xs text-gray-400">Recording sign-ins since {fmt.dateTime(data.trackingSince)}.</p>}
      <DataTable
        rows={data?.items ?? []}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={LogIn}
        emptyMessage="No sign-ins match these filters."
        exportName="login-activity"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search email, name or IP…" />
            <Select value={days} onChange={setDays} options={DAY_OPTIONS} label="Period" />
            <Select value={result} onChange={setResult} label="Result" options={[{ value: '', label: 'All attempts' }, { value: 'success', label: 'Signed in' }, { value: 'failed', label: 'Failed' }]} />
            <Select value={client} onChange={setClient} label="From" options={[{ value: '', label: 'App, web & admin' }, { value: 'app', label: 'Mobile app' }, { value: 'web', label: 'Website' }, { value: 'admin', label: 'Admin panel' }]} />
          </>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export default function AdminActivity() {
  const [params, setParams] = useSearchParams();
  const tab = (['feed', 'audit', 'logins'].includes(params.get('tab') || '') ? params.get('tab') : 'feed') as TabKey;
  const meta: Record<TabKey, { title: string; description: string }> = {
    feed: { title: 'Activity', description: 'Everything happening on the app and website — sign-ups, posts, payments, orders, reviews and admin changes — newest first.' },
    audit: { title: 'Audit log', description: 'Every change an admin made in this panel: who, what, when and whether it worked.' },
    logins: { title: 'Login activity', description: 'Sign-ins on the app, website and admin panel, including failed attempts.' },
  };
  return (
    <div>
      <PageHeader
        title={meta[tab].title}
        description={meta[tab].description}
        actions={
          <SegmentedControl
            groupId="activity-tabs"
            value={tab}
            onChange={(t) => setParams(t === 'feed' ? {} : { tab: t })}
            options={[
              { value: 'feed', label: <><Activity size={13} /> Platform</> },
              { value: 'audit', label: <><History size={13} /> Audit log</> },
              { value: 'logins', label: <><LogIn size={13} /> Logins</> },
            ]}
          />
        }
      />
      {tab === 'feed' && <Feed />}
      {tab === 'audit' && <Audit />}
      {tab === 'logins' && <Logins />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Loader2,
  Lock,
  MessagesSquare,
  Search,
  Sparkles,
  Trash2,
  Users2,
  Crown,
  IndianRupee,
  Receipt,
  Wallet,
  Percent,
  Settings2,
} from 'lucide-react';
import {
  communityAdminApi,
  type AdminCommunity,
  type CommunityPayment,
  type CommunityPaymentTotals,
  type CommunitySettings,
} from '@/services/communityAdminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState, StatCard, Tab, TabGroup } from '@/components/AdminUI';
import { ReasonModal, Pagination, SearchBox, Select, dateTime, rupees, useDebounced } from '@/FanittStore/ui';
import { storeAdminApi } from '@/FanittStore/api';
import { cn } from '@/utils/cn';

const PLAN_LABEL: Record<string, string> = { monthly: 'Monthly', yearly: 'Yearly', lifetime: 'One-time' };
const PLAN_SUFFIX: Record<string, string> = { monthly: '/mo', yearly: '/yr', lifetime: ' once' };

// Public website — used for the "View" link on each community.
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://app.fanitt.com';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Toggle({ on, busy, onClick, label }: { on: boolean; busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={onClick}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        on ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/15'
      )}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function CommunitiesTab() {
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [type, setType] = useState<'all' | 'paid' | 'free'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(
      () => {
        setLoading(true);
        setError('');
        communityAdminApi
          .list({ search: search || undefined, page, limit: 25, type })
          .then((res) => {
            setCommunities(res.communities);
            setPages(Math.max(1, res.pages));
            setTotal(res.total);
          })
          .catch((err) => setError(getApiErrorMessage(err)))
          .finally(() => setLoading(false));
      },
      search ? 300 : 0
    );
    return () => window.clearTimeout(handle);
  }, [search, page, type]);

  const toggle = async (c: AdminCommunity, field: 'isVerified' | 'isFeatured') => {
    setActingOn(`${c._id}-${field}`);
    setError('');
    try {
      const updated = await communityAdminApi.update(c._id, { [field]: !c[field] });
      setCommunities((prev) =>
        prev.map((x) => (x._id === c._id ? { ...x, isVerified: updated.isVerified, isFeatured: updated.isFeatured } : x))
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const makeFree = async (c: AdminCommunity) => {
    if (!window.confirm(`Make "${c.name}" free?\n\nEveryone who paid keeps access; new members join for free.`)) return;
    setActingOn(`${c._id}-free`);
    setError('');
    try {
      await communityAdminApi.update(c._id, { isPaid: false });
      setCommunities((prev) => prev.map((x) => (x._id === c._id ? { ...x, isPaid: false } : x)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const remove = async (c: AdminCommunity) => {
    if (!window.confirm(`Delete "${c.name}"?\n\nAll its posts, comments, members and chat messages will be permanently removed.`)) return;
    setActingOn(`${c._id}-delete`);
    setError('');
    try {
      await communityAdminApi.remove(c._id);
      setCommunities((prev) => prev.filter((x) => x._id !== c._id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by community name..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20"
        />
      </div>
      <div className="sm:w-44">
        <Select
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All communities' },
            { value: 'paid', label: 'Paid only' },
            { value: 'free', label: 'Free only' },
          ]}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-white/40">{total.toLocaleString('en-IN')} total</p>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading communities...</p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {communities.length === 0 && (
              <EmptyState icon={Users2} message={search ? 'No communities match your search.' : 'No communities yet.'} />
            )}

            {communities.map((c) => (
              <Card key={c._id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Identity */}
                  <div className="flex min-w-[240px] flex-1 items-start gap-3">
                    {c.iconUrl ? (
                      <img src={c.iconUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-lg font-bold text-orange-600 dark:text-orange-300">
                        {c.name.trim()[0]?.toUpperCase() || '#'}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{c.name}</p>
                        {c.isVerified && <BadgeCheck size={15} className="text-sky-500" />}
                        {c.isFeatured && (
                          <Badge tone="amber">
                            <Sparkles size={10} /> Featured
                          </Badge>
                        )}
                        {c.isPaid && (
                          <Badge tone="pink">
                            <Crown size={10} /> Paid
                          </Badge>
                        )}
                        <Badge tone={c.visibility === 'private' ? 'gray' : 'emerald'}>
                          {c.visibility === 'private' ? <Lock size={10} /> : <Globe2 size={10} />}
                          {c.visibility === 'private' ? 'Private' : 'Public'}
                        </Badge>
                      </div>
                      {c.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-white/55">{c.description}</p>}
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-white/45">
                        {c.createdBy?.name ? `Owner: ${c.createdBy.name}` : 'Owner unknown'}
                        {c.createdBy?.email ? ` (${c.createdBy.email})` : ''}
                        {c.category?.label ? ` · ${c.category.label}` : ''} · Created {formatDate(c.createdAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-500 dark:text-white/60">
                        <span className="flex items-center gap-1">
                          <Users2 size={13} /> {c.memberCount.toLocaleString('en-IN')} members
                        </span>
                        <span className="flex items-center gap-1">
                          <MessagesSquare size={13} /> {c.discussionCount.toLocaleString('en-IN')} posts
                        </span>
                        {c.pendingRequestCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-300">{c.pendingRequestCount} pending requests</span>
                        )}
                        {c.lastActivityAt && <span>Last active {formatDate(c.lastActivityAt)}</span>}
                      </div>
                      {(c.isPaid || (c.paidStats?.payments ?? 0) > 0) && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {(['monthly', 'yearly', 'lifetime'] as const)
                            .filter((k) => c.plans?.[k]?.enabled)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded-lg border border-pink-200 bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300"
                              >
                                {PLAN_LABEL[k]} · {rupees(c.plans?.[k]?.price ?? 0)}
                                {PLAN_SUFFIX[k]}
                              </span>
                            ))}
                          <span className="text-xs font-semibold text-gray-500 dark:text-white/60">
                            {(c.paidMemberCount ?? 0).toLocaleString('en-IN')} paid members · {rupees(c.paidStats?.revenue ?? 0)} from{' '}
                            {(c.paidStats?.payments ?? 0).toLocaleString('en-IN')} payments
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-white/70">
                      <Toggle on={c.isVerified} busy={actingOn === `${c._id}-isVerified`} onClick={() => toggle(c, 'isVerified')} label="Verified" />
                      Verified
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-white/70">
                      <Toggle on={c.isFeatured} busy={actingOn === `${c._id}-isFeatured`} onClick={() => toggle(c, 'isFeatured')} label="Featured" />
                      Featured
                    </label>
                    <a
                      href={`${SITE_URL}/communities/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5"
                    >
                      <ExternalLink size={12} /> View
                    </a>
                    {c.isPaid && (
                      <Button variant="outline" size="sm" onClick={() => makeFree(c)} disabled={actingOn === `${c._id}-free`}>
                        {actingOn === `${c._id}-free` ? <Loader2 size={12} className="animate-spin" /> : null} Make free
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => remove(c)} disabled={actingOn === `${c._id}-delete`}>
                      {actingOn === `${c._id}-delete` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-white/40">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SettingsCard() {
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [busy, setBusy] = useState<keyof CommunitySettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    communityAdminApi
      .settings()
      .then(setSettings)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const change = async (key: keyof CommunitySettings, value: boolean) => {
    setBusy(key);
    setError('');
    try {
      setSettings(await communityAdminApi.updateSettings({ [key]: value }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const rows: { key: keyof CommunitySettings; title: string; hint: string }[] = [
    {
      key: 'requireSubscription',
      title: 'Paid plan needed to create a community',
      hint: 'On: only users with a paid Fanitt plan (monthly or yearly) can create a community. Off: anyone can.',
    },
    {
      key: 'paidCommunitiesEnabled',
      title: 'Allow paid communities',
      hint: 'Off: creators can’t turn on paid plans. Existing paid members keep their access.',
    },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 size={16} className="text-orange-500" />
        <h3 className="font-bold text-gray-900 dark:text-white">Community rules</h3>
      </div>
      {error && <p className="mb-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.title}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/55">{r.hint}</p>
            </div>
            {settings ? (
              <>
                <Badge tone={settings[r.key] ? 'emerald' : 'gray'}>{settings[r.key] ? 'On' : 'Off'}</Badge>
                <Toggle on={settings[r.key]} busy={busy === r.key} onClick={() => change(r.key, !settings[r.key])} label={r.title} />
              </>
            ) : (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function PaymentsTab() {
  const [rows, setRows] = useState<CommunityPayment[]>([]);
  const [totals, setTotals] = useState<CommunityPaymentTotals | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<'all' | 'paid' | 'refunded'>('all');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState<CommunityPayment | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await communityAdminApi.payments({ page: p, status, search: debounced || undefined });
      setRows(res.payments);
      setTotals(res.totals);
      setPages(res.pages);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debounced]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Paid communities" value={String(totals?.paidCommunities ?? 0)} icon={Crown} accent="pink" index={0} />
        <StatCard label="Active paid members" value={String(totals?.activePaidMembers ?? 0)} icon={Users2} accent="sky" index={1} />
        <StatCard label="Members paid" value={rupees(totals?.gross ?? 0)} icon={IndianRupee} accent="emerald" index={2} />
        <StatCard label="Fanitt fees" value={rupees(totals?.fees ?? 0)} icon={Percent} accent="orange" index={3} />
        <StatCard label="Creators earned" value={rupees(totals?.net ?? 0)} icon={Wallet} accent="amber" index={4} />
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <SearchBox value={search} onChange={setSearch} placeholder="Search member or community" />
          </div>
          <div className="sm:w-40">
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'All payments' },
                { value: 'paid', label: 'Paid' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} message="No community payments yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400 dark:text-white/40">
                <tr>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Community · plan</th>
                  <th className="py-2 pr-3">Paid</th>
                  <th className="py-2 pr-3">Fee / creator</th>
                  <th className="py-2 pr-3">Access</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {rows.map((p) => (
                  <tr key={p._id} className="align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.buyer?.name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">{p.buyer?.email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.title.split(' · ')[0]}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {PLAN_LABEL[p.plan] || p.plan} · Owner: {p.owner?.name || '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-gray-900 dark:text-white">{rupees(p.amount)}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">{p.paidWith === 'wallet' ? 'Wallet' : 'Razorpay'}</p>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-600 dark:text-white/70">
                      <p>Fee {rupees(p.feeAmount)}</p>
                      <p>Creator {rupees(p.creatorEarning)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      {p.status === 'refunded' ? (
                        <Badge tone="rose">Refunded</Badge>
                      ) : p.access ? (
                        <div className="space-y-1">
                          <Badge tone={p.access.status === 'active' ? 'emerald' : p.access.status === 'expired' ? 'amber' : 'gray'}>
                            {p.access.status === 'active' ? 'Active' : p.access.status === 'expired' ? 'Expired' : p.access.status}
                          </Badge>
                          <p className="text-xs text-gray-500 dark:text-white/50">
                            {p.access.plan === 'lifetime' ? 'Lifetime' : p.access.paidUntil ? `Till ${dateTime(p.access.paidUntil)}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Left</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-500 dark:text-white/55">{dateTime(p.paidAt)}</td>
                    <td className="py-3 text-right">
                      {p.status === 'paid' && p.amount > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setRefunding(p)}>
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <Pagination
            page={page}
            pages={pages}
            onPage={(p) => {
              setPage(p);
              load(p);
            }}
          />
        )}
      </Card>

      <ReasonModal
        open={refunding !== null}
        title="Refund this payment?"
        hint={refunding ? `${rupees(refunding.amount)} goes back to ${refunding.buyer?.name || 'the member'} and the time it bought is removed.` : ''}
        presets={['Paid by mistake', 'Member asked for a refund', 'Community not as described']}
        confirmLabel="Refund"
        onClose={() => setRefunding(null)}
        onSubmit={async (reason) => {
          if (!refunding) return;
          await storeAdminApi.refundOrder(refunding._id, reason || 'Refunded by Fanitt');
          await load(page);
        }}
      />
    </div>
  );
}

export default function AdminCommunities() {
  const [tab, setTab] = useState<'communities' | 'payments'>('communities');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="Every community on Fanitt — verify trusted ones, feature the best, see paid communities and every payment."
      />
      <SettingsCard />
      <TabGroup>
        <Tab active={tab === 'communities'} onClick={() => setTab('communities')}>
          <Users2 size={14} /> Communities
        </Tab>
        <Tab active={tab === 'payments'} onClick={() => setTab('payments')}>
          <IndianRupee size={14} /> Paid memberships
        </Tab>
      </TabGroup>
      {tab === 'communities' ? <CommunitiesTab /> : <PaymentsTab />}
    </div>
  );
}
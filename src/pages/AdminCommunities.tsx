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
} from 'lucide-react';
import { communityAdminApi, type AdminCommunity } from '@/services/communityAdminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

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

export default function AdminCommunities() {
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
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
          .list({ search: search || undefined, page, limit: 25 })
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
  }, [search, page]);

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
      <PageHeader
        title="Communities"
        description={`Every community on Fanitt — ${total.toLocaleString('en-IN')} total. Verify trusted ones, feature the best, remove anything that breaks the rules.`}
      />

      <div className="relative max-w-md">
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
import { useState } from 'react';
import { Aperture, Eye, Play, Trash2, X } from '@/icons';
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Skeleton, Toolbar, confirmDialog, fmt, toast } from '@/components/AdminUI';
import { manageApi, type ManagedStory } from '@/services/manageApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { FilterChips, MissingBackend, StatStrip, usePaged, useSearch } from './shared';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

type Status = 'live' | 'expired' | 'all';

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600e3);
  const m = Math.round((ms % 3600e3) / 60e3);
  return h ? `${h}h ${m}m left` : `${m}m left`;
}

function Viewer({ story, onClose }: { story: ManagedStory; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X size={18} />
      </button>
      <div className="relative aspect-[9/16] h-[86vh] max-h-[760px] overflow-hidden rounded-3xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {story.media.type === 'video' ? <video src={story.media.url} poster={story.media.thumbnailUrl} controls autoPlay className="h-full w-full object-contain" /> : <img src={story.media.url} alt="" className="h-full w-full object-contain" />}
        <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-black/70 to-transparent p-4 text-white">
          <Avatar name={story.author?.name} src={story.author?.avatarUrl} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{story.author?.name}</p>
            <p className="text-xs text-white/70">
              {fmt.ago(story.createdAt)} · {timeLeft(story.expiresAt)}
            </p>
          </div>
        </div>
        {story.caption && <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-12 text-sm text-white">{story.caption}</p>}
      </div>
    </div>,
    document.body
  );
}

export default function AdminStories() {
  const [status, setStatus] = useState<Status>('live');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.stories, { status, search, limit: 24 });
  const [open, setOpen] = useState<ManagedStory | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const s = data?.summary;

  const remove = async (st: ManagedStory) => {
    const ok = await confirmDialog({ title: 'Remove this story?', message: `It disappears for everyone right away. ${st.author?.name ?? 'The author'} isn’t notified.`, confirmLabel: 'Remove story', tone: 'danger' });
    if (!ok) return;
    setBusy(st._id);
    try {
      await manageApi.deleteStory(st._id);
      toast.success('Story removed');
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader icon={Aperture} eyebrow="Content & moderation" title="Stories" description="24-hour stories posted by creators and brands. Open any story to watch it, and remove anything that breaks the rules." />
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'Live right now', value: fmt.number(s?.live), tone: 'rose', onClick: () => setStatus('live'), active: status === 'live' },
          { label: 'Posted in last 24h', value: fmt.number(s?.last24h), tone: 'violet' },
          { label: 'Views on live stories', value: fmt.compact(s?.liveViews), tone: 'sky' },
          { label: 'Showing', value: fmt.number(data?.total), tone: 'gray', hint: status === 'live' ? 'Live stories' : status === 'expired' ? 'Expired stories' : 'All stories' },
        ]}
      />
      <Toolbar>
        <SearchInput value={term} onChange={setTerm} placeholder="Search caption or author…" />
        <FilterChips<Status>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'live', label: 'Live' },
            { value: 'expired', label: 'Expired' },
            { value: 'all', label: 'All' },
          ]}
        />
      </Toolbar>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : loading && !rows.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <EmptyState icon={Aperture} title="No stories" message={status === 'live' ? 'Nobody has a live story right now.' : 'No stories match this search.'} />
        </Card>
      ) : (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${loading ? 'opacity-60' : ''}`}>
          {rows.map((st) => {
            const expired = new Date(st.expiresAt).getTime() <= Date.now();
            return (
              <div key={st._id} className="rise group relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-900 shadow-[0_10px_30px_-18px_rgba(16,24,40,0.5)]">
                <button type="button" onClick={() => setOpen(st)} className="absolute inset-0" aria-label="Open story">
                  <img src={st.media.thumbnailUrl || st.media.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                </button>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75" />
                <Link to={st.author ? `/users/${st.author._id}` : '#'} className="absolute left-2.5 right-2.5 top-2.5 flex items-center gap-2 text-white">
                  <span className={`rounded-full p-[2px] ${expired ? 'bg-white/30' : 'bg-brand-gradient'}`}>
                    <Avatar name={st.author?.name} src={st.author?.avatarUrl} size={26} className="ring-2 ring-black/30" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{st.author?.name}</span>
                    <span className="block text-[10px] text-white/70">{fmt.ago(st.createdAt)}</span>
                  </span>
                </Link>
                {st.media.type === 'video' && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                    <Play size={16} weight="fill" />
                  </span>
                )}
                <div className="absolute inset-x-2.5 bottom-2.5 text-white">
                  {st.caption && <p className="mb-1.5 line-clamp-2 text-xs">{st.caption}</p>}
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1 text-white/85">
                      <Eye size={12} /> {fmt.compact(st.viewCount)}
                    </span>
                    <span className={expired ? 'text-white/60' : 'font-semibold text-emerald-300'}>{timeLeft(st.expiresAt)}</span>
                  </div>
                  <Button size="xs" variant="danger" className="mt-2 w-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100" loading={busy === st._id} onClick={() => remove(st)}>
                    <Trash2 size={12} /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="mt-5">
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      )}
      {open && <Viewer story={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

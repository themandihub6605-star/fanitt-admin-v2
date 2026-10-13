import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Flag, Star } from '@/icons';
import { Badge, Button, Card, DataTable, PageHeader, SearchInput, Select, confirmDialog, fmt, toast, type Column } from '@/components/AdminUI';
import { manageApi, type ManagedReview } from '@/services/manageApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { FilterChips, MissingBackend, Stars, StatStrip, UserCell, usePaged, useSearch } from './shared';

type Vis = 'visible' | 'hidden' | 'flagged' | 'all';
const SUB_LABEL: Record<string, string> = { communication: 'Communication', qualityOfWork: 'Quality of work', paymentExperience: 'Payment', professionalism: 'Professionalism' };

export default function AdminReviews() {
  const [params] = useSearchParams();
  const [visibility, setVisibility] = useState<Vis>(() => (['visible', 'hidden', 'flagged', 'all'].includes(params.get('visibility') || '') ? (params.get('visibility') as Vis) : 'visible'));
  const [rating, setRating] = useState('');
  const [related, setRelated] = useState('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.reviews, { visibility, rating, related, search });
  const [busy, setBusy] = useState<string | null>(null);
  const s = data?.summary;

  const toggle = async (r: ManagedReview) => {
    const hide = !r.isHidden;
    if (hide) {
      const ok = await confirmDialog({ title: 'Hide this review?', message: 'It disappears from the creator’s profile and stops counting toward their rating. You can show it again later.', confirmLabel: 'Hide review', tone: 'danger' });
      if (!ok) return;
    }
    setBusy(r._id);
    try {
      await manageApi.setReviewHidden(r._id, hide);
      toast.success(hide ? 'Review hidden' : 'Review is visible again');
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<ManagedReview>[] = [
    { key: 'from', header: 'From', value: (r) => r.fromUser?.name ?? '', render: (r) => <UserCell user={r.fromUser} /> },
    {
      key: 'review',
      header: 'Review',
      value: (r) => r.comment,
      render: (r) => (
        <div className="min-w-[260px] max-w-[460px]">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} />
            <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{r.rating}.0</span>
            {r.isFlagged && (
              <Badge tone="rose">
                <Flag size={10} /> Flagged
              </Badge>
            )}
            {r.isHidden && <Badge tone="gray">Hidden</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-gray-700 dark:text-white/75">{r.comment || <span className="text-gray-400">No written comment</span>}</p>
          {r.subRatings && Object.keys(r.subRatings).length > 0 && (
            <p className="mt-1 text-[11px] text-gray-400 dark:text-white/40">
              {Object.entries(r.subRatings)
                .filter(([, v]) => v)
                .map(([k, v]) => `${SUB_LABEL[k] ?? k} ${v}`)
                .join(' · ')}
            </p>
          )}
        </div>
      ),
    },
    { key: 'to', header: 'About', value: (r) => r.toUser?.name ?? '', render: (r) => <UserCell user={r.toUser} sub={r.relatedModel === 'Session' ? 'Session review' : 'Campaign review'} />, hideOnMobile: true },
    { key: 'date', header: 'Date', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt.date(r.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      render: (r) => (
        <Button size="xs" variant={r.isHidden ? 'outline' : 'danger'} loading={busy === r._id} onClick={() => toggle(r)}>
          {r.isHidden ? <Eye size={12} /> : <EyeOff size={12} />} {r.isHidden ? 'Show' : 'Hide'}
        </Button>
      ),
    },
  ];

  const total = s ? s.byRating.reduce((n, b) => n + b.count, 0) : 0;

  return (
    <div>
      <PageHeader icon={Star} eyebrow="Content & moderation" title="Reviews" description="Every rating fans and brands left on the platform. Hide abusive or fake reviews — they stop showing on the profile and stop counting toward the rating." />
      <MissingBackend show={missing} />

      <div className="mb-5 grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <StatStrip
          items={[
            { label: 'Visible reviews', value: fmt.number(s?.visible), tone: 'violet', onClick: () => setVisibility('visible'), active: visibility === 'visible' },
            { label: 'Average rating', value: s?.average ? `${s.average.toFixed(2)} ★` : '—', tone: 'amber' },
            { label: 'Hidden by admins', value: fmt.number(s?.hidden), tone: 'gray', onClick: () => setVisibility('hidden'), active: visibility === 'hidden' },
            { label: 'Flagged', value: fmt.number(s?.flagged), tone: 'rose', hint: 'Marked for review', onClick: () => setVisibility('flagged'), active: visibility === 'flagged' },
          ]}
        />
        <Card className="mb-5 p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Rating breakdown</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = s?.byRating.find((b) => b.rating === n)?.count ?? 0;
              return (
                <button key={n} type="button" onClick={() => setRating(rating === String(n) ? '' : String(n))} className="flex w-full items-center gap-2 text-xs">
                  <span className="w-6 font-semibold text-gray-600 dark:text-white/60">{n}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-700" style={{ width: `${total ? (c / total) * 100 : 0}%` }} />
                  </span>
                  <span className={`w-8 text-right tabular-nums ${rating === String(n) ? 'font-bold text-orange-600' : 'text-gray-500'}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={Star}
        emptyMessage={visibility === 'flagged' ? 'No flagged reviews. Reviews only get flagged when someone reports them.' : 'No reviews match these filters.'}
        exportName="reviews"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search text, reviewer or creator…" />
            <FilterChips<Vis>
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'visible', label: 'Visible' },
                { value: 'flagged', label: 'Flagged' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'all', label: 'All' },
              ]}
            />
            <Select label="Rating" value={rating} onChange={setRating} options={[{ value: '', label: 'Any rating' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` }))]} />
            <Select
              label="Type"
              value={related}
              onChange={setRelated}
              options={[
                { value: '', label: 'All types' },
                { value: 'Session', label: 'Session reviews' },
                { value: 'Campaign', label: 'Campaign reviews' },
              ]}
            />
          </>
        }
      />
    </div>
  );
}

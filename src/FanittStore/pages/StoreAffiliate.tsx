import { useState } from 'react';
import { EyeOff, Link2, MousePointerClick, RotateCcw, ExternalLink } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type AffiliateRow, type AffiliateStatus } from '../api';
import { ErrorBanner, Loading, Pagination, ReasonModal, SearchBox, Select, StatusBadge, dateTime, rupees, useDebounced, usePagedList } from '../ui';

type Filter = 'all' | AffiliateStatus;

export default function StoreAffiliate() {
  const [status, setStatus] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [removing, setRemoving] = useState<AffiliateRow | null>(null);
  const list = usePagedList<AffiliateRow>((page) => storeAdminApi.affiliate({ page, status, search: q }), [status, q]);

  const restore = async (p: AffiliateRow) => {
    if (!window.confirm('Restore this link? It comes back hidden — the creator decides when to show it.')) return;
    try {
      await storeAdminApi.restoreAffiliate(p._id);
      list.reload();
    } catch (err) {
      list.setError(getApiErrorMessage(err));
    }
  };

  return (
    <StoreLayout description="Products creators recommend from other shops. Clicks are tracked through Fanitt; merchants pay creators directly.">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search product, shop, link or creator…" />
        <Select<Filter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All links' },
            { value: 'active', label: 'Showing' },
            { value: 'hidden', label: 'Hidden by creator' },
            { value: 'removed', label: 'Removed by Fanitt' },
          ]}
        />
      </div>
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />

      {list.loading ? (
        <Loading text="Loading links…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{list.total.toLocaleString('en-IN')} links</p>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {list.items.length === 0 && <EmptyState icon={Link2} message="No affiliate links found." />}
            {list.items.map((p) => (
              <Card key={p._id} className="flex gap-4 p-4">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-white object-contain" />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300 dark:bg-white/5">
                    <Link2 size={22} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{p.title}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                    {p.merchant || 'Shop'} · {p.price != null ? rupees(p.price) : 'No price'} · {p.store?.name}
                  </p>
                  <a href={p.url} target="_blank" rel="noreferrer noopener" className="mt-1 flex items-center gap-1 truncate text-xs text-orange-600 hover:underline dark:text-orange-300">
                    <ExternalLink size={11} className="shrink-0" /> <span className="truncate">{p.url}</span>
                  </a>
                  {p.removedReason && <p className="mt-1 text-xs text-rose-500">Removed: {p.removedReason}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-white/65">
                      <MousePointerClick size={12} /> {p.clicks} clicks{p.lastClickedAt ? ` · last ${dateTime(p.lastClickedAt)}` : ''}
                    </span>
                    {p.status === 'removed' ? (
                      <Button size="sm" variant="outline" onClick={() => restore(p)}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setRemoving(p)}>
                        <EyeOff size={12} /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={list.page} pages={list.pages} onPage={list.goTo} />
        </>
      )}

      <ReasonModal
        open={Boolean(removing)}
        title="Remove affiliate link"
        hint="The link stops working and disappears from the store. The creator is notified with your reason."
        presets={['Misleading product link', 'Prohibited product', 'Link goes to an unsafe site', 'Spam']}
        confirmLabel="Remove"
        onClose={() => setRemoving(null)}
        onSubmit={async (reason) => {
          if (!removing) return;
          await storeAdminApi.removeAffiliate(removing._id, reason);
          list.reload();
        }}
      />
    </StoreLayout>
  );
}

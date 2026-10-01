import { useState } from 'react';
import { EyeOff, Package, RotateCcw } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type ProductRow, type ProductStatus } from '../api';
import { ErrorBanner, Loading, Pagination, ReasonModal, SearchBox, Select, StatusBadge, dateTime, fileSize, label, rupees, useDebounced, usePagedList } from '../ui';

type Filter = 'all' | ProductStatus;

export default function StoreProducts() {
  const [status, setStatus] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [removing, setRemoving] = useState<ProductRow | null>(null);
  const list = usePagedList<ProductRow>((page) => storeAdminApi.products({ page, status, search: q }), [status, q]);

  const restore = async (p: ProductRow) => {
    if (!window.confirm(`Restore "${p.title}"? It comes back unpublished — the creator decides when to publish it again.`)) return;
    try {
      await storeAdminApi.restoreProduct(p._id);
      list.reload();
    } catch (err) {
      list.setError(getApiErrorMessage(err));
    }
  };

  return (
    <StoreLayout description="Every digital product in creator stores. Take down anything that breaks the rules — buyers keep what they already bought.">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search title, creator name or email…" />
        <Select<Filter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All products' },
            { value: 'published', label: 'Live' },
            { value: 'draft', label: 'Drafts' },
            { value: 'unpublished', label: 'Hidden by creator' },
            { value: 'removed', label: 'Removed by Fanitt' },
          ]}
        />
      </div>
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />

      {list.loading ? (
        <Loading text="Loading products…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{list.total.toLocaleString('en-IN')} products</p>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {list.items.length === 0 && <EmptyState icon={Package} message="No products found." />}
            {list.items.map((p) => (
              <Card key={p._id} className="flex gap-4 p-4">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-white/20">
                    <Package size={22} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{p.title}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                    {p.store?.name} · {p.owner?.email}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-white/65">
                    <b>{p.price ? rupees(p.price) : 'Free'}</b> · {label(p.category)} · {p.fileCount} files ({fileSize(p.totalSize)}) · {p.salesCount} sold
                    {p.revenue ? ` · ${rupees(p.revenue)}` : ''}
                  </p>
                  {p.removedReason && <p className="mt-1 text-xs text-rose-500">Removed: {p.removedReason}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400 dark:text-white/40">Added {dateTime(p.createdAt)}</span>
                    {p.status === 'removed' ? (
                      <Button size="sm" variant="outline" onClick={() => restore(p)}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setRemoving(p)}>
                        <EyeOff size={12} /> Take down
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
        title={`Take down "${removing?.title || ''}"`}
        hint="It disappears from the store. People who bought it keep access. The creator is notified with your reason."
        presets={['Copyright complaint', 'Misleading description', 'Prohibited content', 'Files are broken or empty']}
        confirmLabel="Take down"
        onClose={() => setRemoving(null)}
        onSubmit={async (reason) => {
          if (!removing) return;
          await storeAdminApi.removeProduct(removing._id, reason);
          list.reload();
        }}
      />
    </StoreLayout>
  );
}

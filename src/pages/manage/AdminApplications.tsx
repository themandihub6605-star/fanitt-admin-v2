import { useState } from 'react';
import { Briefcase, ExternalLink } from '@/icons';
import { DataTable, Drawer, PageHeader, SearchInput, StatusBadge, fmt, type Column } from '@/components/AdminUI';
import { manageApi, type ManagedApplication } from '@/services/manageApi';
import { FilterChips, MissingBackend, StatStrip, UserCell, usePaged, useSearch } from './shared';

type Status = '' | 'pending' | 'accepted' | 'rejected';

export default function AdminApplications() {
  const [status, setStatus] = useState<Status>('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.applications, { status, search });
  const [open, setOpen] = useState<ManagedApplication | null>(null);
  const s = data?.summary;
  const total = s ? s.pending + s.accepted + s.rejected : 0;

  const columns: Column<ManagedApplication>[] = [
    { key: 'creator', header: 'Creator', value: (r) => r.creator?.user?.name ?? '', render: (r) => <UserCell user={r.creator?.user ?? null} sub={r.creator?.followerCount != null ? `${fmt.compact(r.creator.followerCount)} followers` : undefined} /> },
    {
      key: 'campaign',
      header: 'Campaign',
      value: (r) => r.campaign?.title ?? '',
      render: (r) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900 dark:text-white">{r.campaign?.title ?? 'Deleted campaign'}</p>
          <p className="text-xs text-gray-400">
            {r.campaign?.brand?.companyName ?? '—'} · budget {fmt.rupeesCompact(r.campaign?.budget)}
          </p>
        </div>
      ),
    },
    { key: 'quote', header: 'Quote (₹)', align: 'right', value: (r) => (r.quotedAmount ?? r.campaign?.budget ?? 0) / 100, render: (r) => (r.quotedAmount ? <span className="font-semibold">{fmt.rupees(r.quotedAmount)}</span> : <span className="text-xs text-gray-400">Posted budget</span>) },
    { key: 'timeline', header: 'Delivery', value: (r) => r.deliveryTimeline, hideOnMobile: true, render: (r) => <span className="text-xs text-gray-600 dark:text-white/60">{r.deliveryTimeline || '—'}</span> },
    { key: 'status', header: 'Status', value: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Applied', value: (r) => r.createdAt, hideOnMobile: true, render: (r) => <span className="text-xs text-gray-500">{fmt.date(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader icon={Briefcase} eyebrow="Campaigns" title="Campaign applications" description="Every creator pitch on a brand campaign: the quote, delivery time, portfolio and what the brand decided." />
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'All applications', value: fmt.number(total), tone: 'violet', onClick: () => setStatus(''), active: status === '' },
          { label: 'Waiting for brand', value: fmt.number(s?.pending), tone: 'amber', onClick: () => setStatus('pending'), active: status === 'pending' },
          { label: 'Accepted', value: fmt.number(s?.accepted), tone: 'emerald', hint: total ? `${Math.round(((s?.accepted ?? 0) / total) * 100)}% acceptance` : undefined, onClick: () => setStatus('accepted'), active: status === 'accepted' },
          { label: 'Rejected', value: fmt.number(s?.rejected), tone: 'rose', onClick: () => setStatus('rejected'), active: status === 'rejected' },
        ]}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={setOpen}
        emptyIcon={Briefcase}
        emptyMessage="No applications match these filters."
        exportName="campaign-applications"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search creator, campaign or pitch…" />
            <FilterChips<Status>
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </>
        }
      />
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.campaign?.title ?? 'Application'} subtitle={open ? `${open.campaign?.brand?.companyName ?? ''} · applied ${fmt.date(open.createdAt)}` : undefined} width="max-w-lg">
        {open && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <UserCell user={open.creator?.user ?? null} />
              <StatusBadge status={open.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] text-gray-400">Quote</p>
                <p className="font-bold">{open.quotedAmount ? fmt.rupees(open.quotedAmount) : `Accepts ${fmt.rupees(open.campaign?.budget)}`}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] text-gray-400">Delivery</p>
                <p className="font-bold">{open.deliveryTimeline || '—'}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Pitch</p>
              <p className="whitespace-pre-wrap rounded-xl border border-gray-100 p-3 text-sm text-gray-700 dark:border-white/10 dark:text-white/80">{open.pitch || 'No pitch written.'}</p>
            </div>
            {open.portfolioLinks?.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Portfolio</p>
                <div className="space-y-1.5">
                  {open.portfolioLinks.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-sm text-orange-600 hover:underline dark:text-orange-300">
                      <ExternalLink size={13} /> {l}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(open.rejectionReason || open.feedback) && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Brand’s note</p>
                <p className="text-sm text-gray-700 dark:text-white/80">{open.rejectionReason || open.feedback}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

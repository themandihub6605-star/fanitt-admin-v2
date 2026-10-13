import { History } from '@/icons';
import { Badge, DataTable, Section, fmt, type Column } from '@/components/AdminUI';
import { manageApi, type DisputeHistoryRow } from '@/services/manageApi';
import { UserCell, usePaged } from '@/pages/manage/shared';

const OUTCOME_TONE: Record<string, 'emerald' | 'rose' | 'amber' | 'gray'> = { creator: 'emerald', release: 'emerald', brand: 'rose', refund: 'rose', partial: 'amber' };

/** Resolved milestone disputes — what was decided and who decided it. */
export function DisputeHistory() {
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.disputeHistory, {});
  if (missing) return null;
  const columns: Column<DisputeHistoryRow>[] = [
    {
      key: 'campaign',
      header: 'Campaign · milestone',
      value: (r) => r.campaign?.title ?? '',
      render: (r) => (
        <div className="min-w-[200px]">
          <p className="font-medium text-gray-900 dark:text-white">{r.campaign?.title ?? '—'}</p>
          <p className="text-xs text-gray-400">
            {r.milestone?.title ?? '—'} · {fmt.rupees(r.milestone?.amount)}
          </p>
        </div>
      ),
    },
    { key: 'raised', header: 'Raised by', value: (r) => r.raisedBy?.name ?? '', hideOnMobile: true, render: (r) => <UserCell user={r.raisedBy ?? null} size={26} sub={r.campaign?.brand?.companyName} /> },
    {
      key: 'outcome',
      header: 'Decision',
      value: (r) => r.resolution?.outcome ?? r.status,
      render: (r) => (
        <div>
          <Badge tone={OUTCOME_TONE[r.resolution?.outcome ?? ''] ?? 'gray'}>{fmt.label(r.resolution?.outcome ?? r.status)}</Badge>
          <p className="mt-1 text-[11px] text-gray-400">
            Creator {fmt.rupees(r.resolution?.creatorAmount ?? 0)} · Brand refund {fmt.rupees(r.resolution?.brandRefundAmount ?? 0)}
          </p>
        </div>
      ),
    },
    { key: 'notes', header: 'Admin note', value: (r) => r.resolution?.adminNotes ?? '', hideOnMobile: true, render: (r) => <span className="line-clamp-2 max-w-[260px] text-xs text-gray-600 dark:text-white/60">{r.resolution?.adminNotes || '—'}</span> },
    { key: 'when', header: 'Decided', value: (r) => r.resolution?.resolvedAt ?? '', render: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt.date(r.resolution?.resolvedAt)}{r.resolution?.resolvedBy?.name ? ` · ${r.resolution.resolvedBy.name}` : ''}</span> },
  ];
  return (
    <Section title="Decided disputes" description="Every dispute that was already resolved, newest first" className="mt-10">
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={History}
        emptyMessage="No disputes have been decided yet."
        exportName="dispute-history"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
      />
    </Section>
  );
}

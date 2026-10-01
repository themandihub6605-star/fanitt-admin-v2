import { useEffect, useState } from 'react';
import { Eye, Radio, Square, Ticket, Users2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/AdminUI';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type LiveRow, type LiveStatus } from '../api';
import { ErrorBanner, Loading, Pagination, ReasonModal, Select, StatusBadge, dateTime, label, rupees, usePagedList } from '../ui';

type Filter = 'all' | LiveStatus;

export default function StoreLives() {
  const [status, setStatus] = useState<Filter>('live');
  const [stopping, setStopping] = useState<LiveRow | null>(null);
  const list = usePagedList<LiveRow>((page) => storeAdminApi.lives({ page, status }), [status]);

  // Live viewer counts change by the second — refresh while watching "Live now".
  useEffect(() => {
    if (status !== 'live') return undefined;
    const id = window.setInterval(list.reload, 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <StoreLayout description="Live streams from creator stores. Stopping a running live ends it for everyone; stopping a scheduled one cancels it and refunds every ticket.">
      <Select<Filter>
        value={status}
        onChange={setStatus}
        options={[
          { value: 'live', label: 'Live now' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'ended', label: 'Ended' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'all', label: 'All' },
        ]}
      />
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />

      {list.loading ? (
        <Loading text="Loading lives…" />
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {list.items.length === 0 && <EmptyState icon={Radio} message={status === 'live' ? 'Nobody is live right now.' : 'No lives here.'} />}
            {list.items.map((l) => (
              <Card key={l._id} className="flex gap-4 p-4">
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20">
                  {l.coverUrl && <img src={l.coverUrl} alt="" className="h-full w-full object-cover" />}
                  {l.status === 'live' && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{l.title}</p>
                    <StatusBadge status={l.status} />
                    <Badge tone={l.visibility === 'public' ? 'emerald' : 'gray'}>{l.visibility === 'public' ? 'Public' : `Private · ${label(l.privateMode || '')}`}</Badge>
                    {l.endedByAdmin && <Badge tone="rose">Stopped by admin</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                    {l.store?.name} · {l.host?.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-600 dark:text-white/65">
                    <span className="flex items-center gap-1"><Eye size={12} /> {l.stats.currentViewers} now · peak {l.stats.peakViewers}</span>
                    <span className="flex items-center gap-1"><Users2 size={12} /> {l.stats.totalJoins} joins</span>
                    <span className="flex items-center gap-1"><Ticket size={12} /> {l.price ? `${l.stats.ticketsSold} × ${rupees(l.price)}` : 'Free'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400 dark:text-white/40">
                      {l.status === 'scheduled' ? `Starts ${dateTime(l.scheduledAt)}` : l.startedAt ? `Started ${dateTime(l.startedAt)}` : `Created ${dateTime(l.createdAt)}`}
                    </span>
                    {(l.status === 'live' || l.status === 'scheduled') && (
                      <Button size="sm" variant="danger" onClick={() => setStopping(l)}>
                        <Square size={12} /> {l.status === 'live' ? 'Stop live' : 'Cancel'}
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
        open={Boolean(stopping)}
        title={stopping?.status === 'live' ? 'Stop this live' : 'Cancel this live'}
        hint={stopping?.status === 'live' ? 'Everyone is disconnected right away. The creator is notified.' : 'Every ticket is refunded in full. The creator is notified.'}
        presets={['Breaks community guidelines', 'Reported by viewers', 'Copyrighted content']}
        confirmLabel={stopping?.status === 'live' ? 'Stop live' : 'Cancel live'}
        onClose={() => setStopping(null)}
        onSubmit={async (reason) => {
          if (!stopping) return;
          await storeAdminApi.stopLive(stopping._id, reason);
          list.reload();
        }}
      />
    </StoreLayout>
  );
}

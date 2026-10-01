import { useState } from 'react';
import { PhoneCall, PhoneOff, Video } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type CallRow, type CallStatus } from '../api';
import { ErrorBanner, Loading, Pagination, Select, StatusBadge, dateTime, label, rupees, usePagedList } from '../ui';

type Filter = 'all' | CallStatus;
const OPEN: CallStatus[] = ['awaiting_payment', 'requested', 'active'];

export default function StoreCalls() {
  const [status, setStatus] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = usePagedList<CallRow>((page) => storeAdminApi.calls({ page, status }), [status]);

  const end = async (c: CallRow) => {
    const text =
      c.status === 'active'
        ? 'End this call now? The caller is charged only for the minutes used and gets the rest back in their wallet.'
        : 'Cancel this call request? The caller gets their money back in their wallet.';
    if (!window.confirm(text)) return;
    setBusyId(c._id);
    try {
      await storeAdminApi.endCall(c._id);
      list.reload();
    } catch (err) {
      list.setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <StoreLayout description="1-to-1 paid and free calls. Calls are billed per started minute once both people join; unused minutes go back to the caller's wallet.">
      <Select<Filter>
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'All calls' },
          { value: 'active', label: 'In progress' },
          { value: 'requested', label: 'Ringing' },
          { value: 'completed', label: 'Completed' },
          { value: 'missed', label: 'Missed' },
          { value: 'declined', label: 'Declined' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />

      {list.loading ? (
        <Loading text="Loading calls…" />
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {list.items.length === 0 && <EmptyState icon={PhoneCall} message="No calls here." />}
            {list.items.map((c) => (
              <Card key={c._id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                  {c.type === 'video' ? <Video size={18} /> : <PhoneCall size={18} />}
                </span>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {c.caller?.name} → {c.host?.name}
                    </p>
                    <StatusBadge status={c.status} />
                    <Badge tone="gray">{label(c.type)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                    {c.ratePerMinute ? `${rupees(c.ratePerMinute)}/min × ${c.prepaidMinutes} min prepaid (${rupees(c.prepaidAmount)})` : `Free · ${c.prepaidMinutes} min`}
                    {c.endReason ? ` · ${label(c.endReason)}` : ''}
                  </p>
                  {c.note && <p className="mt-0.5 max-w-xl truncate text-xs italic text-gray-400">“{c.note}”</p>}
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-white/55">
                  <p>
                    Billed <b className="text-gray-900 dark:text-white">{c.billedMinutes} min · {rupees(c.billedAmount)}</b>
                  </p>
                  <p>
                    Refunded {rupees(c.refundedAmount)} · creator {rupees(c.creatorEarning)}
                  </p>
                  <p className="text-[11px] text-gray-400">{dateTime(c.requestedAt || c.createdAt)}</p>
                </div>
                {OPEN.includes(c.status) && (
                  <Button size="sm" variant="danger" onClick={() => end(c)} disabled={busyId === c._id}>
                    <PhoneOff size={12} /> {c.status === 'active' ? 'End call' : 'Cancel'}
                  </Button>
                )}
              </Card>
            ))}
          </div>
          <Pagination page={list.page} pages={list.pages} onPage={list.goTo} />
        </>
      )}
    </StoreLayout>
  );
}

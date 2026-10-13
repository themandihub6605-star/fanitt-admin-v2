import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CalendarClock, Copy, Ticket, Users2 } from '@/icons';
import { Badge, Button, DataTable, Dialog, Drawer, LoadingState, Notice, PageHeader, SearchInput, StatusBadge, Tab, TabGroup, fmt, promptDialog, toast, type Column } from '@/components/AdminUI';
import { manageApi, type CancelResult, type ManagedBooking, type ManagedSession } from '@/services/manageApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { FilterChips, MissingBackend, StatStrip, UserCell, usePaged, useSearch } from './shared';

type SStatus = 'upcoming' | 'live' | 'completed' | 'cancelled' | 'all';
type BStatus = '' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

function sessionState(s: ManagedSession) {
  if (s.isCancelled) return <Badge tone="gray">Cancelled</Badge>;
  if (s.isLive)
    return (
      <Badge tone="rose">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-rose-500" /> Live
      </Badge>
    );
  if (s.isCompleted || new Date(s.scheduledAt).getTime() < Date.now()) return <Badge tone="emerald">Done</Badge>;
  return <Badge tone="sky">Upcoming</Badge>;
}

function RefundDialog({ result, onClose }: { result: CancelResult | null; onClose: () => void }) {
  if (!result) return null;
  const total = result.toRefund.reduce((n, r) => n + r.amount, 0);
  return (
    <Dialog open onClose={onClose} title="Session cancelled" description={`“${result.session.title}” — ${result.cancelledBookings} booking${result.cancelledBookings === 1 ? '' : 's'} cancelled, ${result.notified} people notified.`} width="max-w-lg" footer={<Button onClick={onClose}>Done</Button>}>
      {result.toRefund.length === 0 ? (
        <Notice tone="success">No one had paid for this session, so there’s nothing to refund.</Notice>
      ) : (
        <>
          <Notice tone="warning" className="mb-3">
            Refunds aren’t automatic on this backend. Refund these {result.toRefund.length} payment{result.toRefund.length === 1 ? '' : 's'} ({fmt.rupees(total)}) from the Razorpay dashboard.
          </Notice>
          <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
            {result.toRefund.map((r) => (
              <div key={r.bookingId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{r.user?.name ?? 'Unknown'}</p>
                  <p className="truncate text-xs text-gray-400">{r.user?.email}</p>
                </div>
                <span className="font-semibold tabular-nums">{fmt.rupees(r.amount)}</span>
                {r.razorpayPaymentId ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-white/70"
                    onClick={() => navigator.clipboard?.writeText(r.razorpayPaymentId).then(() => toast.success('Payment ID copied'), () => {})}
                  >
                    {r.razorpayPaymentId} <Copy size={10} />
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400">No payment ID</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

function SessionDrawer({ session, onClose, onCancel }: { session: ManagedSession | null; onClose: () => void; onCancel: (s: ManagedSession) => void }) {
  const [bookings, setBookings] = useState<ManagedBooking[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    setBookings(null);
    setError('');
    manageApi
      .sessionBookings(session._id)
      .then(setBookings)
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [session]);
  return (
    <Drawer
      open={!!session}
      onClose={onClose}
      title={session?.title ?? ''}
      subtitle={session ? [fmt.dateTime(session.scheduledAt), session.durationMinutes ? `${session.durationMinutes} min` : '', session.type ? fmt.label(session.type) : ''].filter(Boolean).join(' · ') : undefined}
      footer={
        session && !session.isCancelled ? (
          <Button variant="danger" onClick={() => onCancel(session)}>
            <Ban size={14} /> Cancel session
          </Button>
        ) : undefined
      }
    >
      {session && (
        <div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { l: 'Booked', v: fmt.number(session.stats.booked) },
              { l: 'Price', v: session.price ? fmt.rupees(session.price) : 'Free' },
              { l: 'Collected', v: fmt.rupees(session.stats.revenue) },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] text-gray-400">{x.l}</p>
                <p className="mt-0.5 font-bold tabular-nums text-gray-950 dark:text-white">{x.v}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Host</p>
          <div className="mb-5">
            <UserCell user={session.creator?.user ?? null} />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Bookings</p>
          {error ? (
            <Notice tone="error">{error}</Notice>
          ) : !bookings ? (
            <LoadingState rows={4} />
          ) : !bookings.length ? (
            <p className="py-6 text-center text-sm text-gray-400">No one has booked this session yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
              {bookings.map((b) => (
                <div key={b._id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <UserCell user={b.user} size={26} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{b.amountPaid ? fmt.rupees(b.amountPaid) : 'Free'}</span>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function SessionsTab() {
  const [status, setStatus] = useState<SStatus>('upcoming');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.sessions, { status, search });
  const [open, setOpen] = useState<ManagedSession | null>(null);
  const [result, setResult] = useState<CancelResult | null>(null);
  const s = data?.summary;

  const cancel = async (session: ManagedSession) => {
    const reason = await promptDialog({
      title: `Cancel “${session.title}”?`,
      message: `${session.stats.booked} booking${session.stats.booked === 1 ? '' : 's'} will be cancelled. Everyone who booked and the creator get a notification and an email.`,
      confirmLabel: 'Cancel session',
      tone: 'danger',
      input: { label: 'Reason (shown to them)', placeholder: 'e.g. The creator is unwell', multiline: true },
    });
    if (reason === null) return;
    try {
      const r = await manageApi.cancelSession(session._id, reason);
      setOpen(null);
      setResult(r);
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const columns: Column<ManagedSession>[] = [
    {
      key: 'title',
      header: 'Session',
      value: (r) => r.title,
      render: (r) => (
        <div className="min-w-[200px]">
          <p className="font-medium text-gray-900 dark:text-white">{r.title}</p>
          <p className="text-xs text-gray-400">{[r.type ? fmt.label(r.type) : 'Session', r.durationMinutes ? `${r.durationMinutes} min` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'host', header: 'Host', value: (r) => r.creator?.user?.name ?? '', render: (r) => <UserCell user={r.creator?.user ?? null} size={26} />, hideOnMobile: true },
    { key: 'when', header: 'When', value: (r) => r.scheduledAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-600 dark:text-white/70">{fmt.dateTime(r.scheduledAt)}</span> },
    { key: 'state', header: 'Status', render: sessionState },
    { key: 'booked', header: 'Booked', align: 'right', value: (r) => r.stats.booked, render: (r) => <span className="tabular-nums">{r.stats.booked}{r.maxParticipants ? <span className="text-gray-400">/{r.maxParticipants}</span> : null}</span> },
    { key: 'revenue', header: 'Collected (₹)', align: 'right', value: (r) => r.stats.revenue / 100, render: (r) => <span className="font-semibold">{fmt.rupees(r.stats.revenue)}</span> },
  ];

  return (
    <>
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'Upcoming', value: fmt.number(s?.upcoming), tone: 'sky', onClick: () => setStatus('upcoming'), active: status === 'upcoming' },
          { label: 'Live now', value: fmt.number(s?.live), tone: 'rose', onClick: () => setStatus('live'), active: status === 'live' },
          { label: 'Cancelled', value: fmt.number(s?.cancelled), tone: 'gray', onClick: () => setStatus('cancelled'), active: status === 'cancelled' },
          { label: 'Showing', value: fmt.number(data?.total), tone: 'violet' },
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
        emptyIcon={CalendarClock}
        emptyMessage="No sessions match these filters."
        exportName="sessions"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search title or host…" />
            <FilterChips<SStatus>
              value={status}
              onChange={setStatus}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'live', label: 'Live' },
                { value: 'completed', label: 'Done' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'all', label: 'All' },
              ]}
            />
          </>
        }
      />
      <SessionDrawer session={open} onClose={() => setOpen(null)} onCancel={cancel} />
      <RefundDialog result={result} onClose={() => setResult(null)} />
    </>
  );
}

function BookingsTab() {
  const [status, setStatus] = useState<BStatus>('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.bookings, { status, search });
  const s = data?.summary;
  const columns: Column<ManagedBooking>[] = [
    { key: 'user', header: 'Booked by', value: (r) => r.user?.name ?? '', render: (r) => <UserCell user={r.user} size={26} /> },
    {
      key: 'session',
      header: 'Session',
      value: (r) => r.session?.title ?? '',
      render: (r) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900 dark:text-white">{r.session?.title ?? 'Deleted session'}</p>
          <p className="text-xs text-gray-400">
            with {r.session?.creator?.user?.name ?? '—'} · {fmt.dateTime(r.session?.scheduledAt)}
          </p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', value: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'booked', header: 'Booked on', value: (r) => r.createdAt, hideOnMobile: true, render: (r) => <span className="text-xs text-gray-500">{fmt.date(r.createdAt)}</span> },
    { key: 'amount', header: 'Paid (₹)', align: 'right', value: (r) => r.amountPaid / 100, render: (r) => <span className="font-semibold">{r.amountPaid ? fmt.rupees(r.amountPaid) : 'Free'}</span> },
  ];
  return (
    <>
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'Confirmed', value: fmt.number(s?.confirmed), tone: 'emerald', onClick: () => setStatus('confirmed'), active: status === 'confirmed' },
          { label: 'Cancelled', value: fmt.number(s?.cancelled), tone: 'gray', onClick: () => setStatus('cancelled'), active: status === 'cancelled' },
          { label: 'Paid for sessions', value: fmt.rupeesCompact(s?.paid), tone: 'violet', hint: 'Confirmed + completed' },
          { label: 'Showing', value: fmt.number(data?.total), tone: 'sky' },
        ]}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={Ticket}
        emptyMessage="No bookings match these filters."
        exportName="bookings"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search the person who booked…" />
            <FilterChips<BStatus>
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'All' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </>
        }
      />
    </>
  );
}

export default function AdminSessions() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'bookings' ? 'bookings' : 'sessions';
  return (
    <div>
      <PageHeader icon={CalendarClock} eyebrow="Content & moderation" title="Sessions & bookings" description="Every 1:1 and group session creators host, who booked them and what was paid. Cancelling a session tells everyone and lists who needs a refund." />
      <TabGroup className="mb-5">
        <Tab groupId="sess-tabs" active={tab === 'sessions'} onClick={() => setParams({})}>
          <CalendarClock size={14} /> Sessions
        </Tab>
        <Tab groupId="sess-tabs" active={tab === 'bookings'} onClick={() => setParams({ tab: 'bookings' })}>
          <Users2 size={14} /> Bookings
        </Tab>
      </TabGroup>
      {tab === 'sessions' ? <SessionsTab /> : <BookingsTab />}
    </div>
  );
}

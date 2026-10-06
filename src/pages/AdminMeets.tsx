import { useEffect, useState } from 'react';
import { CalendarClock, Clock, EyeOff, Info, Mic, Radio, Square, Ticket, Users2, Video, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Tab, TabGroup } from '@/components/AdminUI';
import { MeetRoomViewer } from '@/components/MeetRoomViewer';
import { getApiErrorMessage } from '@/services/apiClient';
import { meetAdminApi, type JoinMode, type MeetDetail, type MeetFilter, type MeetRow, type MeetStatus } from '@/services/meetAdminApi';
import { ErrorBanner, Loading, Modal, Pagination, ReasonModal, SearchBox, dateTime, rupees, useDebounced } from '@/FanittStore/ui';

// Live Sessions (Virtual Meets) — every meet creators host in the app.
// Admin can watch any running meet silently or join and speak, remove
// people, end a running meet, or cancel an upcoming one.

const FILTERS: { value: MeetFilter; label: string }[] = [
  { value: 'live', label: 'Live now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

const STATUS: Record<MeetStatus, { label: string; tone: 'rose' | 'sky' | 'amber' | 'gray' | 'emerald' }> = {
  live: { label: '● Live', tone: 'rose' },
  upcoming: { label: 'Upcoming', tone: 'sky' },
  late: { label: 'Not started yet', tone: 'amber' },
  missed: { label: 'Never started', tone: 'gray' },
  completed: { label: 'Completed', tone: 'emerald' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
};

function MeetStatusBadge({ status }: { status: MeetStatus }) {
  const s = STATUS[status] || STATUS.upcoming;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const canCancel = (m: MeetRow) => m.status === 'upcoming' || m.status === 'late';

type Action = { kind: 'end' | 'cancel'; meet: MeetRow } | null;

export default function AdminMeets() {
  const [filter, setFilter] = useState<MeetFilter>('live');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: MeetRow[]; total: number; pages: number; liveNow: number }>({ items: [], total: 0, pages: 1, liveNow: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState<Action>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [room, setRoom] = useState<{ meet: MeetRow; mode: JoinMode } | null>(null);

  const load = async (p: number, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const res = await meetAdminApi.list({ page: p, status: filter, search: q });
      setData(res);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q]);

  // Live rooms change quickly — refresh while looking at "Live now".
  useEffect(() => {
    if (filter !== 'live' || room) return undefined;
    const id = window.setInterval(() => load(page, true), 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, room, q]);

  const goTo = (p: number) => {
    setPage(p);
    load(p);
  };

  const openRoom = (meet: MeetRow, mode: JoinMode) => {
    setDetailId(null);
    setRoom({ meet, mode });
  };

  return (
    <div>
      <PageHeader
        title="Live Sessions"
        description="Every virtual meet creators host in the app. Watch any live meet silently, join and talk, remove someone, or stop a meet."
        actions={
          data.liveNow > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {data.liveNow} live now
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabGroup>
          {FILTERS.map((f) => (
            <Tab key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)} groupId="meets">
              {f.value === 'live' && <Radio size={13} />}
              {f.label}
            </Tab>
          ))}
        </TabGroup>
        <SearchBox value={search} onChange={setSearch} placeholder="Search by title or creator name / email" />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {loading ? (
        <Loading text="Loading meets…" />
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {data.items.length === 0 && (
              <EmptyState icon={Video} message={filter === 'live' ? 'No meet is live right now.' : q ? 'No meets match your search.' : 'No meets here yet.'} />
            )}
            {data.items.map((m) => (
              <Card key={m._id} className="flex gap-4 p-4">
                <button onClick={() => setDetailId(m._id)} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20">
                  {m.coverImageUrl ? <img src={m.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <Video size={26} className="absolute inset-0 m-auto text-orange-400/70" />}
                  {m.status === 'live' && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button onClick={() => setDetailId(m._id)} className="truncate text-left font-semibold text-gray-900 hover:text-orange-600 dark:text-white dark:hover:text-orange-300">
                      {m.title}
                    </button>
                    <MeetStatusBadge status={m.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-white/50">
                    {m.host.name || 'Creator'}
                    {m.host.email ? ` · ${m.host.email}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-600 dark:text-white/65">
                    <span className="flex items-center gap-1">
                      <CalendarClock size={12} /> {dateTime(m.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {m.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users2 size={12} /> {m.bookedCount}/{m.maxParticipants}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ticket size={12} /> {m.price > 0 ? rupees(m.price) : 'Free'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {m.status === 'live' && (
                      <>
                        <Button size="sm" onClick={() => openRoom(m, 'silent')}>
                          <EyeOff size={12} /> Watch silently
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openRoom(m, 'speak')}>
                          <Mic size={12} /> Join & speak
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setAction({ kind: 'end', meet: m })}>
                          <Square size={12} /> End
                        </Button>
                      </>
                    )}
                    {canCancel(m) && (
                      <Button size="sm" variant="danger" onClick={() => setAction({ kind: 'cancel', meet: m })}>
                        <XCircle size={12} /> Cancel meet
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(m._id)}>
                      <Info size={12} /> Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} pages={data.pages} onPage={goTo} />
        </>
      )}

      <MeetDetailModal
        id={detailId}
        onClose={() => setDetailId(null)}
        onJoin={openRoom}
        onAction={(a) => {
          setDetailId(null);
          setAction(a);
        }}
      />

      <ReasonModal
        open={Boolean(action)}
        title={action?.kind === 'end' ? 'End this meet' : 'Cancel this meet'}
        hint={
          action?.kind === 'end'
            ? 'Everyone is disconnected right away. The creator is notified with your reason.'
            : 'The creator and everyone who booked are notified. Paid bookings are not refunded automatically.'
        }
        presets={['Breaks community guidelines', 'Reported by attendees', 'Creator asked us to cancel']}
        confirmLabel={action?.kind === 'end' ? 'End meet' : 'Cancel meet'}
        onClose={() => setAction(null)}
        onSubmit={async (reason) => {
          if (!action) return;
          if (action.kind === 'end') await meetAdminApi.end(action.meet._id, reason);
          else await meetAdminApi.cancel(action.meet._id, reason);
          load(page, true);
        }}
      />

      {room && (
        <MeetRoomViewer
          meet={room.meet}
          mode={room.mode}
          onClose={() => {
            setRoom(null);
            load(page, true);
          }}
          onEnd={async (reason) => {
            await meetAdminApi.end(room.meet._id, reason);
          }}
        />
      )}
    </div>
  );
}

function MeetDetailModal({
  id,
  onClose,
  onJoin,
  onAction,
}: {
  id: string | null;
  onClose: () => void;
  onJoin: (meet: MeetRow, mode: JoinMode) => void;
  onAction: (a: Action) => void;
}) {
  const [detail, setDetail] = useState<MeetDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDetail(null);
    setError('');
    meetAdminApi
      .detail(id)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setError(getApiErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const m = detail?.meet;

  return (
    <Modal open={Boolean(id)} title={m?.title || 'Meet details'} subtitle={m ? `${m.host.name || 'Creator'} · ${dateTime(m.scheduledAt)}` : undefined} onClose={onClose} wide>
      <ErrorBanner message={error} />
      {!detail && !error && <Loading text="Loading…" />}
      {detail && m && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <MeetStatusBadge status={m.status} />
            <Badge tone={m.price > 0 ? 'orange' : 'emerald'}>{m.price > 0 ? rupees(m.price) : 'Free'}</Badge>
            <Badge>{m.durationMinutes} min</Badge>
            <span className="text-xs text-gray-500 dark:text-white/50">Ends {dateTime(m.endsAt)}</span>
          </div>
          {m.description && <p className="text-sm text-gray-600 dark:text-white/70">{m.description}</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Booked', value: `${detail.stats.booked}/${m.maxParticipants}` },
              { label: 'Payment pending', value: String(detail.stats.pending) },
              { label: 'Collected', value: rupees(detail.stats.revenue) },
              { label: 'In the room now', value: m.status === 'live' ? String(detail.stats.inRoom) : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-white/50">{s.label}</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {(m.status === 'live' || canCancel(m)) && (
            <div className="flex flex-wrap gap-2">
              {m.status === 'live' && (
                <>
                  <Button onClick={() => onJoin(m, 'silent')}>
                    <EyeOff size={14} /> Watch silently
                  </Button>
                  <Button variant="outline" onClick={() => onJoin(m, 'speak')}>
                    <Mic size={14} /> Join & speak
                  </Button>
                  <Button variant="danger" onClick={() => onAction({ kind: 'end', meet: m })}>
                    <Square size={14} /> End meet
                  </Button>
                </>
              )}
              {canCancel(m) && (
                <Button variant="danger" onClick={() => onAction({ kind: 'cancel', meet: m })}>
                  <XCircle size={14} /> Cancel meet
                </Button>
              )}
            </div>
          )}

          {m.status === 'live' && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">In the room ({detail.participants.filter((p) => !p.hidden).length})</h3>
              {detail.participants.filter((p) => !p.hidden).length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-white/50">Nobody is in the room right now.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.participants
                    .filter((p) => !p.hidden)
                    .map((p) => (
                      <span key={p.identity} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-white/80">
                        {p.name}
                        {p.role === 'host' && <span className="text-[10px] text-amber-600 dark:text-amber-300">HOST</span>}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Bookings ({detail.bookings.length})</h3>
            {detail.bookings.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-white/50">No one has booked this meet yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/10">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-white/50">
                    <tr>
                      <th className="px-3 py-2">Person</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Paid</th>
                      <th className="px-3 py-2">Booked on</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {detail.bookings.map((b) => (
                      <tr key={b._id}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-900 dark:text-white">{b.user?.name || 'Deleted user'}</p>
                          <p className="text-xs text-gray-500 dark:text-white/50">{b.user?.email}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={b.status === 'confirmed' || b.status === 'completed' ? 'emerald' : b.status === 'pending' ? 'amber' : 'gray'}>{b.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-white/80">{b.amountPaid > 0 ? rupees(b.amountPaid) : 'Free'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/50">{dateTime(b.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
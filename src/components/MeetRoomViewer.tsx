import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
} from 'livekit-client';
import { Crown, EyeOff, Loader2, LogOut, Mic, MicOff, MonitorUp, Square, UserMinus, Users2, Video, VideoOff, Volume2, X } from 'lucide-react';
import { getApiErrorMessage } from '@/services/apiClient';
import { meetAdminApi, type JoinMode, type MeetRow } from '@/services/meetAdminApi';
import { cn } from '@/utils/cn';

// Full-screen LiveKit room for admins. "silent" = hidden, listen + watch only.
// "speak" = joins as "Fanitt Admin" and can turn on mic / camera.

type Phase = 'connecting' | 'connected' | 'ended' | 'error';

function roleOf(p: Participant): string {
  try {
    return (p.metadata ? JSON.parse(p.metadata).role : '') || 'guest';
  } catch {
    return 'guest';
  }
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

function TrackView({ track, contain }: { track: Track; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className={cn('h-full w-full', contain ? 'object-contain' : 'object-cover')} />;
}

function Tile({ participant, isLocal, speaking }: { participant: Participant; isLocal: boolean; speaking: boolean }) {
  const cam = participant.getTrackPublication(Track.Source.Camera);
  const mic = participant.getTrackPublication(Track.Source.Microphone);
  const camTrack = cam && !cam.isMuted ? cam.track : undefined;
  const micOn = Boolean(mic && !mic.isMuted);
  const role = isLocal ? 'admin' : roleOf(participant);
  const name = isLocal ? 'You (Fanitt Admin)' : participant.name || participant.identity;

  return (
    <div
      className={cn(
        'relative aspect-video overflow-hidden rounded-2xl bg-[#1d2233] ring-2 transition-shadow',
        speaking ? 'ring-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]' : 'ring-white/5'
      )}
    >
      {camTrack ? (
        <TrackView track={camTrack} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#F4511E] to-[#EC2A78] text-xl font-bold text-white">
            {initials(participant.name || participant.identity)}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        {role === 'host' && <Crown size={13} className="shrink-0 text-amber-300" />}
        <span className="truncate text-xs font-semibold text-white">{name}</span>
        {role === 'admin' && !isLocal && <span className="rounded bg-orange-500/80 px-1 text-[9px] font-bold text-white">ADMIN</span>}
        <span className="ml-auto shrink-0 text-white/80">{micOn ? <Mic size={13} /> : <MicOff size={13} className="text-rose-300" />}</span>
      </div>
    </div>
  );
}

export function MeetRoomViewer({
  meet,
  mode,
  onClose,
  onEnd,
}: {
  meet: MeetRow;
  mode: JoinMode;
  onClose: () => void;
  /** Ends the meeting for everyone (reason is shown to the creator). */
  onEnd: (reason: string) => Promise<void>;
}) {
  const room = useMemo(() => new Room({ adaptiveStream: true, dynacast: true }), []);
  const audioBox = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState('');
  const [endedText, setEndedText] = useState('');
  const [, setTick] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [busyIdentity, setBusyIdentity] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [notice, setNotice] = useState('');
  const [endOpen, setEndOpen] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState('');

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const onTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && audioBox.current) {
        const el = track.attach();
        audioBox.current.appendChild(el);
      }
      refresh();
    };
    const onTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
      refresh();
    };
    const onDisconnected = (reason?: DisconnectReason) => {
      if (cancelled) return;
      setEndedText(
        reason === DisconnectReason.ROOM_DELETED
          ? 'This meeting has ended.'
          : reason === DisconnectReason.PARTICIPANT_REMOVED
            ? 'You were removed from this meeting.'
            : 'You left the meeting.'
      );
      setPhase('ended');
    };
    const onAudioStatus = () => setAudioBlocked(!room.canPlaybackAudio);

    room
      .on(RoomEvent.TrackSubscribed, onTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.TrackPublished, refresh)
      .on(RoomEvent.TrackUnpublished, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ActiveSpeakersChanged, refresh)
      .on(RoomEvent.ParticipantMetadataChanged, refresh)
      .on(RoomEvent.AudioPlaybackStatusChanged, onAudioStatus)
      .on(RoomEvent.Disconnected, onDisconnected);

    (async () => {
      try {
        const { connection } = await meetAdminApi.join(meet._id, mode);
        if (cancelled) return;
        try {
          await room.connect(connection.url, connection.token);
        } catch {
          throw new Error('ROOM_CONNECT');
        }
        if (cancelled) {
          room.disconnect();
          return;
        }
        setAudioBlocked(!room.canPlaybackAudio);
        setPhase('connected');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error && err.message === 'ROOM_CONNECT' ? 'Could not connect to the meeting room. Check your internet and try again.' : getApiErrorMessage(err));
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.disconnect();
    };
  }, [room, meet._id, mode, refresh]);

  // Lock page scroll while the room is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const leave = () => {
    room.disconnect();
    onClose();
  };

  const toggleMic = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (err) {
      setNotice(getApiErrorMessage(err) || 'Microphone not available');
    }
  };

  const toggleCam = async () => {
    try {
      await room.localParticipant.setCameraEnabled(!camOn);
      setCamOn(!camOn);
    } catch (err) {
      setNotice(getApiErrorMessage(err) || 'Camera not available');
    }
  };

  const remove = async (identity: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this meeting?`)) return;
    setBusyIdentity(identity);
    try {
      await meetAdminApi.removeParticipant(meet._id, identity);
      setNotice(`${name} was removed.`);
    } catch (err) {
      setNotice(getApiErrorMessage(err));
    } finally {
      setBusyIdentity('');
    }
  };

  const confirmEnd = async () => {
    setEnding(true);
    setEndError('');
    try {
      await onEnd(endReason.trim());
      setEndOpen(false);
    } catch (err) {
      setEndError(getApiErrorMessage(err));
    } finally {
      setEnding(false);
    }
  };

  const remotes = Array.from(room.remoteParticipants.values());
  const speakers = new Set(room.activeSpeakers.map((p) => p.identity));
  const people: { participant: Participant; isLocal: boolean }[] = [
    ...remotes.sort((a, b) => (roleOf(a) === 'host' ? -1 : roleOf(b) === 'host' ? 1 : 0)).map((p) => ({ participant: p, isLocal: false })),
    ...(mode === 'speak' && phase === 'connected' ? [{ participant: room.localParticipant as Participant, isLocal: true }] : []),
  ];
  const screenShare = remotes
    .map((p) => ({ p, pub: p.getTrackPublication(Track.Source.ScreenShare) }))
    .find(({ pub }) => pub?.track && !pub.isMuted);

  const cols = people.length <= 1 ? 'grid-cols-1' : people.length <= 4 ? 'sm:grid-cols-2' : people.length <= 9 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4';

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] flex flex-col bg-[#0E111A] text-white">
      <div ref={audioBox} className="hidden" />

      {/* header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{meet.title}</p>
          <p className="truncate text-[11px] text-white/50">Hosted by {meet.host.name || 'creator'}</p>
        </div>
        <span
          className={cn(
            'hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold sm:flex',
            mode === 'silent' ? 'bg-white/10 text-white/80' : 'bg-orange-500/20 text-orange-200'
          )}
        >
          {mode === 'silent' ? (
            <>
              <EyeOff size={12} /> Watching silently — nobody can see you
            </>
          ) : (
            <>
              <Mic size={12} /> Joined as Fanitt Admin
            </>
          )}
        </span>
        <button onClick={() => setPanelOpen((v) => !v)} className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10">
          <Users2 size={14} /> {remotes.length}
        </button>
        <button onClick={leave} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* stage */}
        <div className="relative min-w-0 flex-1 overflow-y-auto p-4">
          {phase === 'connecting' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Joining the meeting…</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-sm text-sm text-rose-300">{error || 'Could not join this meeting.'}</p>
              <button onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
                Close
              </button>
            </div>
          )}
          {phase === 'ended' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-base font-semibold">{endedText}</p>
              <button onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
                Close
              </button>
            </div>
          )}
          {phase === 'connected' && (
            <>
              {screenShare?.pub?.track && (
                <div className="mb-4 overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
                  <div className="aspect-video">
                    <TrackView track={screenShare.pub.track} contain />
                  </div>
                  <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-white/70">
                    <MonitorUp size={13} /> {screenShare.p.name || 'Someone'} is sharing their screen
                  </p>
                </div>
              )}
              {people.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-white/50">Nobody is in the room right now.</div>
              ) : (
                <div className={cn('mx-auto grid max-w-6xl grid-cols-1 gap-3', cols)}>
                  {people.map(({ participant, isLocal }) => (
                    <Tile key={participant.identity} participant={participant} isLocal={isLocal} speaking={speakers.has(participant.identity)} />
                  ))}
                </div>
              )}
            </>
          )}

          {audioBlocked && phase === 'connected' && (
            <button
              onClick={() => room.startAudio().then(() => setAudioBlocked(false))}
              className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold shadow-lg"
            >
              <Volume2 size={14} /> Click to hear the meeting
            </button>
          )}
          {notice && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs backdrop-blur">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* participants */}
        {panelOpen && phase === 'connected' && (
          <aside className="hidden w-72 shrink-0 flex-col border-l border-white/10 md:flex">
            <p className="px-4 pb-2 pt-4 text-xs font-bold uppercase tracking-wide text-white/40">In the room · {remotes.length}</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
              {remotes.map((p) => {
                const role = roleOf(p);
                const mic = p.getTrackPublication(Track.Source.Microphone);
                const cam = p.getTrackPublication(Track.Source.Camera);
                return (
                  <div key={p.identity} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">{initials(p.name || p.identity)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold">
                        {p.name || p.identity}
                        {role === 'host' && <Crown size={12} className="shrink-0 text-amber-300" />}
                      </p>
                      <p className="text-[11px] capitalize text-white/40">{role}</p>
                    </div>
                    <span className="flex shrink-0 gap-1 text-white/50">
                      {mic && !mic.isMuted ? <Mic size={13} /> : <MicOff size={13} />}
                      {cam && !cam.isMuted ? <Video size={13} /> : <VideoOff size={13} />}
                    </span>
                    {role !== 'host' && role !== 'admin' && (
                      <button
                        onClick={() => remove(p.identity, p.name || 'this person')}
                        disabled={busyIdentity === p.identity}
                        title="Remove from meeting"
                        className="shrink-0 rounded-lg p-1 text-rose-300 opacity-0 hover:bg-rose-500/15 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {busyIdentity === p.identity ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                      </button>
                    )}
                  </div>
                );
              })}
              {remotes.length === 0 && <p className="px-2 text-xs text-white/40">Nobody is here yet.</p>}
            </div>
          </aside>
        )}
      </div>

      {/* controls */}
      {phase === 'connected' && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
          {mode === 'speak' && (
            <>
              <button
                onClick={toggleMic}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full', micOn ? 'bg-white/10 hover:bg-white/15' : 'bg-rose-600 hover:bg-rose-500')}
                aria-label={micOn ? 'Mute' : 'Unmute'}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={toggleCam}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full', camOn ? 'bg-white/10 hover:bg-white/15' : 'bg-rose-600 hover:bg-rose-500')}
                aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </>
          )}
          <button onClick={leave} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold hover:bg-white/15">
            <LogOut size={16} /> Leave
          </button>
          <button
            onClick={() => {
              setEndReason('');
              setEndError('');
              setEndOpen(true);
            }}
            disabled={room.state !== ConnectionState.Connected}
            className="flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold hover:bg-rose-500 disabled:opacity-50"
          >
            <Square size={14} /> End for everyone
          </button>
        </div>
      )}

      {endOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4" onClick={() => !ending && setEndOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171B26] p-5">
            <h3 className="text-base font-bold">End this meeting for everyone?</h3>
            <p className="mt-1 text-xs text-white/50">Everyone is disconnected right away. The creator sees your reason.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Breaks community guidelines', 'Reported by attendees', 'Inappropriate content'].map((p) => (
                <button key={p} onClick={() => setEndReason(p)} className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10">
                  {p}
                </button>
              ))}
            </div>
            <textarea
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Reason the creator will see…"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-orange-400"
            />
            {endError && <p className="mt-2 text-xs text-rose-300">{endError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEndOpen(false)} disabled={ending} className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={confirmEnd}
                disabled={ending || endReason.trim().length < 5}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-500 disabled:opacity-50"
              >
                {ending && <Loader2 size={14} className="animate-spin" />} End meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
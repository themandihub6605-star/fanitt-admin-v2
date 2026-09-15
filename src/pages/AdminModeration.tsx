import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Video, Briefcase, Star, Trash2, EyeOff, Flag } from 'lucide-react';
import { adminApi, type AdminSession, type AdminCampaign, type AdminReview } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab, EmptyState } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

const TABS = [
  { key: 'sessions', label: 'Sessions', icon: Video },
  { key: 'campaigns', label: 'Campaigns', icon: Briefcase },
  { key: 'reviews', label: 'Reviews', icon: Star },
] as const;

export default function AdminModeration() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('sessions');
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    const request =
      tab === 'sessions' ? adminApi.listAllSessions() : tab === 'campaigns' ? adminApi.listAllCampaigns() : adminApi.listAllReviews(flaggedOnly);

    request
      .then((data) => {
        if (tab === 'sessions') setSessions(data as AdminSession[]);
        else if (tab === 'campaigns') setCampaigns(data as AdminCampaign[]);
        else setReviews(data as AdminReview[]);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab, flaggedOnly]);

  const handleRemoveSession = async (id: string) => {
    if (!window.confirm('Remove this session? It will be cancelled for everyone.')) return;
    setActingOn(id);
    try {
      await adminApi.removeSession(id);
      setSessions((prev) => prev.map((s) => (s._id === id ? { ...s, isCancelled: true } : s)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleHideReview = async (id: string) => {
    if (!window.confirm('Hide this review from public view?')) return;
    setActingOn(id);
    try {
      await adminApi.hideReview(id);
      setReviews((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Content Moderation" description="Live sessions, brand campaigns, and reviews across the platform." />

      <TabGroup>
        {TABS.map((t) => (
          <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            <t.icon size={14} /> {t.label}
          </Tab>
        ))}
      </TabGroup>

      {tab === 'reviews' && (
        <label className="mt-4 flex w-fit items-center gap-2 text-sm text-gray-600 dark:text-white/70">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="rounded accent-orange-600" />
          Flagged only
        </label>
      )}

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      )}

      {/* Sessions */}
      {!loading && tab === 'sessions' && (
        <div className="mt-6 space-y-3">
          {sessions.length === 0 && <EmptyState icon={Video} message="No sessions found." />}
          {sessions.map((s) => (
            <Card key={s._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-400 dark:text-white/50">
                  {s.creator?.user?.name || 'Unknown creator'} · {new Date(s.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              {s.isCancelled ? (
                <Badge tone="rose">Cancelled</Badge>
              ) : (
                <Button variant="danger" size="sm" onClick={() => handleRemoveSession(s._id)} disabled={actingOn === s._id}>
                  {actingOn === s._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Campaigns */}
      {!loading && tab === 'campaigns' && (
        <div className="mt-6 space-y-3">
          {campaigns.length === 0 && <EmptyState icon={Briefcase} message="No campaigns found." />}
          {campaigns.map((c) => (
            <Card key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                <p className="text-xs text-gray-400 dark:text-white/50">{c.brand?.companyName || 'Unknown brand'} · {formatRupees(c.budget)}</p>
              </div>
              <Badge tone="gray" className="capitalize">{c.status.replace('_', ' ')}</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Reviews */}
      {!loading && tab === 'reviews' && (
        <div className="mt-6 space-y-3">
          {reviews.length === 0 && <EmptyState icon={Star} message="No reviews found." />}
          {reviews.map((r) => (
            <Card key={r._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-white/20'} />
                    ))}
                    {r.isFlagged && (
                      <Badge tone="rose" className="ml-2">
                        <Flag size={9} /> Flagged
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-gray-700 dark:text-white/80">{r.comment || <span className="text-gray-300 dark:text-white/30">No comment</span>}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                    {r.fromUser?.name || 'Someone'} → {r.toUser?.name || 'Unknown'}
                  </p>
                </div>
                <Button variant="danger" size="sm" className="shrink-0" onClick={() => handleHideReview(r._id)} disabled={actingOn === r._id}>
                  {actingOn === r._id ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />} Hide
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import { Fragment, useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  IndianRupee,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Users2,
  X,
  XCircle,
} from 'lucide-react';
import {
  campaignAdminApi,
  type AdminCampaignRow,
  type ApprovalFilter,
  type CampaignDetailsResponse,
  type CampaignRules,
} from '@/services/campaignAdminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://app.fanitt.com';

function rupees(paise?: number | null) {
  if (paise == null) return '—';
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function approvalOf(c: AdminCampaignRow): 'pending' | 'approved' | 'rejected' {
  return c.approvalStatus === 'pending' || c.approvalStatus === 'rejected' ? c.approvalStatus : 'approved';
}

const APPROVAL_BADGE = {
  pending: { tone: 'amber' as const, label: 'Waiting for review' },
  approved: { tone: 'emerald' as const, label: 'Approved' },
  rejected: { tone: 'rose' as const, label: 'Rejected' },
};

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20';

export default function AdminCampaigns() {
  const [tab, setTab] = useState<ApprovalFilter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ campaign: AdminCampaignRow; action: 'reject' | 'unpublish' } | null>(null);

  const load = (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    campaignAdminApi
      .list({ approval: tab, search: search.trim() || undefined, page })
      .then((res) => {
        setCampaigns(res.campaigns);
        setPages(Math.max(1, res.pages));
        setTotal(res.total);
        setPendingCount(res.pendingCount);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handle = window.setTimeout(() => load(), search ? 350 : 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page]);

  const approve = async (c: AdminCampaignRow) => {
    if (!window.confirm(`Approve "${c.title}"? It goes live for creators right away.`)) return;
    setActingOn(c._id);
    try {
      await campaignAdminApi.approve(c._id);
      load(true);
      setDetailId(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const submitReason = async (reason: string) => {
    if (!reasonFor) return;
    const { campaign, action } = reasonFor;
    setActingOn(campaign._id);
    try {
      if (action === 'reject') await campaignAdminApi.reject(campaign._id, reason);
      else await campaignAdminApi.unpublish(campaign._id, reason);
      setReasonFor(null);
      setDetailId(null);
      load(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Review new campaigns before they go live, see every proposal and payment, and set the campaign rules."
      />

      <RulesCard />

      <div className="mt-6">
        <TabGroup>
          {(
            [
              { key: 'pending', label: `Waiting for review${pendingCount ? ` (${pendingCount})` : ''}` },
              { key: 'approved', label: 'Live & approved' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'all', label: 'All' },
            ] as const
          ).map((t) => (
            <Tab
              key={t.key}
              active={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </Tab>
          ))}
        </TabGroup>
      </div>

      <div className="relative mt-4 max-w-xl">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by campaign title, brand name or brand email..."
          className={cn(inputClasses, 'pl-11')}
        />
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading campaigns...</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{total.toLocaleString('en-IN')} campaigns</p>
          <div className="mt-2 space-y-3">
            {campaigns.length === 0 && (
              <EmptyState icon={Briefcase} message={tab === 'pending' ? 'Nothing waiting for review 🎉' : 'No campaigns found.'} />
            )}
            {campaigns.map((c) => {
              const approval = approvalOf(c);
              const badge = APPROVAL_BADGE[approval];
              return (
                <Card key={c._id} className="p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {c.campaignImageUrl ? (
                      <img src={c.campaignImageUrl} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-white/20">
                        <Briefcase size={22} />
                      </span>
                    )}
                    <div className="min-w-[220px] flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold text-gray-900 dark:text-white">{c.title}</p>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        <Badge tone="gray" className="capitalize">
                          {c.status.replace('_', ' ')}
                        </Badge>
                        <Badge tone={c.campaignType === 'paid' ? 'orange' : 'pink'} className="capitalize">
                          {c.campaignType}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-white/55">
                        {c.brand?.companyName || 'Unknown brand'}
                        {c.brand?.user?.email ? ` · ${c.brand.user.email}` : ''}
                        {c.category?.label ? ` · ${c.category.label}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-600 dark:text-white/65">
                        <span className="flex items-center gap-1">
                          <IndianRupee size={12} /> {c.campaignType === 'paid' ? rupees(c.budget) : 'Barter'}
                          {c.campaignType === 'paid' && c.maxInfluencers > 1 && (
                            <span className="font-normal text-gray-400">
                              ({rupees(c.costPerInfluencer)} × {c.maxInfluencers})
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users2 size={12} /> {c.applicantCount} proposals
                        </span>
                        {c.assignedCreator?.user?.name && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                            <CheckCircle2 size={12} /> Hired {c.assignedCreator.user.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-normal text-gray-400">
                          <Clock size={12} /> Submitted {formatDateTime(c.submittedForReviewAt || c.publishedAt || c.createdAt)}
                        </span>
                      </div>
                      {approval === 'rejected' && c.rejectionReason && (
                        <p className="mt-2 text-xs text-rose-500">Reason: {c.rejectionReason}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetailId(c._id)}>
                        <Eye size={12} /> Details
                      </Button>
                      {approval === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => approve(c)} disabled={actingOn === c._id}>
                            {actingOn === c._id ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setReasonFor({ campaign: c, action: 'reject' })}>
                            <XCircle size={12} /> Reject
                          </Button>
                        </>
                      )}
                      {approval === 'approved' && c.status === 'open' && !c.assignedCreator && (
                        <Button size="sm" variant="danger" onClick={() => setReasonFor({ campaign: c, action: 'unpublish' })}>
                          <Ban size={12} /> Take down
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-white/40">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {detailId && (
        <DetailsModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onApprove={(c) => approve(c)}
          onReject={(c) => setReasonFor({ campaign: c, action: 'reject' })}
          onUnpublish={(c) => setReasonFor({ campaign: c, action: 'unpublish' })}
          busy={actingOn === detailId}
        />
      )}

      {reasonFor && (
        <ReasonModal
          title={reasonFor.action === 'reject' ? 'Reject campaign' : 'Take campaign down'}
          hint={
            reasonFor.action === 'reject'
              ? 'The brand sees this reason, the campaign goes back to draft so they can fix it, and their campaign slot is returned.'
              : 'The campaign disappears from the website and app. The brand and creators who applied are notified.'
          }
          busy={actingOn === reasonFor.campaign._id}
          onClose={() => setReasonFor(null)}
          onSubmit={submitReason}
        />
      )}
    </div>
  );
}

function RulesCard() {
  const [rules, setRules] = useState<CampaignRules | null>(null);
  const [minRupees, setMinRupees] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    campaignAdminApi
      .getRules()
      .then((r) => {
        setRules(r);
        setMinRupees(String(Math.round(r.minCampaignBudget / 100)));
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const save = async (patch: Partial<CampaignRules>) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await campaignAdminApi.updateRules(patch);
      setRules(updated);
      setMinRupees(String(Math.round(updated.minCampaignBudget / 100)));
      setMessage('Saved');
      window.setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end gap-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Minimum campaign budget</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
              <input
                type="number"
                min={0}
                value={minRupees}
                onChange={(e) => setMinRupees(e.target.value)}
                className={cn(inputClasses, 'w-36 pl-7')}
              />
            </div>
            <Button
              size="sm"
              onClick={() => save({ minCampaignBudget: Math.max(0, Math.round(Number(minRupees || 0) * 100)) })}
              disabled={saving || !rules}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </Button>
          </div>
          <span className="mt-1 block text-[11px] text-gray-400 dark:text-white/40">Paid campaigns below this total can't be published. Creator quotes can't go below it either.</span>
        </label>

        <label className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={rules?.requireCampaignApproval ?? true}
            disabled={saving || !rules}
            onClick={() => save({ requireCampaignApproval: !(rules?.requireCampaignApproval ?? true) })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors disabled:opacity-50',
              rules?.requireCampaignApproval ?? true ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/15'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                rules?.requireCampaignApproval ?? true ? 'left-[22px]' : 'left-0.5'
              )}
            />
          </button>
          <span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Admin approval required</span>
            <span className="block text-[11px] text-gray-400 dark:text-white/40">New campaigns go live only after you approve them.</span>
          </span>
        </label>

        {message && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">{message}</span>}
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </div>
    </Card>
  );
}

function ReasonModal({
  title,
  hint,
  busy,
  onClose,
  onSubmit,
}: {
  title: string;
  hint: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const presets = ['Budget or details are unclear', 'Image is inappropriate or low quality', 'Violates our content policy', 'Duplicate campaign'];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#171B26]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{hint}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Reason the brand will see…"
          className={cn(inputClasses, 'mt-3 resize-none')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onSubmit(reason.trim())} disabled={busy || reason.trim().length < 5}>
            {busy && <Loader2 size={14} className="animate-spin" />} Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  id,
  onClose,
  onApprove,
  onReject,
  onUnpublish,
  busy,
}: {
  id: string;
  onClose: () => void;
  onApprove: (c: AdminCampaignRow) => void;
  onReject: (c: AdminCampaignRow) => void;
  onUnpublish: (c: AdminCampaignRow) => void;
  busy: boolean;
}) {
  const [data, setData] = useState<CampaignDetailsResponse | null>(null);
  const [error, setError] = useState('');
  const [openPitch, setOpenPitch] = useState<string | null>(null);

  useEffect(() => {
    campaignAdminApi
      .details(id)
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);

  const c = data?.campaign;
  const approval = c ? approvalOf(c) : 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-4xl rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#171B26]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Campaign details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!data && !error && (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 size={26} className="animate-spin" />
          </div>
        )}
        {error && <p className="p-6 text-sm text-rose-500">{error}</p>}

        {c && data && (
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap gap-5">
              {c.campaignImageUrl && <img src={c.campaignImageUrl} alt="" className="h-36 w-56 rounded-xl object-cover" />}
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{c.title}</h3>
                  <Badge tone={APPROVAL_BADGE[approval].tone}>{APPROVAL_BADGE[approval].label}</Badge>
                  <Badge tone="gray" className="capitalize">
                    {c.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/55">
                  {c.brand?.companyName} · {c.brand?.user?.name} · {c.brand?.user?.email}
                  {c.brand?.user?.phone ? ` · ${c.brand.user.phone}` : ''}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Total budget" value={c.campaignType === 'paid' ? rupees(c.budget) : 'Barter'} />
                  <Stat label="Per influencer" value={c.campaignType === 'paid' ? rupees(c.costPerInfluencer) : '—'} />
                  <Stat label="Influencers" value={String(c.maxInfluencers || 1)} />
                  <Stat label="Proposals" value={String(data.summary.applicants)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {approval === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => onApprove(c)} disabled={busy}>
                        <ShieldCheck size={12} /> Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onReject(c)}>
                        <XCircle size={12} /> Reject
                      </Button>
                    </>
                  )}
                  {approval === 'approved' && c.status === 'open' && !c.assignedCreator && (
                    <Button size="sm" variant="danger" onClick={() => onUnpublish(c)}>
                      <Ban size={12} /> Take down
                    </Button>
                  )}
                  {approval === 'approved' && c.status !== 'draft' && (
                    <a
                      href={`${SITE_URL}/campaigns/${c._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5"
                    >
                      <Eye size={12} /> View on website
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Brief */}
            <Section title="Brief">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-white/80">{c.description || '—'}</p>
              <div className="mt-3 grid gap-2 text-xs text-gray-500 dark:text-white/55 sm:grid-cols-2">
                <span>Type: <b className="capitalize">{c.campaignType}</b></span>
                <span>Location: <b>{c.location || '—'}</b></span>
                <span>Category: <b>{c.category?.label || '—'}</b></span>
                <span>Duration: <b>{c.durationLabel || '—'}</b></span>
                {c.deliverables && (
                  <span>
                    Deliverables: <b>{c.deliverables.reel} reel · {c.deliverables.story} story · {c.deliverables.post} post</b>
                  </span>
                )}
                {c.minFollowers != null && <span>Min followers: <b>{c.minFollowers.toLocaleString('en-IN')}</b></span>}
                {c.ageRange && <span>Age: <b>{c.ageRange.min}–{c.ageRange.max}</b></span>}
                <span>Milestones: <b>{c.milestoneCount ?? '—'}</b></span>
                <span>Submitted: <b>{formatDateTime(c.submittedForReviewAt)}</b></span>
                <span>
                  Reviewed: <b>{formatDateTime(c.reviewedAt)}</b>
                  {c.reviewedBy?.name ? ` by ${c.reviewedBy.name}` : ''}
                </span>
              </div>
              {c.products && c.products.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.products.map((p) => (
                    <span key={p._id} className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-white/5 dark:text-white/60">
                      {p.name} × {p.quantity} · {rupees(p.price)}
                    </span>
                  ))}
                </div>
              )}
              {c.sampleMedia && c.sampleMedia.length > 0 && (
                <div className="mt-3 space-y-1">
                  {c.sampleMedia.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-xs text-orange-600 hover:underline dark:text-orange-300">
                      {url}
                    </a>
                  ))}
                </div>
              )}
            </Section>

            {/* Proposals */}
            <Section
              title={`Proposals (${data.summary.applicants})`}
              extra={
                data.summary.lowestQuote != null
                  ? `Quotes ${rupees(data.summary.lowestQuote)} – ${rupees(data.summary.highestQuote)} · ${data.summary.pending} pending · ${data.summary.accepted} accepted · ${data.summary.rejected} declined`
                  : undefined
              }
            >
              {data.applications.length === 0 ? (
                <p className="text-sm text-gray-400">No proposals yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-gray-400 dark:text-white/40">
                      <tr>
                        <th className="py-2 pr-3">Creator</th>
                        <th className="py-2 pr-3">Quote</th>
                        <th className="py-2 pr-3">Timeline</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Applied</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {data.applications.map((a) => (
                        <Fragment key={a._id}>
                          <tr className="text-gray-700 dark:text-white/80">
                            <td className="py-2 pr-3">
                              <p className="font-semibold">{a.creator?.user?.name || '—'}</p>
                              <p className="text-xs text-gray-400">{a.creator?.user?.email}</p>
                            </td>
                            <td className="py-2 pr-3 font-semibold">{a.quotedAmount ? rupees(a.quotedAmount) : 'Budget'}</td>
                            <td className="py-2 pr-3 text-xs">{a.deliveryTimeline || '—'}</td>
                            <td className="py-2 pr-3">
                              <Badge tone={a.status === 'accepted' ? 'emerald' : a.status === 'rejected' ? 'rose' : 'amber'} className="capitalize">
                                {a.status}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 text-xs">{formatDateTime(a.createdAt)}</td>
                            <td className="py-2 text-right">
                              {a.pitch && (
                                <button onClick={() => setOpenPitch(openPitch === a._id ? null : a._id)} className="text-xs font-semibold text-orange-600 dark:text-orange-300">
                                  {openPitch === a._id ? 'Hide pitch' : 'Pitch'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {openPitch === a._id && (
                            <tr>
                              <td colSpan={6} className="pb-3 text-xs text-gray-600 dark:text-white/65">
                                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 dark:bg-white/5">{a.pitch}</p>
                                {a.rejectionReason && <p className="mt-1 text-rose-500">Declined: {a.rejectionReason}</p>}
                                {a.portfolioLinks?.map((l) => (
                                  <a key={l} href={l} target="_blank" rel="noreferrer" className="mt-1 block truncate text-orange-600 dark:text-orange-300">
                                    {l}
                                  </a>
                                ))}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Hired + milestones */}
            {(c.assignedCreator || data.milestones.length > 0) && (
              <Section
                title="Hired creator & milestones"
                extra={`Total ${rupees(data.summary.milestoneTotal)} · funded ${rupees(data.summary.fundedTotal)} · released ${rupees(data.summary.releasedTotal)}`}
              >
                {c.assignedCreator?.user && (
                  <p className="mb-3 text-sm text-gray-700 dark:text-white/80">
                    Hired: <b>{c.assignedCreator.user.name}</b> ({c.assignedCreator.user.email})
                  </p>
                )}
                <div className="space-y-2">
                  {data.milestones.map((m) => (
                    <div key={m._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-white/5">
                      <span className="font-semibold text-gray-800 dark:text-white/85">
                        {m.order}. {m.title}
                      </span>
                      <span className="flex items-center gap-2">
                        <b className="text-gray-800 dark:text-white">{rupees(m.amount)}</b>
                        <Badge tone={m.status === 'released' ? 'emerald' : m.status === 'disputed' ? 'rose' : m.status === 'pending' ? 'gray' : 'sky'} className="capitalize">
                          {m.status.replace('_', ' ')}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Money trail */}
            {data.transactions.length > 0 && (
              <Section title="Payments">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-gray-400 dark:text-white/40">
                      <tr>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Fee</th>
                        <th className="py-2 pr-3">From → To</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {data.transactions.map((t) => (
                        <tr key={t._id} className="text-gray-700 dark:text-white/80">
                          <td className="py-2 pr-3 capitalize">{t.type.replace(/_/g, ' ')}</td>
                          <td className="py-2 pr-3 font-semibold">{rupees(t.amount)}</td>
                          <td className="py-2 pr-3 text-xs">{t.platformCommission ? rupees(t.platformCommission) : '—'}</td>
                          <td className="py-2 pr-3 text-xs">
                            {t.from?.name || 'Fanitt'} → {t.to?.name || 'Fanitt'}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone={t.status === 'completed' ? 'emerald' : t.status === 'failed' ? 'rose' : 'amber'} className="capitalize">
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-xs">{formatDateTime(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/5">
      <p className="text-[11px] text-gray-400 dark:text-white/40">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function Section({ title, extra, children }: { title: string; extra?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-white/50">{title}</h4>
        {extra && <span className="text-xs text-gray-400 dark:text-white/45">{extra}</span>}
      </div>
      {children}
    </section>
  );
}
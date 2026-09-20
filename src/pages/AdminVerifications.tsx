import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Check, X, Sparkles, Building2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi, type PendingVerifications } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button } from '@/components/AdminUI';

type PendingCreator = PendingVerifications['pendingCreators'][number];
type PendingBrand = PendingVerifications['pendingBrands'][number];

// One small "field" row — only renders if the value actually exists, so
// this works whether or not the backend has been updated yet to return
// the fuller set of signup fields (see the NOTE in adminApi.ts).
function Field({ label, value }: { label: string; value?: string | number | string[] | null }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="text-xs">
      <span className="font-bold text-gray-400 dark:text-white/40">{label}: </span>
      <span className="text-gray-600 dark:text-white/70">{Array.isArray(value) ? value.join(', ') : value}</span>
    </div>
  );
}

function SocialLinks({ socials }: { socials?: Record<string, string | undefined> }) {
  const entries = Object.entries(socials || {}).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <a
          key={k}
          href={v!.startsWith('http') ? v : `https://${v}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50/60 px-2 py-1 text-[11px] font-semibold capitalize text-gray-600 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          {k} <ExternalLink size={10} />
        </a>
      ))}
    </div>
  );
}

/** Reject requires a reason (point: admin needs to be able to tell the user
 * why, and that reason gets emailed to them + shown on their resubmit
 * screen) — so this replaces the old "click Reject, decision made instantly"
 * with an inline reason prompt that has to be filled before confirming. */
function RejectControl({ onConfirm, busy }: { onConfirm: (reason: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <Button size="sm" variant="danger" onClick={() => setOpen(true)} disabled={busy}>
        <X size={12} /> Reject
      </Button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-500/25 dark:bg-rose-500/10">
      <p className="mb-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">Reason for rejection (sent to the user)</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="e.g. Portfolio link doesn't work — please add a valid one and resubmit."
        className="w-full resize-none rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-rose-400 focus:outline-none dark:border-rose-500/30 dark:bg-[#0f1117] dark:text-white dark:placeholder:text-white/30"
      />
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={!reason.trim() || busy}
          onClick={() => onConfirm(reason.trim())}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Confirm Reject
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CreatorCard({ c, onDecide, busy }: { c: PendingCreator; onDecide: (decision: 'verified' | 'rejected', reason?: string) => void; busy: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {c.user?.avatarUrl ? (
          <img src={c.user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-sm font-bold text-white">
            {(c.user?.name || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900 dark:text-white">{c.user?.name || 'Unknown user'}</p>
          <p className="truncate text-xs text-gray-500 dark:text-white/50">{c.user?.email || '—'}</p>
        </div>
        {c.user?._id && (
          <Link
            to={`/users/${c.user._id}`}
            className="shrink-0 text-[11px] font-bold text-orange-600 hover:underline dark:text-orange-400"
          >
            Full profile →
          </Link>
        )}
      </div>

      {c.category?.label && <p className="mt-2 text-xs text-gray-400 dark:text-white/40">Category: {c.category.label}</p>}
      {c.bio && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-white/50">{c.bio}</p>}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'Hide' : 'Show'} full submitted details
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-xl bg-gray-50/60 p-3 dark:bg-white/5">
          <Field label="Title" value={c.title} />
          <Field label="Phone" value={c.user?.phone} />
          <Field label="Skills" value={c.skills} />
          <Field label="Languages" value={c.languages} />
          <Field label="Experience" value={c.yearsOfExperience != null ? `${c.yearsOfExperience} yrs` : undefined} />
          <Field label="Response time" value={c.responseTime} />
          <Field label="Portfolio" value={c.portfolioLink} />
          <SocialLinks socials={c.socials} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <Button size="sm" onClick={() => onDecide('verified')} disabled={busy} className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700">
          <Check size={12} /> Approve
        </Button>
        <RejectControl busy={busy} onConfirm={(reason) => onDecide('rejected', reason)} />
      </div>
    </Card>
  );
}

function BrandCard({ b, onDecide, busy }: { b: PendingBrand; onDecide: (decision: 'verified' | 'rejected', reason?: string) => void; busy: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {b.user?.avatarUrl ? (
          <img src={b.user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-orange-600 text-sm font-bold text-white">
            {(b.companyName || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900 dark:text-white">{b.companyName || 'Unknown brand'}</p>
          <p className="truncate text-xs text-gray-500 dark:text-white/50">{b.user?.email || '—'}</p>
        </div>
        {b.user?._id && (
          <Link
            to={`/users/${b.user._id}`}
            className="shrink-0 text-[11px] font-bold text-orange-600 hover:underline dark:text-orange-400"
          >
            Full profile →
          </Link>
        )}
      </div>

      {b.industry && <p className="mt-2 text-xs text-gray-400 dark:text-white/40">Industry: {b.industry}</p>}
      {b.tagline && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-white/50">{b.tagline}</p>}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'Hide' : 'Show'} full submitted details
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-xl bg-gray-50/60 p-3 dark:bg-white/5">
          <Field label="About" value={b.about} />
          <Field label="Phone" value={b.user?.phone} />
          <Field label="Founded" value={b.foundedYear} />
          <Field label="Company size" value={b.companySize} />
          <Field label="Contact person" value={b.contactDesignation} />
          <Field label="What they offer" value={b.whatWeOffer} />
          <Field label="Target audience" value={b.targetAudience} />
          <SocialLinks socials={b.socials} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <Button size="sm" onClick={() => onDecide('verified')} disabled={busy} className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700">
          <Check size={12} /> Approve
        </Button>
        <RejectControl busy={busy} onConfirm={(reason) => onDecide('rejected', reason)} />
      </div>
    </Card>
  );
}

export default function AdminVerifications() {
  const [data, setData] = useState<PendingVerifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listPendingVerifications()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreator = async (id: string, decision: 'verified' | 'rejected', reason?: string) => {
    setActingOn(id);
    try {
      await adminApi.verifyCreator(id, decision, reason);
      setData((prev) => (prev ? { ...prev, pendingCreators: prev.pendingCreators.filter((c) => c._id !== id) } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleBrand = async (id: string, decision: 'verified' | 'rejected', reason?: string) => {
    setActingOn(id);
    try {
      await adminApi.verifyBrand(id, decision, reason);
      setData((prev) => (prev ? { ...prev, pendingBrands: prev.pendingBrands.filter((b) => b._id !== id) } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Pending Verifications" description="Creator and Brand profiles waiting on the verified badge." />

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      )}

      {!loading && data && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
              <Sparkles size={14} /> Creators ({data.pendingCreators.length})
            </h2>
            {data.pendingCreators.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingCreators.map((c) => (
                  <CreatorCard key={c._id} c={c} busy={actingOn === c._id} onDecide={(decision, reason) => handleCreator(c._id, decision, reason)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
              <Building2 size={14} /> Brands ({data.pendingBrands.length})
            </h2>
            {data.pendingBrands.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingBrands.map((b) => (
                  <BrandCard key={b._id} b={b} busy={actingOn === b._id} onDecide={(decision, reason) => handleBrand(b._id, decision, reason)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ShieldAlert, Paperclip, ExternalLink, CheckCircle2 } from 'lucide-react';
import { disputeApi, type ApiDispute, type DisputeOutcome } from '@/services/disputeApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const OUTCOME_OPTIONS: { value: DisputeOutcome; label: string; description: string }[] = [
  { value: 'full_to_creator', label: 'Full amount to Creator', description: 'The submitted work is acceptable — release the full milestone amount.' },
  { value: 'partial', label: 'Partial amount to Creator', description: 'Some work was delivered — split the milestone between creator and refund.' },
  { value: 'refund_to_brand', label: 'Full refund to Brand', description: 'The work does not meet the brief — refund the brand in full.' },
  { value: 'revision_required', label: 'Revision required', description: 'No money moves — send the milestone back to the creator to redo, still funded.' },
];

function DisputeCard({ dispute, onResolved }: { dispute: ApiDispute; onResolved: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [outcome, setOutcome] = useState<DisputeOutcome | null>(null);
  const [creatorAmount, setCreatorAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const milestone = dispute.milestone;

  const handleResolve = async () => {
    if (!outcome) return;
    if (outcome === 'partial') {
      const amount = Math.round(parseFloat(creatorAmount || '0') * 100);
      if (!amount || amount <= 0 || amount >= milestone.amount) {
        setError('Enter a creator amount between ₹0 and the milestone amount for a partial resolution');
        return;
      }
    }
    if (!window.confirm(`Confirm resolution: ${OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label}? This can't be undone.`)) return;

    setResolving(true);
    setError('');
    try {
      await disputeApi.resolve(dispute._id, {
        outcome,
        creatorAmount: outcome === 'partial' ? Math.round(parseFloat(creatorAmount) * 100) : undefined,
        adminNotes: adminNotes.trim() || undefined,
      });
      onResolved(dispute._id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

  return (
    <Card className="border-rose-200 p-5 dark:border-rose-500/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-500 dark:text-rose-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">
              {dispute.campaign.brand.companyName} · {dispute.campaign.title}
            </p>
          </div>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{milestone.title}</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatRupees(milestone.amount)} held in escrow</p>
        </div>
        <Badge tone="rose">Open · {formatDate(dispute.createdAt)}</Badge>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-bold text-gray-700 dark:text-white/80">Brand's reason ({dispute.raisedBy.name})</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{dispute.reason}</p>
        {dispute.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {dispute.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-orange-600 hover:underline dark:text-orange-400">
                <Paperclip size={11} /> {a.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
      >
        {expanded ? 'Hide' : 'View'} creator's submission <ExternalLink size={11} />
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-bold text-gray-700 dark:text-white/80">Creator's submission</p>
          {milestone.submissionDescription && <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{milestone.submissionDescription}</p>}
          {(milestone.submissionLinks || []).filter(Boolean).map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-orange-600 hover:underline dark:text-orange-400">
              {link}
            </a>
          ))}
          {(milestone.submissionAttachments || []).map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-orange-600 hover:underline dark:text-orange-400">
              <Paperclip size={11} /> {a.name}
            </a>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Resolve this dispute</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OUTCOME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                outcome === opt.value
                  ? 'border-orange-400 bg-orange-50 dark:border-orange-500/60 dark:bg-orange-500/10'
                  : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20'
              )}
            >
              <p className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-white/50">{opt.description}</p>
            </button>
          ))}
        </div>

        {outcome === 'partial' && (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-white/60">Amount to Creator (₹, out of {formatRupees(milestone.amount)})</span>
            <input
              type="number"
              value={creatorAmount}
              onChange={(e) => setCreatorAmount(e.target.value)}
              placeholder={`e.g. ${(milestone.amount / 100 / 2).toFixed(0)}`}
              className={inputClass}
            />
          </label>
        )}

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-white/60">Admin notes (optional, internal)</span>
          <textarea rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className={cn('resize-none', inputClass)} />
        </label>

        <Button className="mt-3 w-full justify-center" onClick={handleResolve} disabled={!outcome || resolving}>
          {resolving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Resolution'}
        </Button>
      </div>
    </Card>
  );
}

export default function AdminEscrowDisputes() {
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justResolved, setJustResolved] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    disputeApi
      .listOpen()
      .then(setDisputes)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleResolved = (id: string) => {
    setDisputes((prev) => prev.filter((d) => d._id !== id));
    setJustResolved(id);
    setTimeout(() => setJustResolved(null), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Escrow Disputes"
        description="Milestones where the brand raised a dispute instead of approving. Review both sides' evidence and decide how the held funds split — this is final."
      />

      {justResolved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" /> Dispute resolved.
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading disputes...</p>
        </div>
      )}

      {!loading && !error && disputes.length === 0 && <EmptyState icon={ShieldAlert} message="No disputed milestones right now." />}

      {!loading && !error && disputes.length > 0 && (
        <div className="space-y-4">
          {disputes.map((d) => (
            <DisputeCard key={d._id} dispute={d} onResolved={handleResolved} />
          ))}
        </div>
      )}
    </div>
  );
}
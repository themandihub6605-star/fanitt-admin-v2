import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCircle2, ExternalLink, FileText, Loader2, RotateCcw, ShieldCheck, Store as StoreIcon, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type KycStatus, type StoreDetail, type StoreRow, type StoreStatus } from '../api';
import { ErrorBanner, Loading, Modal, Pagination, ReasonModal, SearchBox, Select, StatusBadge, dateTime, label, rupees, useDebounced, usePagedList } from '../ui';

type StatusFilter = 'all' | StoreStatus;
type KycFilter = 'all' | KycStatus;

export default function StoreStores() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>((params.get('status') as StatusFilter) || 'all');
  const [kyc, setKyc] = useState<KycFilter>((params.get('kyc') as KycFilter) || 'all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [openId, setOpenId] = useState<string | null>(params.get('open'));

  const list = usePagedList<StoreRow>((page) => storeAdminApi.stores({ page, status, kyc, search: q }), [status, kyc, q]);

  const closeDetail = () => {
    setOpenId(null);
    if (params.has('open')) {
      params.delete('open');
      setParams(params, { replace: true });
    }
  };

  return (
    <StoreLayout description="Review KYC before a store can sell, and suspend stores that break the rules.">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search store, slug, creator name or email…" />
        <Select<KycFilter>
          value={kyc}
          onChange={setKyc}
          options={[
            { value: 'all', label: 'Any KYC' },
            { value: 'pending', label: 'KYC waiting for review' },
            { value: 'verified', label: 'KYC verified' },
            { value: 'rejected', label: 'KYC rejected' },
            { value: 'not_submitted', label: 'KYC not submitted' },
          ]}
        />
        <Select<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Any status' },
            { value: 'pending_review', label: 'Pending review' },
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Setting up' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </div>
      <ErrorBanner message={list.error} />

      {list.loading ? (
        <Loading text="Loading stores…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{list.total.toLocaleString('en-IN')} stores</p>
          <div className="mt-2 space-y-3">
            {list.items.length === 0 && <EmptyState icon={StoreIcon} message="No stores match these filters." />}
            {list.items.map((s) => (
              <Card key={s._id} className="p-4">
                <button onClick={() => setOpenId(s._id)} className="flex w-full flex-wrap items-center gap-4 text-left">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-lg font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                      {s.name.trim()[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                      <StatusBadge status={s.status} />
                      <Badge tone={s.kycStatus === 'pending' ? 'amber' : s.kycStatus === 'verified' ? 'emerald' : s.kycStatus === 'rejected' ? 'rose' : 'gray'}>
                        KYC: {label(s.kycStatus)}
                      </Badge>
                      {!s.isOpen && <Badge tone="gray">Closed by creator</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                      {s.user?.name} · {s.user?.email} · /{s.slug}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-white/55">
                    <p>
                      <b className="text-sm text-gray-900 dark:text-white">{rupees(s.stats.grossSales)}</b> sales
                    </p>
                    <p>{s.stats.orders} orders · {s.submittedAt ? `submitted ${dateTime(s.submittedAt)}` : `created ${dateTime(s.createdAt)}`}</p>
                  </div>
                </button>
              </Card>
            ))}
          </div>
          <Pagination page={list.page} pages={list.pages} onPage={list.goTo} />
        </>
      )}

      {openId && <StoreDetailModal id={openId} onClose={closeDetail} onChanged={list.reload} />}
    </StoreLayout>
  );
}

function isPdf(url?: string) {
  if (!url) return false;
  try {
    return /\.pdf$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function DocPreview({ title, url }: { title: string; url?: string }) {
  if (!url) return <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 dark:border-white/10">No {title}</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
      {isPdf(url) ? (
        <span className="flex h-40 items-center justify-center gap-2 bg-gray-50 text-sm font-semibold text-gray-600 dark:bg-white/5 dark:text-white/70">
          <FileText size={20} /> Open {title} (PDF)
        </span>
      ) : (
        <img src={url} alt={title} className="h-40 w-full object-contain bg-gray-50 transition-transform group-hover:scale-[1.02] dark:bg-white/5" />
      )}
      <span className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 dark:text-white/70">
        {title} <ExternalLink size={12} />
      </span>
    </a>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500 dark:text-white/50">{k}</span>
      <span className="text-right font-semibold text-gray-900 dark:text-white">{v || '—'}</span>
    </div>
  );
}

function StoreDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<StoreDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState<'reject' | 'suspend' | null>(null);

  const load = useCallback(() => {
    storeAdminApi
      .store(id)
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      load();
      onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const s = data?.store;
  return (
    <>
      <Modal open title={s ? s.name : 'Store'} subtitle={s ? `${s.user?.name} · ${s.user?.email}${s.user?.phone ? ` · ${s.user.phone}` : ''}` : undefined} onClose={onClose} wide>
        <ErrorBanner message={error} onClose={() => setError('')} />
        {!data || !s ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={s.status} />
              <Badge tone={s.kycStatus === 'verified' ? 'emerald' : s.kycStatus === 'pending' ? 'amber' : 'gray'}>KYC: {label(s.kycStatus)}</Badge>
              {s.statusReason && <span className="text-xs text-rose-500">Reason: {s.statusReason}</span>}
              <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-white/40">/{s.slug}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {s.kycStatus === 'pending' && (
                <>
                  <Button onClick={() => window.confirm('Approve KYC? The store goes live and can start selling.') && act(() => storeAdminApi.reviewKyc(id, { decision: 'approve' }))} disabled={busy}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Approve KYC
                  </Button>
                  <Button variant="danger" onClick={() => setReasonFor('reject')} disabled={busy}>
                    <XCircle size={14} /> Reject KYC
                  </Button>
                </>
              )}
              {s.status === 'suspended' ? (
                <Button variant="outline" onClick={() => window.confirm('Reinstate this store?') && act(() => storeAdminApi.setStoreStatus(id, { action: 'reinstate' }))} disabled={busy}>
                  <RotateCcw size={14} /> Reinstate
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setReasonFor('suspend')} disabled={busy}>
                  <Ban size={14} /> Suspend store
                </Button>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">KYC</p>
                {data.kyc && data.kyc.status !== 'not_submitted' ? (
                  <>
                    <Row k="PAN" v={data.kyc.panNumber} />
                    <Row k="Name on PAN" v={data.kyc.panName} />
                    <Row k="ID type" v={label(data.kyc.idType || '')} />
                    <Row k="Submitted" v={dateTime(data.kyc.submittedAt)} />
                    {data.kyc.reviewedAt && <Row k="Reviewed" v={dateTime(data.kyc.reviewedAt)} />}
                    {data.kyc.rejectionReason && <Row k="Rejected for" v={<span className="text-rose-500">{data.kyc.rejectionReason}</span>} />}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <DocPreview title="PAN card" url={data.kyc.documents.pan} />
                      <DocPreview title="ID proof" url={data.kyc.documents.id} />
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400 dark:text-white/40">Document links expire in 10 minutes — reopen this window to refresh them.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Not submitted yet.</p>
                )}
              </Card>

              <Card className="p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Payout</p>
                {data.payout ? (
                  data.payout.method === 'upi' ? (
                    <Row k="UPI ID" v={data.payout.upiId} />
                  ) : (
                    <>
                      <Row k="Account holder" v={data.payout.accountHolderName} />
                      <Row k="Account number" v={data.payout.accountNumber} />
                      <Row k="IFSC" v={data.payout.ifsc} />
                      <Row k="Bank" v={data.payout.bankName} />
                    </>
                  )
                ) : (
                  <p className="text-sm text-gray-400">Not added yet.</p>
                )}
                <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Numbers</p>
                <Row k="Gross sales" v={rupees(s.stats.grossSales)} />
                <Row k="Fanitt fees" v={rupees(s.stats.feesPaid)} />
                <Row k="Creator earned" v={rupees(s.stats.netEarnings)} />
                <Row k="Refunds" v={rupees(s.stats.refunds)} />
                <Row k="Orders · views" v={`${s.stats.orders} · ${s.stats.views}`} />
                <Row k="Terms accepted" v={s.termsAcceptedAt ? `v${s.termsVersion} · ${dateTime(s.termsAcceptedAt)}` : 'No'} />
              </Card>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Products ({data.products.length})</p>
              {data.products.length === 0 ? (
                <p className="text-sm text-gray-400">No products yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.products.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                      {p.coverUrl ? <img src={p.coverUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-white/10" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-gray-500 dark:text-white/50">
                          {p.price ? rupees(p.price) : 'Free'} · {p.salesCount} sold
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Recent orders</p>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 text-sm dark:divide-white/5">
                  {data.recentOrders.map((o) => (
                    <div key={o._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-gray-700 dark:text-white/80">
                        {o.itemTitle} <span className="text-xs text-gray-400">· {o.buyer?.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <b className="text-gray-900 dark:text-white">{rupees(o.amount)}</b>
                        <StatusBadge status={o.status} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-white/40">
              <CheckCircle2 size={12} /> Created {dateTime(s.createdAt)}
              {s.activatedAt ? ` · live since ${dateTime(s.activatedAt)}` : ''}
            </p>
          </div>
        )}
      </Modal>

      <ReasonModal
        open={reasonFor === 'reject'}
        title="Reject KYC"
        hint="The creator sees this reason and can upload new documents."
        presets={['PAN photo is blurry', 'Name on PAN does not match', 'ID proof is not valid', 'Documents are cut off']}
        confirmLabel="Reject KYC"
        onClose={() => setReasonFor(null)}
        onSubmit={async (reason) => {
          await storeAdminApi.reviewKyc(id, { decision: 'reject', reason });
          load();
          onChanged();
        }}
      />
      <ReasonModal
        open={reasonFor === 'suspend'}
        title="Suspend store"
        hint="The store and its products disappear until you reinstate it. The creator is notified."
        presets={['Selling prohibited content', 'Fraud investigation', 'Repeated buyer complaints']}
        confirmLabel="Suspend"
        onClose={() => setReasonFor(null)}
        onSubmit={async (reason) => {
          await storeAdminApi.setStoreStatus(id, { action: 'suspend', reason });
          load();
          onChanged();
        }}
      />
    </>
  );
}

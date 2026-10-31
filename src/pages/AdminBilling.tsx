// File: src/pages/AdminBilling.tsx
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Percent, Receipt, Save, Search } from '@/icons';
import { billingAdminApi, type AdminInvoice, type BillingSettings, type InvoiceList } from '@/services/billingAdminApi';
import { adminApi, type AdminSubscriptionPlan } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Tab, TabGroup, toast } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white';

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3.5 dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
        {hint && <p className="text-xs text-gray-400 dark:text-white/40">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/15')}
      >
        <span className={cn('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform', on ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  );
}

function Label({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span>
      {hint && <span className="mb-1.5 block text-xs text-gray-400 dark:text-white/40">{hint}</span>}
    </>
  );
}

function PercentInput({ value, onChange, max = 100 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="relative max-w-[160px]">
      <input type="number" min={0} max={max} step={0.5} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputClasses} pr-9`} />
      <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
    </div>
  );
}

export default function AdminBilling() {
  const [tab, setTab] = useState<'settings' | 'invoices'>('settings');
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Billing & GST"
        description="Platform fee is taken only when a creator withdraws. Turn GST on or off, change fees per plan, set the minimum withdrawal, and edit the creator / brand agreements."
      />
      <TabGroup>
        <Tab active={tab === 'settings'} onClick={() => setTab('settings')} groupId="billing">
          Settings
        </Tab>
        <Tab active={tab === 'invoices'} onClick={() => setTab('invoices')} groupId="billing">
          Invoices
        </Tab>
      </TabGroup>
      <div className="mt-5">{tab === 'settings' ? <SettingsTab /> : <InvoicesTab />}</div>
    </div>
  );
}

// --- Settings -----------------------------------------------------------------------

function SettingsTab() {
  const [s, setS] = useState<BillingSettings | null>(null);
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [planFees, setPlanFees] = useState<Record<string, number>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([billingAdminApi.getSettings(), adminApi.listSubscriptionPlans('creator')])
      .then(([settings, list]) => {
        setS(settings);
        setPlans(list);
        setPlanFees(Object.fromEntries(list.map((p) => [p._id, p.platformFeePercent])));
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) => setS((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!s) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await billingAdminApi.updateSettings({
        gstEnabled: s.gstEnabled,
        gstPercent: s.gstPercent,
        gstOnWithdrawalFee: s.gstOnWithdrawalFee,
        gstOnBrandPayments: s.gstOnBrandPayments,
        creatorMinWithdrawal: s.creatorMinWithdrawal,
        defaultCreatorFeePercent: s.defaultCreatorFeePercent,
        invoicePrefix: s.invoicePrefix,
        businessName: s.businessName,
        businessGstin: s.businessGstin,
        businessAddress: s.businessAddress,
        businessEmail: s.businessEmail,
        agreementsEnabled: s.agreementsEnabled,
        creatorAgreementText: s.creatorAgreementText,
        brandAgreementText: s.brandAgreementText,
      });
      setS(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const savePlanFee = async (plan: AdminSubscriptionPlan) => {
    const fee = planFees[plan._id];
    if (!(fee >= 0 && fee <= 100)) {
      toast.error('Fee must be between 0 and 100');
      return;
    }
    setSavingPlan(plan._id);
    try {
      const updated = await adminApi.updateSubscriptionPlan(plan._id, { platformFeePercent: fee });
      setPlans((prev) => prev.map((p) => (p._id === plan._id ? { ...p, platformFeePercent: updated.platformFeePercent } : p)));
      toast.success(`${plan.name}: withdrawal fee is now ${updated.platformFeePercent}%`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSavingPlan(null);
    }
  };

  // Live example so the admin sees what a creator will get.
  const example = useMemo(() => {
    if (!s) return null;
    const amount = 1000000; // ₹10,000
    const feePct = plans.find((p) => p.isDefault)?.platformFeePercent ?? s.defaultCreatorFeePercent;
    const fee = Math.round((amount * feePct) / 100);
    const gst = s.gstEnabled && s.gstOnWithdrawalFee ? Math.round((fee * s.gstPercent) / 100) : 0;
    const brandGst = s.gstEnabled && s.gstOnBrandPayments ? Math.round((amount * s.gstPercent) / 100) : 0;
    return { amount, feePct, fee, gst, net: amount - fee - gst, brandGst };
  }, [s, plans]);

  if (loading) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading billing settings…</p>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertCircle size={16} className="shrink-0" /> {error || 'Couldn’t load settings'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* GST */}
      <Card className="space-y-4 p-5">
        <p className="text-base font-bold text-gray-900 dark:text-white">GST</p>
        <Toggle on={s.gstEnabled} onChange={(v) => set('gstEnabled', v)} label="Charge GST" hint="Master switch. Off = no GST anywhere." />
        {s.gstEnabled && (
          <>
            <label className="block">
              <Label title="GST rate" hint="Usually 18%." />
              <PercentInput value={s.gstPercent} max={50} onChange={(v) => set('gstPercent', v)} />
            </label>
            <Toggle
              on={s.gstOnWithdrawalFee}
              onChange={(v) => set('gstOnWithdrawalFee', v)}
              label="GST on creator withdrawal fee"
              hint="GST is added on Fanitt’s platform fee and taken from the payout."
            />
            <Toggle
              on={s.gstOnBrandPayments}
              onChange={(v) => set('gstOnBrandPayments', v)}
              label="GST on brand payments"
              hint="Added on top when a brand funds a campaign or milestone. The creator still gets the full amount."
            />
          </>
        )}
      </Card>

      {/* Withdrawals & fees */}
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white">Withdrawals & platform fee</p>
          <p className="text-xs text-gray-400 dark:text-white/40">
            No fee is cut on any payment. Fanitt’s fee is taken only when a creator withdraws, using their plan’s fee. Brands, agencies and fans withdraw without a fee.
          </p>
        </div>
        <label className="block">
          <Label title="Creator minimum withdrawal" hint="In rupees." />
          <div className="relative max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
            <input
              type="number"
              min={0}
              step={100}
              value={s.creatorMinWithdrawal / 100}
              onChange={(e) => set('creatorMinWithdrawal', Math.round(Number(e.target.value) * 100))}
              className={`${inputClasses} pl-7`}
            />
          </div>
        </label>

        <div>
          <Label title="Fee per creator plan" hint="Set a different withdrawal fee for each plan (e.g. Lite 10%, Pro 5%)." />
          {plans.length === 0 ? (
            <p className="text-sm text-gray-500">No creator plans found. Add them in Subscription plans.</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
              {plans.map((p) => {
                const changed = planFees[p._id] !== p.platformFeePercent;
                return (
                  <div key={p._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {p.name}{' '}
                        <span className="font-normal text-gray-400">
                          · {p.price > 0 ? `${rupees(p.price)}/${p.billingCycle === 'yearly' ? 'yr' : 'mo'}` : 'Free'}
                        </span>
                      </p>
                      <div className="mt-0.5 flex gap-1.5">
                        {p.isDefault && <Badge tone="sky">Default</Badge>}
                        {!p.isActive && <Badge tone="gray">Retired</Badge>}
                      </div>
                    </div>
                    <PercentInput value={planFees[p._id] ?? 0} onChange={(v) => setPlanFees((prev) => ({ ...prev, [p._id]: v }))} />
                    <Button size="sm" variant={changed ? 'primary' : 'outline'} disabled={!changed} loading={savingPlan === p._id} onClick={() => savePlanFee(p)}>
                      Save
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label className="block">
          <Label title="Fallback fee" hint="Used only if a creator’s plan has no fee set." />
          <PercentInput value={s.defaultCreatorFeePercent} onChange={(v) => set('defaultCreatorFeePercent', v)} />
        </label>

        {example && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:bg-white/5 dark:text-white/60">
            <p className="font-bold text-gray-800 dark:text-white/80">Example (default plan)</p>
            <p className="mt-1">
              Creator withdraws {rupees(example.amount)} → fee {example.feePct}% {rupees(example.fee)}
              {example.gst > 0 ? ` + GST ${rupees(example.gst)}` : ''} → gets <b>{rupees(example.net)}</b>
            </p>
            <p className="mt-0.5">
              Brand funds {rupees(example.amount)} → pays <b>{rupees(example.amount + example.brandGst)}</b>
              {example.brandGst > 0 ? ` (incl. GST ${rupees(example.brandGst)})` : ''}
            </p>
          </div>
        )}
      </Card>

      {/* Invoice details */}
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white">Invoice details</p>
          <p className="text-xs text-gray-400 dark:text-white/40">Printed on every invoice. Invoices are emailed and shown in the app under Wallet → Invoices.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label title="Business name" />
            <input value={s.businessName} onChange={(e) => set('businessName', e.target.value)} className={inputClasses} />
          </label>
          <label className="block">
            <Label title="GSTIN" />
            <input value={s.businessGstin} onChange={(e) => set('businessGstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" className={inputClasses} />
          </label>
          <label className="block">
            <Label title="Billing email" />
            <input type="email" value={s.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} className={inputClasses} />
          </label>
          <label className="block">
            <Label title="Invoice number prefix" hint="e.g. FAN → FAN/2026-27/000001" />
            <input value={s.invoicePrefix} maxLength={10} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} className={inputClasses} />
          </label>
        </div>
        <label className="block">
          <Label title="Business address" />
          <textarea rows={3} value={s.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} className={cn(inputClasses, 'resize-none')} />
        </label>
      </Card>

      {/* Agreements */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-bold text-gray-900 dark:text-white">Creator & brand agreements</p>
          <Badge tone="gray">Version {s.agreementVersion}</Badge>
        </div>
        <Toggle
          on={s.agreementsEnabled}
          onChange={(v) => set('agreementsEnabled', v)}
          label="Require agreements"
          hint="Creator ticks it before sending a proposal. Brand ticks it when publishing a campaign and when hiring. Each side sees the other’s."
        />
        {s.agreementsEnabled && (
          <>
            <label className="block">
              <Label title="Creator agreement" hint="Shown when a creator sends a proposal." />
              <textarea rows={6} maxLength={4000} value={s.creatorAgreementText} onChange={(e) => set('creatorAgreementText', e.target.value)} className={cn(inputClasses, 'resize-y')} />
            </label>
            <label className="block">
              <Label title="Brand agreement" hint="Shown when a brand publishes a campaign and when it hires a creator." />
              <textarea rows={6} maxLength={4000} value={s.brandAgreementText} onChange={(e) => set('brandAgreementText', e.target.value)} className={cn(inputClasses, 'resize-y')} />
            </label>
            <p className="text-xs text-gray-400 dark:text-white/40">
              Editing a text raises the version. Agreements already accepted keep the exact text the person agreed to.
            </p>
          </>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
        <Button onClick={save} loading={saving}>
          <Save size={15} /> Save settings
        </Button>
      </div>
    </div>
  );
}

// --- Invoices -----------------------------------------------------------------------

const KIND_LABEL: Record<AdminInvoice['kind'], string> = { brand_payment: 'Brand payment', withdrawal_fee: 'Withdrawal fee' };

function InvoicesTab() {
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InvoiceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    billingAdminApi
      .invoices({ page, kind, q: query })
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, kind, query]);

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-gray-400">Invoices</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.total.toLocaleString('en-IN')}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-400">Platform fees invoiced</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{rupees(data.totals.platformFees)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-400">GST collected</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{rupees(data.totals.gst)}</p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search number, name or email"
            className={`${inputClasses} pl-8`}
          />
        </div>
        {[
          { v: '', l: 'All' },
          { v: 'brand_payment', l: 'Brand payments' },
          { v: 'withdrawal_fee', l: 'Withdrawal fees' },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => {
              setKind(o.v);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
              kind === o.v ? 'border-orange-400 bg-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-orange-300 dark:border-white/10 dark:text-white/70'
            )}
          >
            {o.l}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !data || data.invoices.length === 0 ? (
        <EmptyState icon={Receipt} message="No invoices yet. They’re created when a brand pays (with GST) or a creator’s withdrawal is marked paid." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/5 dark:text-white/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Billed to</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">GST</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {data.invoices.map((i) => (
                  <tr key={i._id} className={cn(i.status === 'cancelled' && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                        <FileText size={13} className="text-gray-400" /> {i.number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(i.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        {i.emailedAt ? ' · emailed' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{i.billedTo?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{i.billedTo?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={i.kind === 'brand_payment' ? 'sky' : 'amber'}>{KIND_LABEL[i.kind]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{rupees(i.subtotal)}</td>
                    <td className="px-4 py-3 text-right">{i.gstAmount > 0 ? `${rupees(i.gstAmount)} (${i.gstPercent}%)` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{rupees(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 dark:border-white/5">
            <Pagination page={data.page} pages={data.pages} onPage={setPage} total={data.total} />
          </div>
        </Card>
      )}
    </div>
  );
}

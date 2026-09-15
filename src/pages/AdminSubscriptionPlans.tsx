import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Plus, Pencil, X, Layers } from 'lucide-react';
import { adminApi, type AdminSubscriptionPlan } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const EMPTY_FORM = {
  name: '',
  slug: '',
  appliesTo: 'creator' as 'creator' | 'brand',
  price: 0,
  billingCycle: 'monthly' as 'monthly' | 'yearly',
  isDefault: false,
  isActive: true,
  sortOrder: 0,
  proposalLimit: '' as string | number,
  extraProposalCost: 3,
  platformFeePercent: 9,
  campaignAccessTier: 'lite_only' as 'lite_only' | 'all',
  hasEarlyAccess: false,
  campaignPostLimit: '' as string | number,
  campaignVisibilityTier: 'lite' as 'lite' | 'exclusive',
  canSetApplicantLimit: false,
  isFeaturedListing: false,
  description: '',
  perks: '',
};

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white';
const labelClass = 'mb-1 block text-xs font-semibold text-gray-500 dark:text-white/60';
const checkboxRowClass = 'flex items-center gap-2.5 text-sm text-gray-700 dark:text-white/80';
const checkboxClass = 'h-4 w-4 accent-orange-600';

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'creator' | 'brand'>('creator');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listSubscriptionPlans()
      .then(setPlans)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, appliesTo: tab, platformFeePercent: tab === 'creator' ? 9 : 0 });
    setFormOpen(true);
  };

  const openEdit = (plan: AdminSubscriptionPlan) => {
    setEditingId(plan._id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      appliesTo: plan.appliesTo,
      price: plan.price / 100,
      billingCycle: plan.billingCycle,
      isDefault: plan.isDefault,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      proposalLimit: plan.proposalLimit ?? '',
      extraProposalCost: plan.extraProposalCost / 100,
      platformFeePercent: plan.platformFeePercent,
      campaignAccessTier: plan.campaignAccessTier,
      hasEarlyAccess: plan.hasEarlyAccess,
      campaignPostLimit: plan.campaignPostLimit ?? '',
      campaignVisibilityTier: plan.campaignVisibilityTier,
      canSetApplicantLimit: plan.canSetApplicantLimit,
      isFeaturedListing: plan.isFeaturedListing,
      description: plan.description,
      perks: plan.perks.join('\n'),
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        appliesTo: form.appliesTo,
        price: Math.round(form.price * 100),
        billingCycle: form.billingCycle,
        isDefault: form.isDefault,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        proposalLimit: form.proposalLimit === '' ? null : Number(form.proposalLimit),
        extraProposalCost: Math.round(form.extraProposalCost * 100),
        platformFeePercent: form.platformFeePercent,
        campaignAccessTier: form.campaignAccessTier,
        hasEarlyAccess: form.hasEarlyAccess,
        campaignPostLimit: form.campaignPostLimit === '' ? null : Number(form.campaignPostLimit),
        campaignVisibilityTier: form.campaignVisibilityTier,
        canSetApplicantLimit: form.canSetApplicantLimit,
        isFeaturedListing: form.isFeaturedListing,
        description: form.description,
        perks: form.perks.split('\n').map((p) => p.trim()).filter(Boolean),
      };

      if (editingId) {
        const updated = await adminApi.updateSubscriptionPlan(editingId, payload);
        setPlans((prev) => prev.map((p) => (p._id === editingId ? updated : p)));
      } else {
        const created = await adminApi.createSubscriptionPlan(payload);
        setPlans((prev) => [...prev, created]);
      }
      setFormOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: AdminSubscriptionPlan) => {
    setError('');
    try {
      if (plan.isActive) {
        const updated = await adminApi.deleteSubscriptionPlan(plan._id);
        setPlans((prev) => prev.map((p) => (p._id === plan._id ? updated : p)));
      } else {
        const updated = await adminApi.updateSubscriptionPlan(plan._id, { isActive: true });
        setPlans((prev) => prev.map((p) => (p._id === plan._id ? updated : p)));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const visiblePlans = plans.filter((p) => p.appliesTo === tab);

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        description="Manage Creator and Brand subscription tiers — pricing, limits, and perks. Changes apply immediately platform-wide."
        actions={
          <Button onClick={openCreate}>
            <Plus size={14} /> New Plan
          </Button>
        }
      />

      <TabGroup>
        {(['creator', 'brand'] as const).map((t) => (
          <Tab key={t} active={tab === t} onClick={() => setTab(t)}>
            <span className="capitalize">{t}</span>
          </Tab>
        ))}
      </TabGroup>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading plans...</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => (
            <Card key={plan._id} className={cn('p-5', !plan.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                      <Layers size={14} />
                    </span>
                    <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
                    {plan.isDefault && <Badge tone="emerald">Default</Badge>}
                    {plan.isFeaturedListing && <Badge tone="amber">Featured</Badge>}
                  </div>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    {plan.price === 0 ? 'Free' : formatRupees(plan.price)}
                    {plan.price > 0 && <span className="text-xs font-normal text-gray-400 dark:text-white/40"> /{plan.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>}
                  </p>
                </div>
                <button onClick={() => openEdit(plan)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white">
                  <Pencil size={14} />
                </button>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-gray-500 dark:text-white/60">
                {plan.appliesTo === 'creator' ? (
                  <>
                    <p>Proposals: {plan.proposalLimit ?? 'Unlimited'}/cycle</p>
                    <p>Extra proposal: {formatRupees(plan.extraProposalCost)}</p>
                    <p>Platform fee: {plan.platformFeePercent}%</p>
                    <p>Campaign access: {plan.campaignAccessTier === 'all' ? 'Lite + Exclusive' : 'Lite only'}</p>
                    <p>Early access: {plan.hasEarlyAccess ? 'Yes' : 'No'}</p>
                  </>
                ) : (
                  <>
                    <p>Campaigns: {plan.campaignPostLimit ?? 'Unlimited'}/cycle</p>
                    <p>Visibility: {plan.campaignVisibilityTier === 'exclusive' ? 'Exclusive' : 'Lite'}</p>
                    <p>Applicant limit: {plan.canSetApplicantLimit ? 'Can set' : 'Not allowed'}</p>
                  </>
                )}
              </div>

              <Button
                variant={plan.isActive ? 'danger' : 'outline'}
                size="sm"
                className={cn('mt-4 w-full justify-center', !plan.isActive && '!border-emerald-300 !text-emerald-600 dark:!border-emerald-500/40 dark:!text-emerald-300')}
                onClick={() => handleToggleActive(plan)}
              >
                {plan.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </Card>
          ))}

          {visiblePlans.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-400 dark:text-white/40">No {tab} plans yet — create one to get started.</p>
          )}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFormOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#171B26]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Plan' : 'New Plan'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Name</span>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Slug</span>
                  <input required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="creator-pro" className={inputClass} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Applies to</span>
                  <select value={form.appliesTo} onChange={(e) => setForm((f) => ({ ...f, appliesTo: e.target.value as 'creator' | 'brand' }))} className={inputClass}>
                    <option value="creator">Creator</option>
                    <option value="brand">Brand</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Billing cycle</span>
                  <select value={form.billingCycle} onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value as 'monthly' | 'yearly' }))} className={inputClass}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Price (₹, 0 for free)</span>
                <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className={inputClass} />
              </label>

              {form.appliesTo === 'creator' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Proposal limit (blank = unlimited)</span>
                      <input type="number" min="0" value={form.proposalLimit} onChange={(e) => setForm((f) => ({ ...f, proposalLimit: e.target.value }))} className={inputClass} />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Extra proposal cost (₹)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.extraProposalCost}
                        onChange={(e) => setForm((f) => ({ ...f, extraProposalCost: Number(e.target.value) }))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Platform fee (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.platformFeePercent}
                        onChange={(e) => setForm((f) => ({ ...f, platformFeePercent: Number(e.target.value) }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Campaign access</span>
                      <select
                        value={form.campaignAccessTier}
                        onChange={(e) => setForm((f) => ({ ...f, campaignAccessTier: e.target.value as 'lite_only' | 'all' }))}
                        className={inputClass}
                      >
                        <option value="lite_only">Lite only</option>
                        <option value="all">Lite + Exclusive</option>
                      </select>
                    </label>
                  </div>
                  <label className={checkboxRowClass}>
                    <input type="checkbox" checked={form.hasEarlyAccess} onChange={(e) => setForm((f) => ({ ...f, hasEarlyAccess: e.target.checked }))} className={checkboxClass} />
                    Early access to exclusive campaigns
                  </label>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Campaign post limit (blank = unlimited)</span>
                      <input
                        type="number"
                        min="0"
                        value={form.campaignPostLimit}
                        onChange={(e) => setForm((f) => ({ ...f, campaignPostLimit: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Campaign visibility</span>
                      <select
                        value={form.campaignVisibilityTier}
                        onChange={(e) => setForm((f) => ({ ...f, campaignVisibilityTier: e.target.value as 'lite' | 'exclusive' }))}
                        className={inputClass}
                      >
                        <option value="lite">Lite</option>
                        <option value="exclusive">Exclusive</option>
                      </select>
                    </label>
                  </div>
                  <label className={checkboxRowClass}>
                    <input type="checkbox" checked={form.canSetApplicantLimit} onChange={(e) => setForm((f) => ({ ...f, canSetApplicantLimit: e.target.checked }))} className={checkboxClass} />
                    Can set a max-applicants cap per campaign
                  </label>
                  <label className={checkboxRowClass}>
                    <input type="checkbox" checked={form.isFeaturedListing} onChange={(e) => setForm((f) => ({ ...f, isFeaturedListing: e.target.checked }))} className={checkboxClass} />
                    Featured listing (campaigns sort first)
                  </label>
                </>
              )}

              <label className="block">
                <span className={labelClass}>Description (shown on pricing page)</span>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={cn('resize-none', inputClass)} />
              </label>

              <label className="block">
                <span className={labelClass}>Perks (one per line)</span>
                <textarea
                  rows={4}
                  value={form.perks}
                  onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
                  placeholder={'90 proposals/month\n5% platform fee\nStorefront access'}
                  className={cn('resize-none', inputClass)}
                />
              </label>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className={checkboxClass} />
                  Default plan for new signups
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className={checkboxClass} />
                  Active
                </label>
              </div>

              <Button type="submit" className="w-full justify-center" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : editingId ? 'Save Changes' : 'Create Plan'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
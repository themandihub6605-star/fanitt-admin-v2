// File: src/components/UserPlanCard.tsx  (fanitt-admin)
import { useEffect, useMemo, useState } from 'react';
import { Crown, Loader2, CalendarClock } from '@/icons';
import { adminApi, type AdminSubscriptionPlan, type AdminUserSubscription } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { Card, Badge, Button, confirmDialog, toast } from '@/components/AdminUI';

/**
 * User detail → "Plan" card. Shows the brand/creator's current plan and lets
 * the admin move them to any other plan of their role (e.g. Lite → Pro) for
 * a chosen period. Uses PATCH /admin/users/:id/subscription, which also
 * notifies the user.
 */

const PERIODS: { value: string; label: string; days?: number }[] = [
  { value: 'plan', label: "Plan's own cycle (1 month / 1 year)" },
  { value: '30', label: '1 month', days: 30 },
  { value: '90', label: '3 months', days: 90 },
  { value: '180', label: '6 months', days: 180 },
  { value: '365', label: '1 year', days: 365 },
  { value: 'custom', label: 'Custom days…' },
];

const fieldClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-orange-500/20';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const rupees = (paise: number) => (paise ? `₹${Math.round(paise / 100).toLocaleString('en-IN')}` : 'Free');

export function UserPlanCard({ userId, role }: { userId: string; role: string }) {
  const appliesTo = role === 'brand' ? 'brand' : role === 'creator' ? 'creator' : null;

  const [sub, setSub] = useState<AdminUserSubscription | null>(null);
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState('');
  const [period, setPeriod] = useState('plan');
  const [customDays, setCustomDays] = useState('');

  useEffect(() => {
    if (!appliesTo) return;
    setLoading(true);
    Promise.all([adminApi.getUserSubscription(userId), adminApi.listSubscriptionPlans(appliesTo)])
      .then(([s, p]) => {
        setSub(s);
        setPlans(p);
      })
      .catch((e) => toast.error(getApiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [userId, appliesTo]);

  const defaultPlan = useMemo(() => plans.find((p) => p.isDefault) || null, [plans]);
  const current = sub?.plan || defaultPlan;
  const selected = plans.find((p) => p._id === planId) || null;
  const ended = !!sub && (sub.status !== 'active' || new Date(sub.currentPeriodEnd) < new Date());

  if (!appliesTo) return null;

  const periodDays = (): number | undefined | null => {
    if (period === 'plan') return undefined;
    if (period === 'custom') {
      const d = Math.floor(Number(customDays));
      return d >= 1 && d <= 3650 ? d : null;
    }
    return PERIODS.find((p) => p.value === period)?.days;
  };

  const save = async () => {
    if (!selected) return;
    const days = periodDays();
    if (days === null) {
      toast.error('Enter days between 1 and 3650');
      return;
    }
    const length = days ? `${days} days` : selected.billingCycle === 'yearly' ? '1 year' : '1 month';
    const ok = await confirmDialog({
      title: `Move to ${selected.name}?`,
      message: `This user will be on the ${selected.name} (${selected.billingCycle}) plan for ${length}, starting today. No payment is taken, and the user gets a notification.`,
      confirmLabel: 'Change plan',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await adminApi.setUserSubscription(userId, { planId: selected._id, ...(days ? { periodDays: days } : {}) });
      const fresh = await adminApi.getUserSubscription(userId);
      setSub(fresh);
      setPlanId('');
      setPeriod('plan');
      setCustomDays('');
      toast.success(`Moved to ${selected.name}`);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
        <Crown size={13} /> Plan
      </h2>

      {loading ? (
        <div className="mt-4 flex justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Current plan */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                {current ? current.name : 'No plan'}
                {current && <span className="ml-1.5 text-sm font-semibold capitalize text-gray-400 dark:text-white/40">· {current.billingCycle}</span>}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {!sub ? (
                  <Badge tone="gray">Default (free)</Badge>
                ) : ended ? (
                  <Badge tone="rose">{sub.status === 'active' ? 'Ended' : sub.status.replace('_', ' ')}</Badge>
                ) : (
                  <Badge tone="emerald">Active</Badge>
                )}
                {sub?.razorpaySubscriptionId && <Badge tone="orange">Paid via Razorpay</Badge>}
                {sub?.cancelAtPeriodEnd && <Badge tone="amber">Cancels at period end</Badge>}
              </div>
            </div>
            {sub && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/70">
                <CalendarClock size={16} className="text-gray-400" />
                {fmtDate(sub.currentPeriodStart)} → <b>{fmtDate(sub.currentPeriodEnd)}</b>
              </div>
            )}
            {sub && (
              <div className="text-sm text-gray-600 dark:text-white/70">
                {appliesTo === 'creator'
                  ? `Proposals used this cycle: ${sub.proposalsUsedThisCycle}${sub.plan?.proposalLimit != null ? ` / ${sub.plan.proposalLimit}` : ''}`
                  : `Campaigns posted this cycle: ${sub.campaignsPostedThisCycle}${sub.plan?.campaignPostLimit != null ? ` / ${sub.plan.campaignPostLimit}` : ''}`}
              </div>
            )}
          </div>

          {/* Change plan */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/10">
            <p className="text-sm font-bold text-gray-800 dark:text-white/85">Change plan</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={fieldClass}>
                <option value="">Choose a plan…</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} · {p.billingCycle} · {rupees(p.price)}
                    {p.isDefault ? ' (default)' : ''}
                    {p.isActive ? '' : ' — retired'}
                  </option>
                ))}
              </select>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={fieldClass}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {period === 'custom' ? (
                <input
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="Number of days, e.g. 45"
                  className={fieldClass}
                />
              ) : (
                <Button onClick={save} disabled={!selected || saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />} Change plan
                </Button>
              )}
            </div>
            {period === 'custom' && (
              <div className="mt-3">
                <Button onClick={save} disabled={!selected || saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />} Change plan
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400 dark:text-white/40">
              Starts today and resets this cycle’s usage. No payment is taken. If the user has a Razorpay subscription, it is detached from this account.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
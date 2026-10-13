import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, FileText, LogIn, Sparkles, Star, Store, UsersRound, Wallet } from '@/icons';
import { Card, CardHeader, Skeleton, fmt, type Tone, toneHex } from '@/components/AdminUI';
import { manageApi, type UserOverview } from '@/services/manageApi';
import type { LucideIcon } from '@/icons';

function Tile({ icon: Icon, label, value, sub, tone = 'orange' }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rise rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${toneHex(tone)}18`, color: toneHex(tone) }}>
          <Icon size={14} />
        </span>
        <p className="text-xs font-medium text-gray-500 dark:text-white/50">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-gray-950 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400 dark:text-white/40">{sub}</p>}
    </div>
  );
}

const n = (v: number | null | undefined) => fmt.number(v ?? 0);

/** Everything about one user in numbers (GET /admin/monitor/users/:id/overview). */
export function User360({ userId }: { userId: string }) {
  const [data, setData] = useState<UserOverview | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setData(null);
    manageApi
      .userOverview(userId)
      .then(setData)
      // Older backend (or no access): just don't show this card.
      .catch(() => setHidden(true));
  }, [userId]);

  if (hidden) return null;

  return (
    <Card className="mt-4">
      <CardHeader title="360° view" description="Money, content and activity for this account, counted from the database" icon={Sparkles} />
      {!data ? (
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Money</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile icon={ArrowDownRight} label="Earned" value={fmt.rupeesCompact(data.money.earned)} sub={`${n(data.money.earnedCount)} payments received`} tone="emerald" />
              <Tile icon={ArrowUpRight} label="Spent on Fanitt" value={fmt.rupeesCompact(data.money.spent)} sub={`${n(data.money.spentCount)} payments made`} tone="sky" />
              <Tile icon={Wallet} label="Wallet now" value={fmt.rupeesCompact(data.money.wallet)} sub={data.money.withdrawPending ? `${fmt.rupeesCompact(data.money.withdrawPending)} withdrawal waiting` : 'No withdrawal waiting'} tone="violet" />
              <Tile icon={Banknote} label="Paid out" value={fmt.rupeesCompact(data.money.withdrawnPaid)} sub={data.money.storeSoldAmount ? `${fmt.rupeesCompact(data.money.storeSoldAmount)} from store sales` : 'Completed withdrawals'} tone="amber" />
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Content & activity</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile icon={FileText} label="Posts & reels" value={`${n(data.content.posts)} · ${n(data.content.reels)}`} sub={`${n(data.content.stories)} stories`} />
              <Tile
                icon={CalendarClock}
                label={data.content.sessionsHosted ? 'Sessions hosted' : 'Sessions booked'}
                value={n(data.content.sessionsHosted || data.activity.bookingsMade)}
                sub={data.content.sessionsHosted ? `${n(data.activity.bookingsMade)} booked as a fan` : undefined}
                tone="pink"
              />
              <Tile icon={UsersRound} label="Communities" value={`${n(data.activity.communitiesJoined)} joined`} sub={`${n(data.content.communitiesOwned)} created`} tone="sky" />
              <Tile icon={Star} label="Rating received" value={data.reviews.average ? `${data.reviews.average.toFixed(1)} ★` : '—'} sub={`${n(data.reviews.received)} received · ${n(data.reviews.given)} given`} tone="amber" />
              {data.profile?.kind === 'creator' && <Tile icon={Sparkles} label="Campaign applications" value={n(data.activity.applications)} sub={`${n(data.activity.applicationsAccepted)} accepted`} tone="violet" />}
              {data.profile?.kind === 'brand' && <Tile icon={Sparkles} label="Campaigns posted" value={n(data.activity.campaigns)} tone="violet" />}
              <Tile icon={Store} label="Store" value={`${n(data.activity.storeBought)} bought`} sub={`${n(data.activity.storeSold)} sold · ${n(data.activity.shopBought)} shop orders`} tone="emerald" />
              <Tile icon={LogIn} label="Sign-ins (30 days)" value={n(data.activity.logins30d)} sub={data.activity.failedLogins30d ? `${n(data.activity.failedLogins30d)} failed attempts` : 'No failed attempts'} tone={data.activity.failedLogins30d ? 'rose' : 'gray'} />
            </div>
          </div>
          {data.recentTransactions.length > 0 && (
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Latest payments</p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-white/5 dark:border-white/[0.06]">
                {data.recentTransactions.map((t) => (
                  <div key={t._id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.direction === 'in' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10'}`}>
                      {t.direction === 'in' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900 dark:text-white">{fmt.label(t.type)}</span>
                      <span className="block text-xs text-gray-400">
                        {fmt.label(t.status)} · {fmt.dateTime(t.createdAt)}
                      </span>
                    </span>
                    <span className={`font-semibold tabular-nums ${t.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                      {t.direction === 'in' ? '+' : '−'}
                      {fmt.rupees(t.direction === 'in' ? t.netAmount ?? t.amount : t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

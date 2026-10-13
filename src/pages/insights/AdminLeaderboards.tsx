import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Coins, Eye, FileText, Heart, Storefront2, Trophy, Users2, UsersRound, Wallet, type LucideIcon } from '@/icons';
import { Card, CardHeader, PageHeader, fmt } from '@/components/AdminUI';
import { insightsApi, type RankedPerson, type RankedPost } from '@/services/monitorApi';
import { InsightStatus, PeriodActions, RankRow, SkeletonGrid, roleLabel, useInsight } from './shared';

function Board({ title, description, icon, children, empty }: { title: string; description: string; icon: LucideIcon; children: ReactNode; empty: boolean }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={title} description={description} icon={icon} />
      <div className="flex-1 p-2">{empty ? <p className="px-3 py-10 text-center text-sm text-gray-400 dark:text-white/40">Nothing to rank yet.</p> : children}</div>
    </Card>
  );
}

const people = (rows: RankedPerson[] | null, value: (r: RankedPerson) => string, sub?: (r: RankedPerson) => string) =>
  (rows ?? []).map((r, i) => <RankRow key={`${r.userId ?? r.name}-${i}`} n={i} name={r.name} avatar={r.avatarUrl} sub={sub ? sub(r) : r.email || roleLabel(r.role)} value={value(r)} to={r.userId ? `/users/${r.userId}` : undefined} />);

const posts = (rows: RankedPost[] | null, value: (r: RankedPost) => string) =>
  (rows ?? []).map((r, i) => (
    <RankRow key={r.id} n={i} name={r.caption?.trim() ? r.caption.slice(0, 70) : 'Untitled post'} thumb={r.thumb || ''} sub={`${r.author || 'Unknown'} · ${fmt.date(r.createdAt)}`} value={value(r)} to={r.authorId ? `/users/${r.authorId}` : undefined} />
  ));

export default function AdminLeaderboards() {
  const { days, setDays, data, loading, error, missing, reload } = useInsight(insightsApi.leaderboards, 30);

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Leaderboards"
        description="Who earns, spends and engages the most. Money figures are for the selected period; followers, profile views and communities are all-time totals."
        actions={<PeriodActions groupId="lb-days" days={days} setDays={setDays} onReload={reload} loading={loading} />}
      />
      <InsightStatus missing={missing} error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonGrid cards={8} tall />
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Board title="Top earning creators" description="Net amount received" icon={Wallet} empty={!data.topEarners?.length}>
            {people(data.topEarners, (r) => fmt.rupeesCompact(r.value))}
          </Board>
          <Board title="Top spenders" description="Brands & fans who paid the most" icon={Coins} empty={!data.topSpenders?.length}>
            {people(data.topSpenders, (r) => fmt.rupeesCompact(r.value))}
          </Board>
          <Board title="Most followed creators" description="All-time followers" icon={Users2} empty={!data.mostFollowed?.length}>
            {people(data.mostFollowed, (r) => fmt.compact(r.value), (r) => (r.rating ? `★ ${r.rating.toFixed(1)} · @${r.slug}` : `@${r.slug}`))}
          </Board>
          <Board title="Most viewed profiles" description="All-time profile views" icon={Eye} empty={!data.mostViewed?.length}>
            {people(data.mostViewed, (r) => fmt.compact(r.value), (r) => `@${r.slug}`)}
          </Board>
          <Board title="Top posts" description="Most liked in this period" icon={FileText} empty={!data.topPosts?.length}>
            {posts(data.topPosts, (r) => `${fmt.compact(r.value)} ♥`)}
          </Board>
          <Board title="Top reels" description="Most viewed in this period" icon={Clapperboard} empty={!data.topReels?.length}>
            {posts(data.topReels, (r) => `${fmt.compact(r.value)} views`)}
          </Board>
          <Board title="Biggest communities" description="All-time members" icon={UsersRound} empty={!data.topCommunities?.length}>
            {(data.topCommunities ?? []).map((c, i) => (
              <RankRow key={c.id} n={i} name={c.name} sub={c.owner ? `by ${c.owner}` : c.slug} value={fmt.compact(c.value)} to="/communities" />
            ))}
          </Board>
          <Board title="Top stores" description="Paid store sales in this period" icon={Storefront2} empty={!data.topStores?.length}>
            {(data.topStores ?? []).map((s, i) => (
              <RankRow key={s.id} n={i} name={s.name} sub={s.slug} value={fmt.rupeesCompact(s.value)} to="/store/stores" />
            ))}
          </Board>
          <Card className="flex flex-col justify-center bg-brand-gradient p-6 text-white">
            <Trophy size={28} weight="fill" />
            <p className="mt-3 text-lg font-bold">Celebrate your top creators</p>
            <p className="mt-1 text-sm text-white/80">Pin them on the app home or send a shout-out from Notifications.</p>
            <div className="mt-4 flex gap-2 text-xs font-semibold">
              <Link to="/home-layout" className="rounded-lg bg-white/20 px-3 py-1.5 hover:bg-white/30">
                Home sections
              </Link>
              <Link to="/broadcast" className="rounded-lg bg-white/20 px-3 py-1.5 hover:bg-white/30">
                <Heart size={12} className="mr-1 inline" />
                Notify
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

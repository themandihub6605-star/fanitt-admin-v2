import { Clapperboard, Eye, FileText, Heart, Images as ImageIcon2, Star, UsersRound } from '@/icons';
import { Card, CardHeader, KpiCard, PageHeader, fmt } from '@/components/AdminUI';
import { BarList, ChartLegend, CHART_COLORS, TrendChart } from '@/components/Charts';
import { insightsApi } from '@/services/monitorApi';
import { InsightStatus, PeriodActions, RankRow, SkeletonGrid, roleLabel, useInsight } from './shared';

export default function AdminContent() {
  const { days, setDays, data, loading, error, missing, reload } = useInsight(insightsApi.content, 30);
  const t = data?.totals;
  const ratings = (rows: { rating: number; count: number }[] | null) => [5, 4, 3, 2, 1].map((r) => ({ label: `${r} ★`, value: rows?.find((x) => Number(x.rating) === r)?.count ?? 0 }));
  const avgRating = (rows: { rating: number; count: number }[] | null) => {
    const n = (rows ?? []).reduce((s, r) => s + r.count, 0);
    return n ? (rows ?? []).reduce((s, r) => s + Number(r.rating) * r.count, 0) / n : null;
  };
  const allAvg = avgRating(data?.reviews.allTime ?? null);

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Content analytics"
        description="How much people post, what gets engagement and who posts the most."
        actions={<PeriodActions groupId="ct-days" days={days} setDays={setDays} onReload={reload} loading={loading} />}
      />
      <InsightStatus missing={missing} error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonGrid cards={8} />
      ) : data && t ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Posts published" value={fmt.number(t.posts)} icon={FileText} tone="orange" spark={data.series.posts?.map((p) => p.value)} to="/posts" />
            <KpiCard label="Reels published" value={fmt.number(t.reels)} icon={Clapperboard} tone="pink" spark={data.series.reels?.map((p) => p.value)} to="/posts" />
            <KpiCard label="Stories shared" value={fmt.number(t.stories)} icon={ImageIcon2} tone="sky" hint={t.storiesLive !== null ? `${fmt.number(t.storiesLive)} live right now` : undefined} spark={data.series.stories?.map((p) => p.value)} />
            <KpiCard label="Community posts" value={fmt.number(t.communityPosts)} icon={UsersRound} tone="emerald" spark={data.series.communityPosts?.map((p) => p.value)} to="/communities" />
            <KpiCard label="Likes on new posts" value={fmt.compact(t.likes)} icon={Heart} tone="rose" hint="On posts & reels from this period" />
            <KpiCard label="Average likes per post" value={t.avgLikesPerPost !== null ? t.avgLikesPerPost.toFixed(1) : '—'} icon={Heart} tone="amber" />
            <KpiCard label="Reel views" value={fmt.compact(t.reelViews)} icon={Eye} tone="violet" hint="On reels from this period" />
            <KpiCard label="Average review rating" value={allAvg !== null ? `${allAvg.toFixed(2)} ★` : '—'} icon={Star} tone="amber" hint="All-time" to="/moderation" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Publishing per day"
                description={`Last ${days} days`}
                icon={FileText}
                actions={<ChartLegend items={['Posts', 'Reels', 'Stories', 'Community'].map((l, i) => ({ label: l, color: [CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[1], CHART_COLORS[3]][i] }))} />}
              />
              <div className="p-4">
                <TrendChart
                  series={[
                    { name: 'Posts', points: data.series.posts, color: CHART_COLORS[0] },
                    { name: 'Reels', points: data.series.reels, color: CHART_COLORS[2] },
                    { name: 'Stories', points: data.series.stories, color: CHART_COLORS[1] },
                    { name: 'Community', points: data.series.communityPosts, color: CHART_COLORS[3] },
                  ]}
                  emptyIcon={FileText}
                  emptyMessage="Nothing was published in this period."
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Most active posters" description="Posts & reels in this period" icon={UsersRound} />
              <div className="p-2">
                {data.topPosters?.length ? (
                  data.topPosters.map((p, i) => <RankRow key={`${p.userId}-${i}`} n={i} name={p.name} avatar={p.avatarUrl} sub={roleLabel(p.role)} value={fmt.number(p.value)} to={p.userId ? `/users/${p.userId}` : undefined} />)
                ) : (
                  <p className="px-3 py-10 text-center text-sm text-gray-400">No posts in this period.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Reviews in this period" description="Ratings given in the selected period" icon={Star} />
              <div className="p-5">
                <BarList rows={ratings(data.reviews.period)} emptyMessage="No reviews in this period." />
              </div>
            </Card>
            <Card>
              <CardHeader title="All-time ratings" description="Every review on the platform" icon={Star} />
              <div className="p-5">
                <BarList rows={ratings(data.reviews.allTime)} emptyMessage="No reviews yet." />
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

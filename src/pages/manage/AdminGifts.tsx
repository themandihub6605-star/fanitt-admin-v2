import { useState } from 'react';
import { ArrowRight, Gift, HandHeart } from '@/icons';
import { Badge, Card, CardHeader, DataTable, PageHeader, SearchInput, Select, fmt, type Column } from '@/components/AdminUI';
import { manageApi, type GiftLeader, type GiftRow } from '@/services/manageApi';
import { FilterChips, MissingBackend, StatStrip, UserCell, usePaged, useSearch } from './shared';
import { Rank } from '@/pages/insights/shared';

type Kind = 'all' | 'gift' | 'donation' | 'fanbox';
const KIND_LABEL: Record<GiftRow['kind'], string> = { gift: 'Gift', donation: 'Session donation', fanbox: 'FanBox tip' };
const KIND_TONE = { gift: 'pink', donation: 'violet', fanbox: 'amber' } as const;

function Leaders({ title, rows, empty }: { title: string; rows: GiftLeader[] | undefined; empty: string }) {
  return (
    <Card>
      <CardHeader title={title} description="By amount, from the latest 1,000 of each" icon={HandHeart} />
      <div className="p-2">
        {!rows?.length ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">{empty}</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.user._id} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
              <Rank n={i} />
              <div className="min-w-0 flex-1">
                <UserCell user={r.user} sub={`${r.count} payment${r.count === 1 ? '' : 's'}`} />
              </div>
              <span className="text-[13px] font-bold tabular-nums text-gray-950 dark:text-white">{fmt.rupeesCompact(r.amount)}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function AdminGifts() {
  const [kind, setKind] = useState<Kind>('all');
  const [days, setDays] = useState('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.gifts, { kind, days, search });
  const s = data?.summary;
  const all = (s?.gifts.amount ?? 0) + (s?.donations.amount ?? 0) + (s?.fanbox.amount ?? 0);

  const columns: Column<GiftRow>[] = [
    {
      key: 'kind',
      header: 'Type',
      value: (r) => KIND_LABEL[r.kind],
      render: (r) => (
        <Badge tone={KIND_TONE[r.kind]}>
          <Gift size={10} /> {KIND_LABEL[r.kind]}
        </Badge>
      ),
    },
    {
      key: 'flow',
      header: 'From → To',
      value: (r) => `${r.from?.name ?? ''} → ${r.to?.name ?? ''}`,
      render: (r) => (
        <div className="flex min-w-[280px] items-center gap-2">
          <div className="min-w-0 flex-1">
            <UserCell user={r.from} size={26} />
          </div>
          <ArrowRight size={14} className="shrink-0 text-gray-300" />
          <div className="min-w-0 flex-1">
            <UserCell user={r.to} size={26} />
          </div>
        </div>
      ),
    },
    { key: 'message', header: 'Message', value: (r) => r.message ?? '', hideOnMobile: true, render: (r) => <span className="line-clamp-1 max-w-[240px] text-xs text-gray-500">{r.message || r.context || '—'}</span> },
    { key: 'date', header: 'Date', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt.dateTime(r.createdAt)}</span> },
    { key: 'amount', header: 'Amount (₹)', align: 'right', value: (r) => r.amount / 100, render: (r) => <span className="font-semibold text-gray-950 dark:text-white">{fmt.rupees(r.amount)}</span> },
  ];

  return (
    <div>
      <PageHeader icon={Gift} eyebrow="Finance" title="Gifts & donations" description="Money fans send to creators: gifts on profiles, donations during sessions and FanBox tips." />
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'Total sent', value: fmt.rupeesCompact(all), tone: 'violet', hint: days ? `Last ${days} days` : 'All time' },
          { label: 'Gifts', value: fmt.rupeesCompact(s?.gifts.amount), tone: 'rose', hint: `${fmt.number(s?.gifts.count)} gifts`, onClick: () => setKind('gift'), active: kind === 'gift' },
          { label: 'Session donations', value: fmt.rupeesCompact(s?.donations.amount), tone: 'sky', hint: `${fmt.number(s?.donations.count)} donations`, onClick: () => setKind('donation'), active: kind === 'donation' },
          { label: 'FanBox tips', value: fmt.rupeesCompact(s?.fanbox.amount), tone: 'amber', hint: `${fmt.number(s?.fanbox.count)} tips`, onClick: () => setKind('fanbox'), active: kind === 'fanbox' },
        ]}
      />
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Leaders title="Top supporters" rows={s?.topSenders} empty="No gifts yet." />
        <Leaders title="Creators who received the most" rows={s?.topReceivers} empty="No gifts yet." />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => `${r.kind}-${r._id}`}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={Gift}
        emptyMessage="No gifts or donations match these filters."
        exportName="gifts-donations"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search sender or creator…" />
            <FilterChips<Kind>
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: 'All' },
                { value: 'gift', label: 'Gifts' },
                { value: 'donation', label: 'Donations' },
                { value: 'fanbox', label: 'FanBox' },
              ]}
            />
            <Select
              label="Period"
              value={days}
              onChange={setDays}
              options={[
                { value: '', label: 'All time' },
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
            />
          </>
        }
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, Users2 } from '@/icons';
import { Badge, Drawer, ErrorState, LoadingState, Pagination, SearchInput, StatusBadge, fmt } from '@/components/AdminUI';
import { manageApi } from '@/services/manageApi';
import { FilterChips, MissingBackend, UserCell, usePaged, useSearch } from '@/pages/manage/shared';

type Access = '' | 'paid' | 'free';

function Members({ id }: { id: string }) {
  const [access, setAccess] = useState<Access>('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged((q) => manageApi.communityMembers(id, q), { access, search });
  const s = data?.summary;
  return (
    <div>
      <MissingBackend show={missing} />
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {[
          { l: 'Active members', v: fmt.number(s?.active) },
          { l: 'Paid members', v: fmt.number(s?.paid) },
          { l: 'Earned from plans', v: fmt.rupeesCompact(s?.earnings) },
          { l: 'Posts', v: fmt.number(s?.posts) },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] text-gray-400">{x.l}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-950 dark:text-white">{x.v}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={term} onChange={setTerm} placeholder="Search members…" className="flex-1" />
        <FilterChips<Access>
          value={access}
          onChange={setAccess}
          options={[
            { value: '', label: 'All' },
            { value: 'paid', label: 'Paid' },
            { value: 'free', label: 'Free' },
          ]}
        />
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !rows.length ? (
        <LoadingState rows={6} />
      ) : !rows.length ? (
        <p className="py-10 text-center text-sm text-gray-400">No members match.</p>
      ) : (
        <div className={`divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10 ${loading ? 'opacity-60' : ''}`}>
          {rows.map((m) => (
            <div key={m._id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <UserCell user={m.user} size={28} sub={`Joined ${fmt.date(m.createdAt)}`} />
              </div>
              {m.role !== 'member' && <Badge tone="violet">{fmt.label(m.role)}</Badge>}
              {m.access === 'paid' ? <Badge tone="pink">{m.plan ? fmt.label(m.plan) : 'Paid'}{m.paidUntil ? ` · till ${fmt.date(m.paidUntil)}` : ''}</Badge> : null}
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="mt-3">
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

export function CommunityMembersDrawer({ community, onClose }: { community: { _id: string; name: string } | null; onClose: () => void }) {
  return (
    <Drawer
      open={!!community}
      onClose={onClose}
      title={community?.name ?? ''}
      subtitle="Members, paid plans and earnings"
      width="max-w-lg"
      footer={
        community && (
          <Link to={`/community-content?community=${community._id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline dark:text-orange-300">
            <MessagesSquare size={14} /> Comments & chat in this community
          </Link>
        )
      }
    >
      {community ? <Members key={community._id} id={community._id} /> : <Users2 />}
    </Drawer>
  );
}

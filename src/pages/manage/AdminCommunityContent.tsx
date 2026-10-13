import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatText, MessagesSquare, Trash2 } from '@/icons';
import { Button, DataTable, PageHeader, SearchInput, Tab, TabGroup, confirmDialog, fmt, toast, type Column } from '@/components/AdminUI';
import { manageApi, type CommunityContentRow } from '@/services/manageApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { MissingBackend, UserCell, usePaged, useSearch } from './shared';

export default function AdminCommunityContent() {
  const [params, setParams] = useSearchParams();
  const kind = params.get('tab') === 'messages' ? 'messages' : 'comments';
  const community = params.get('community') || '';
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.communityContent, { kind, search, community });
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (r: CommunityContentRow) => {
    const ok = await confirmDialog({
      title: kind === 'messages' ? 'Remove this chat message?' : 'Delete this comment?',
      message: kind === 'messages' ? 'It’s hidden from the community chat for everyone.' : 'The comment and its replies are deleted for good.',
      confirmLabel: kind === 'messages' ? 'Remove message' : 'Delete comment',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(r._id);
    try {
      await manageApi.removeCommunityContent(kind, r._id);
      toast.success(kind === 'messages' ? 'Message removed' : 'Comment deleted');
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<CommunityContentRow>[] = [
    { key: 'author', header: 'Posted by', value: (r) => r.author?.name ?? '', render: (r) => <UserCell user={r.author} size={26} /> },
    { key: 'text', header: kind === 'messages' ? 'Message' : 'Comment', value: (r) => r.text, render: (r) => <p className="line-clamp-2 min-w-[240px] max-w-[520px] text-[13px] text-gray-800 dark:text-white/80">{r.text}</p> },
    {
      key: 'community',
      header: 'Community',
      value: (r) => r.community?.name ?? '',
      hideOnMobile: true,
      render: (r) =>
        r.community ? (
          <button type="button" onClick={(e) => (e.stopPropagation(), setParams({ ...(kind === 'messages' ? { tab: 'messages' } : {}), community: r.community!._id }))} className="text-[13px] font-medium text-orange-600 hover:underline dark:text-orange-300">
            {r.community.name}
          </button>
        ) : (
          '—'
        ),
    },
    { key: 'date', header: 'When', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt.ago(r.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      render: (r) => (
        <Button size="xs" variant="danger" loading={busy === r._id} onClick={() => remove(r)}>
          <Trash2 size={12} /> Remove
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={MessagesSquare} eyebrow="Content & moderation" title="Community comments & chat" description="Comments on community posts and messages in community chats, newest first. Remove spam and abuse." />
      <MissingBackend show={missing} />
      <TabGroup className="mb-5">
        <Tab groupId="cc-tabs" active={kind === 'comments'} onClick={() => setParams(community ? { community } : {})}>
          <ChatText size={14} /> Comments
        </Tab>
        <Tab groupId="cc-tabs" active={kind === 'messages'} onClick={() => setParams({ tab: 'messages', ...(community ? { community } : {}) })}>
          <MessagesSquare size={14} /> Chat messages
        </Tab>
      </TabGroup>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={MessagesSquare}
        emptyMessage="Nothing here — no comments or messages match."
        exportName={`community-${kind}`}
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search text or author…" />
            {community && (
              <Button size="sm" variant="secondary" onClick={() => setParams(kind === 'messages' ? { tab: 'messages' } : {})}>
                Showing one community · show all
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}

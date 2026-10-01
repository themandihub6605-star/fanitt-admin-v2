import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  Pencil,
  Pin,
  PlayCircle,
  Search,
  Trash2,
  Users2,
  X,
} from 'lucide-react';
import { postAdminApi, type AdminPost, type AdminPostType } from '@/services/postAdminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, TabGroup, Tab, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://app.fanitt.com';

const TABS: { key: AdminPostType; label: string; icon: typeof ImageIcon }[] = [
  { key: 'feed', label: 'Creator feed posts', icon: ImageIcon },
  { key: 'community', label: 'Community posts', icon: Users2 },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function viewLink(post: AdminPost) {
  if (post.type === 'community') return `${SITE_URL}/communities/post/${post._id}`;
  return post.creatorSlug ? `${SITE_URL}/creator/${post.creatorSlug}` : null;
}

export default function AdminPosts() {
  const [type, setType] = useState<AdminPostType>('feed');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPost | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(
      () => {
        setLoading(true);
        setError('');
        postAdminApi
          .list({ type, search: search.trim() || undefined, page, limit: 20 })
          .then((res) => {
            setPosts(res.posts);
            setPages(Math.max(1, res.pages));
            setTotal(res.total);
          })
          .catch((err) => setError(getApiErrorMessage(err)))
          .finally(() => setLoading(false));
      },
      search ? 350 : 0
    );
    return () => window.clearTimeout(handle);
  }, [type, search, page]);

  const remove = async (post: AdminPost) => {
    const extra = post.type === 'community' && post.commentCount > 0 ? ` Its ${post.commentCount} comment(s) will be removed too.` : '';
    if (!window.confirm(`Delete this post by ${post.author?.name || 'this user'}? This can't be undone.${extra}`)) return;
    setActingOn(post._id);
    setError('');
    try {
      await postAdminApi.remove(post.type, post._id);
      setPosts((prev) => prev.filter((p) => p._id !== post._id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Posts"
        description={`Search every post by its text or by the author's name or email, then edit or delete it. ${total.toLocaleString('en-IN')} ${type === 'feed' ? 'feed' : 'community'} posts${search ? ' match' : ' in total'}.`}
      />

      <TabGroup>
        {TABS.map((t) => (
          <Tab
            key={t.key}
            active={type === t.key}
            onClick={() => {
              setType(t.key);
              setPage(1);
            }}
          >
            <t.icon size={14} /> {t.label}
          </Tab>
        ))}
      </TabGroup>

      <div className="relative mt-4 max-w-xl">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            type === 'feed' ? 'Search by caption, creator name or email...' : 'Search by post text, author name/email or community...'
          }
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading posts...</p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {posts.length === 0 && <EmptyState icon={FileText} message={search ? 'No posts match your search.' : 'No posts yet.'} />}

            {posts.map((post) => {
              const link = viewLink(post);
              return (
                <Card key={post._id} className="p-4">
                  <div className="flex items-start gap-3">
                    {post.author?.avatarUrl ? (
                      <img src={post.author.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                        {(post.author?.name || '?').trim()[0]?.toUpperCase()}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold text-gray-900 dark:text-white">{post.author?.name || 'Deleted user'}</p>
                        {post.author?.role && <Badge tone="gray" className="capitalize">{post.author.role}</Badge>}
                        {post.isPinned && (
                          <Badge tone="sky">
                            <Pin size={10} /> Pinned
                          </Badge>
                        )}
                        {post.isAnnouncement && (
                          <Badge tone="orange">
                            <Megaphone size={10} /> Announcement
                          </Badge>
                        )}
                        {post.hasPoll && (
                          <Badge tone="pink">
                            <BarChart3 size={10} /> Poll
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-white/45">
                        {post.author?.email || ''}
                        {post.community ? ` · in ${post.community.name}` : ''} · {formatDateTime(post.createdAt)}
                      </p>

                      {post.text ? (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-white/80">{post.text}</p>
                      ) : (
                        <p className="mt-2 text-sm italic text-gray-300 dark:text-white/30">No text</p>
                      )}

                      {post.media.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.media.map((m) => (
                            <a
                              key={m.url}
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="relative block h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5"
                            >
                              {m.type === 'video' ? (
                                <span className="flex h-full w-full items-center justify-center text-gray-400 dark:text-white/50">
                                  <PlayCircle size={24} />
                                </span>
                              ) : (
                                <img src={m.url} alt="" className="h-full w-full object-cover" />
                              )}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500 dark:text-white/55">
                        <span className="flex items-center gap-1">
                          <Heart size={12} /> {post.likeCount}
                        </span>
                        {post.type === 'community' && (
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} /> {post.commentCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5"
                        >
                          <ExternalLink size={12} /> View
                        </a>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setEditing(post)}>
                        <Pencil size={12} /> Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => remove(post)} disabled={actingOn === post._id}>
                        {actingOn === post._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-white/40">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {editing && (
        <EditPostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditPostModal({ post, onClose, onSaved }: { post: AdminPost; onClose: () => void; onSaved: (post: AdminPost) => void }) {
  const [text, setText] = useState(post.text);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [isPinned, setIsPinned] = useState(post.isPinned);
  const [isAnnouncement, setIsAnnouncement] = useState(post.isAnnouncement);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const maxLength = post.type === 'feed' ? 500 : 3000;
  const remainingMedia = post.media.filter((m) => !removed.has(m.url)).length;

  const toggleMedia = (url: string) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  const save = async () => {
    if (post.type === 'feed' && remainingMedia === 0) {
      setError('A feed post needs at least one photo or video — delete the post instead.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await postAdminApi.update(post.type, post._id, {
        text: text.trim(),
        removeMediaUrls: [...removed],
        ...(post.type === 'community' ? { isPinned, isAnnouncement } : {}),
      });
      onSaved(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#171B26]"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit post</h2>
            <p className="text-xs text-gray-400 dark:text-white/45">
              By {post.author?.name || 'unknown'}
              {post.community ? ` in ${post.community.name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold text-gray-500 dark:text-white/60">{post.type === 'feed' ? 'Caption' : 'Post text'}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength}
          rows={6}
          className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-orange-500/20"
        />
        <p className="mt-1 text-right text-[11px] text-gray-400 dark:text-white/40">
          {text.length}/{maxLength}
        </p>

        {post.media.length > 0 && (
          <>
            <label className="mt-3 block text-xs font-semibold text-gray-500 dark:text-white/60">Media — click to remove / restore</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {post.media.map((m) => {
                const isRemoved = removed.has(m.url);
                return (
                  <button
                    key={m.url}
                    type="button"
                    onClick={() => toggleMedia(m.url)}
                    className={cn(
                      'relative h-20 w-20 overflow-hidden rounded-lg border-2 transition-all',
                      isRemoved ? 'border-rose-400 opacity-40' : 'border-transparent'
                    )}
                  >
                    {m.type === 'video' ? (
                      <span className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/50">
                        <PlayCircle size={22} />
                      </span>
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    {isRemoved && (
                      <span className="absolute inset-0 flex items-center justify-center text-rose-600">
                        <Trash2 size={18} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {post.type === 'community' && (
          <div className="mt-5 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded accent-orange-600" />
              Pinned to the top of the community
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80">
              <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} className="rounded accent-orange-600" />
              Marked as announcement
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
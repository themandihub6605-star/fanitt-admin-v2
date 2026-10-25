// File: src/pages/AdminContactMessages.tsx  (fanitt-admin)
import { useEffect, useState } from 'react';
import { CheckCheck, CheckCircle2, CornerDownLeft as Reply, Eye as MailOpen, Inbox, Mail, Package as Archive, Phone, Trash2 } from '@/icons';
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, Tab, TabGroup } from '@/components/AdminUI';
import { getApiErrorMessage } from '@/services/apiClient';
import { contactApi, type ContactList, type ContactMessage, type ContactStatus, type ContactTab } from '@/services/contactApi';
import { ErrorBanner, Loading, Modal, Pagination, SearchBox, dateTime, useDebounced } from '@/FanittStore/ui';

// Contact messages — sent from the Contact page on fanitt.com.
// New → Read → Replied, or Archive to hide it.

const TABS: { key: ContactTab; label: string }[] = [
  { key: 'all', label: 'Inbox' },
  { key: 'new', label: 'New' },
  { key: 'replied', label: 'Replied' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_TONE: Record<ContactStatus, 'orange' | 'sky' | 'emerald' | 'gray'> = {
  new: 'orange',
  read: 'sky',
  replied: 'emerald',
  archived: 'gray',
};

const ROLE_TONE: Record<ContactMessage['role'], 'pink' | 'sky' | 'amber' | 'emerald' | 'gray'> = {
  Creator: 'pink',
  Brand: 'sky',
  Fan: 'amber',
  Agency: 'emerald',
  Other: 'gray',
};

export default function AdminContactMessages() {
  const [tab, setTab] = useState<ContactTab>('all');
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ContactList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [toDelete, setToDelete] = useState<ContactMessage | null>(null);

  const load = async (p = page, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setData(await contactApi.list({ status: tab, search: debounced || undefined, page: p }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debounced]);

  const goTo = (p: number) => {
    setPage(p);
    load(p);
  };

  const setStatus = async (m: ContactMessage, status: ContactStatus, message?: string) => {
    try {
      const updated = await contactApi.update(m._id, { status });
      if (open?._id === m._id) setOpen(updated);
      if (message) setNotice(message);
      await load(page, true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const openMessage = (m: ContactMessage) => {
    setOpen(m);
    if (m.status === 'new') void setStatus(m, 'read');
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await contactApi.remove(toDelete._id);
      setNotice('Message deleted');
      if (open?._id === toDelete._id) setOpen(null);
      setToDelete(null);
      await load(page, true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const c = data?.counts;

  return (
    <div className="space-y-6">
      <PageHeader title="Contact Messages" description="Messages people sent from the Contact page on the website." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New" value={String(c?.new ?? 0)} icon={Mail} accent="orange" index={0} />
        <StatCard label="Read, not replied" value={String(c?.read ?? 0)} icon={MailOpen} accent="sky" index={1} />
        <StatCard label="Replied" value={String(c?.replied ?? 0)} icon={CheckCheck} accent="emerald" index={2} />
        <StatCard label="Archived" value={String(c?.archived ?? 0)} icon={Archive} accent="amber" index={3} />
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="flex-1">{notice}</span>
          <button className="text-xs underline" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabGroup>
            {TABS.map((t) => (
              <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
                {t.key === 'new' && c?.new ? ` (${c.new})` : ''}
              </Tab>
            ))}
          </TabGroup>
          <div className="sm:w-72">
            <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone or text" />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : !data?.messages.length ? (
          <EmptyState icon={Inbox} message={debounced ? 'No messages match your search.' : 'No messages here yet. They appear when someone uses the website contact form.'} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {data.messages.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => openMessage(m)}
                className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6A1F] to-[#EC2A78] text-sm font-black text-white">
                  {(m.name || '?').charAt(0).toUpperCase()}
                  {m.status === 'new' && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#FF5A1F] dark:border-[#141821]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`truncate text-gray-900 dark:text-white ${m.status === 'new' ? 'font-extrabold' : 'font-semibold'}`}>{m.name}</p>
                    <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>
                    <Badge tone={STATUS_TONE[m.status]}>{m.status === 'read' ? 'Read' : m.status.charAt(0).toUpperCase() + m.status.slice(1)}</Badge>
                    <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-white/40">{dateTime(m.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-gray-500 dark:text-white/55">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-700 dark:text-white/75">{m.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {data && data.pages > 1 && <Pagination page={page} pages={data.pages} onPage={goTo} />}
      </Card>

      {open && (
        <Modal open wide title={open.name} subtitle={`${open.role} · ${dateTime(open.createdAt)}`} onClose={() => setOpen(null)}>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${open.email}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-white">
                <Mail className="h-3.5 w-3.5" /> {open.email}
              </a>
              {open.phone && (
                <a href={`tel:${open.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-white">
                  <Phone className="h-3.5 w-3.5" /> {open.phone}
                </a>
              )}
              <Badge tone={STATUS_TONE[open.status]}>{open.status === 'read' ? 'Read' : open.status.charAt(0).toUpperCase() + open.status.slice(1)}</Badge>
            </div>
            <p className="whitespace-pre-wrap rounded-[12px] border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/85">{open.message}</p>
            <div className="flex flex-wrap justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={() => setToDelete(open)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <div className="flex flex-wrap gap-2">
                {open.status !== 'archived' ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(open, 'archived', 'Message archived')}>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus(open, 'read', 'Moved back to the inbox')}>
                    <Inbox className="h-3.5 w-3.5" /> Move to inbox
                  </Button>
                )}
                <a
                  href={`mailto:${open.email}?subject=${encodeURIComponent('Re: your message to Fanitt')}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:text-white"
                >
                  <Reply className="h-3.5 w-3.5" /> Reply by email
                </a>
                {open.status !== 'replied' && (
                  <Button size="sm" onClick={() => setStatus(open, 'replied', 'Marked as replied')}>
                    <CheckCheck className="h-3.5 w-3.5" /> Mark as replied
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {toDelete && (
        <Modal open title="Delete this message?" subtitle={`${toDelete.name} · ${toDelete.email}`} onClose={() => setToDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-white/70">The message is removed for good. Archive it instead if you may need it later.</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
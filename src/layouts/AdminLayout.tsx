import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CornerDownLeft,
  DotsNine,
  KeyRound,
  LayoutGrid,
  Loader2,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  Plus,
  SidebarSimple,
  Moon,
  Search,
  Store,
  Sun,
  User as UserIcon,
  UsersRound,
  X,
} from '@/icons';
import { Logo } from '@/components/Logo';
import { Avatar, Badge, fmt } from '@/components/AdminUI';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import { adminApi } from '@/services/adminApi';
import { accountDeletionApi } from '@/services/accountDeletionApi';
import { monitorApi, type AttentionItem, type SearchResults } from '@/services/monitorApi';
import { ALL_NAV_ITEMS, NAV_SECTIONS, isNavActive, searchNav, type BadgeKey } from './nav';

const SECTIONS_KEY = 'fanitt-admin-closed-sections';
const COLLAPSE_KEY = 'fanitt-admin-sidebar-collapsed';

function readClosedSections(): Set<string> {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// "Needs your action" counts — used by the sidebar badges and the bell.
// One cheap call to /admin/monitor/attention; falls back to the older
// per-page calls when the backend doesn't have the monitor module yet.
// ---------------------------------------------------------------------------
function useAttention() {
  const location = useLocation();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [failed, setFailed] = useState(false);
  const last = useRef(0);

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - last.current < 30_000) return;
    last.current = Date.now();
    try {
      setItems(await monitorApi.attention());
      setFailed(false);
    } catch {
      // Older backend: the three counts the panel always had.
      const out: AttentionItem[] = [];
      let ok = 0;
      await Promise.all([
        adminApi
          .listPendingVerifications()
          .then((d) => {
            ok += 1;
            out.push({ key: 'verifications', label: 'Profiles waiting for approval', count: (d.pendingCreators?.length ?? 0) + (d.pendingBrands?.length ?? 0), href: '/verifications', tone: 'amber' });
          })
          .catch(() => {}),
        adminApi
          .listWithdrawals('initiated')
          .then((d) => {
            ok += 1;
            out.push({ key: 'withdrawals', label: 'Withdrawal requests to pay', count: d.length, href: '/withdrawals', tone: 'rose' });
          })
          .catch(() => {}),
        accountDeletionApi
          .list({ status: 'pending' })
          .then((d) => {
            ok += 1;
            out.push({ key: 'deletions', label: 'Account deletion requests', count: d.total, href: '/account-deletions', tone: 'gray' });
          })
          .catch(() => {}),
      ]);
      setItems(out);
      setFailed(ok === 0);
    }
  }, []);

  useEffect(() => {
    load();
  }, [location.pathname, load]);

  useEffect(() => {
    const id = setInterval(() => load(true), 60_000);
    // After any change (approve, pay, delete…) refresh the counts shortly after.
    let t: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(() => load(true), 800);
    };
    window.addEventListener('fanitt-admin:changed', onChange);
    return () => {
      clearInterval(id);
      clearTimeout(t);
      window.removeEventListener('fanitt-admin:changed', onChange);
    };
  }, [load]);

  const counts = useMemo(() => Object.fromEntries(items.map((i) => [i.key, i.count])) as Partial<Record<BadgeKey, number>>, [items]);
  return { items, counts, failed, reload: () => load(true) };
}

// ---------------------------------------------------------------------------
// Command palette (Ctrl/⌘ K): pages + live search of users, campaigns,
// communities and stores.
// ---------------------------------------------------------------------------
type PaletteRow = { id: string; group: string; label: string; sub?: string; href: string; icon: React.ReactNode };

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDown, setSearchDown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTerm('');
    setResults(null);
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  // Live record search (debounced).
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      monitorApi
        .search(q)
        .then((r) => {
          setResults(r);
          setSearchDown(false);
        })
        .catch(() => setSearchDown(true))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const rows: PaletteRow[] = useMemo(() => {
    const pages = (term.trim() ? searchNav(term, 6) : ALL_NAV_ITEMS.slice(0, 8)).map((p) => ({
      id: `page:${p.href}`,
      group: term.trim() ? 'Pages' : 'Go to',
      label: p.label,
      sub: `${p.section} · ${p.hint}`,
      href: p.href,
      icon: <p.icon size={15} />,
    }));
    const r = results;
    if (!r) return pages;
    return [
      ...pages,
      ...r.users.map((u) => ({ id: `u:${u._id}`, group: 'Users', label: u.name, sub: `${u.email} · ${u.role}${u.isSuspended ? ' · suspended' : ''}`, href: `/users/${u._id}`, icon: <Avatar name={u.name} src={u.avatarUrl} size={20} /> })),
      ...r.campaigns.map((c) => ({
        id: `c:${c._id}`,
        group: 'Campaigns',
        label: c.title,
        sub: `${c.approvalStatus === 'pending' ? 'Waiting for review' : fmt.label(c.status)}${c.budget ? ` · ${fmt.rupees(c.budget)}` : ''}`,
        href: '/campaigns',
        icon: <ClipboardCheck size={15} />,
      })),
      ...r.communities.map((c) => ({ id: `cm:${c._id}`, group: 'Communities', label: c.name, sub: c.slug, href: '/communities', icon: <UsersRound size={15} /> })),
      ...r.stores.map((s) => ({ id: `s:${s._id}`, group: 'Stores', label: s.name, sub: `${s.slug} · ${fmt.label(s.status)}`, href: '/store/stores', icon: <Store size={15} /> })),
      ...r.transactions.map((t) => ({ id: `t:${t._id}`, group: 'Transactions', label: `${fmt.label(t.type)} · ${fmt.rupees(t.amount)}`, sub: `${fmt.label(t.status)} · ${fmt.dateTime(t.createdAt)}`, href: '/transactions', icon: <Building2 size={15} /> })),
    ];
  }, [term, results]);

  useEffect(() => setCursor(0), [rows.length]);

  const go = (row: PaletteRow) => {
    navigate(row.href);
    onClose();
  };

  if (!open) return null;
  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-label="Search"
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141821]"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-white/[0.06]">
          {searching ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Search size={16} className="text-gray-400" />}
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, rows.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter' && rows[cursor]) {
                go(rows[cursor]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Search pages, users, campaigns, stores…"
            className="h-12 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
          />
          <kbd className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:border-white/10">Esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">{searching ? 'Searching…' : `Nothing matches “${term.trim()}”.`}</p>
          ) : (
            rows.map((row, i) => {
              const header = row.group !== lastGroup ? row.group : null;
              lastGroup = row.group;
              return (
                <div key={row.id}>
                  {header && <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/35">{header}</p>}
                  <button onMouseEnter={() => setCursor(i)} onClick={() => go(row)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === cursor ? 'bg-gray-100 dark:bg-white/[0.06]' : '')}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-500 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-white/60 dark:ring-white/10">{row.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{row.label}</span>
                      {row.sub && <span className="block truncate text-xs text-gray-400 dark:text-white/40">{row.sub}</span>}
                    </span>
                    {i === cursor && <CornerDownLeft size={13} className="shrink-0 text-gray-300" />}
                  </button>
                </div>
              );
            })
          )}
          {searchDown && term.trim().length >= 2 && <p className="px-3 pb-2 pt-1 text-[11px] text-gray-400">Record search needs the latest backend (monitor module). Page search still works.</p>}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Top-bar pieces
// ---------------------------------------------------------------------------
function TopButton({ children, label, onClick, active }: PropsWithChildren<{ label: string; onClick?: () => void; active?: boolean }>) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white',
        active && 'bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white'
      )}
    >
      {children}
    </button>
  );
}

function Popover({ open, onClose, children, className }: PropsWithChildren<{ open: boolean; onClose: () => void; className?: string }>) {
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn('absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#161a24]', className)}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotificationsMenu({ items, onOpen, failed }: { items: AttentionItem[]; onOpen: () => void; failed?: boolean }) {
  const [open, setOpen] = useState(false);
  const pending = items.filter((i) => i.count > 0);
  const total = pending.reduce((n, i) => n + i.count, 0);
  const dot: Record<string, string> = { rose: 'bg-rose-500', amber: 'bg-amber-500', sky: 'bg-sky-500', gray: 'bg-gray-400' };
  return (
    <div className="relative">
      <TopButton
        label="Things that need your action"
        active={open}
        onClick={() => {
          setOpen((v) => !v);
          onOpen();
        }}
      >
        <Bell size={17} />
        {total > 0 && <span className="absolute right-0.5 top-0.5 min-w-[16px] rounded-full bg-rose-500 px-1 text-center text-[9.5px] font-bold leading-4 text-white ring-2 ring-white dark:ring-[#0f1219]">{total > 99 ? '99+' : total}</span>}
      </TopButton>
      <Popover open={open} onClose={() => setOpen(false)} className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Needs your action</p>
          <p className="text-xs text-gray-400 dark:text-white/40">{failed ? 'Couldn’t check right now' : total ? `${total} item${total === 1 ? '' : 's'} waiting` : 'You’re all caught up'}</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {pending.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400 dark:text-white/40">{failed ? 'The server didn’t answer. Try again in a moment.' : 'Nothing is waiting right now.'}</p>
          ) : (
            pending.map((i) => (
              <Link key={i.key} to={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', dot[i.tone] || 'bg-gray-400')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-800 dark:text-white/85">{i.label}</span>
                  {i.amount ? <span className="block text-xs text-gray-400">{fmt.rupees(i.amount)} in total</span> : null}
                </span>
                <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-white/10 dark:text-white/80">{i.count}</span>
              </Link>
            ))
          )}
        </div>
        <Link to="/" onClick={() => setOpen(false)} className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-semibold text-orange-600 hover:bg-gray-50 dark:border-white/[0.06] dark:text-orange-400 dark:hover:bg-white/5">
          Open dashboard
        </Link>
      </Popover>
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-1 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.05] md:pr-3" aria-label="Account menu">
        <Avatar name={user?.name} src={user?.avatarUrl} size={30} />
        <span className="hidden min-w-0 text-left leading-tight md:block">
          <span className="block max-w-[110px] truncate text-[13px] font-semibold text-gray-800 dark:text-white/90">{user?.name?.split(' ')[0]}</span>
          <span className="block text-[10.5px] text-gray-400">Admin</span>
        </span>
        <ChevronDown size={13} className="hidden text-gray-400 md:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-72 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <Avatar name={user?.name} src={user?.avatarUrl} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-gray-400 dark:text-white/40">{user?.email}</p>
          </div>
        </div>
        <div className="p-1.5">
          <button onClick={toggleTheme} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <Link to="/change-password" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5">
            <KeyRound size={15} /> Change password
          </Link>
          <Link to="/admins" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5">
            <UserIcon size={15} /> Admin team
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
// Sidebar — brand orange in light mode, dark in dark mode (see .sidebar in globals.css)
// ---------------------------------------------------------------------------
const FAVORITES = ['/', '/verifications', '/withdrawals', '/users', '/transactions', '/insights/finance'];

function Favorites({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [more, setMore] = useState(false);
  const items = FAVORITES.map((href) => ALL_NAV_ITEMS.find((i) => i.href === href)).filter(Boolean) as typeof ALL_NAV_ITEMS;
  const shown = more ? items : items.slice(0, 2);
  const tones = ['from-orange-500 to-fuchsia-500', 'from-sky-500 to-indigo-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-pink-500 to-rose-500', 'from-indigo-500 to-orange-600'];
  return (
    <div className="px-3 pb-2">
      <div className="mb-2 flex items-center justify-between px-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">Favorites</span>
        <span className="rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-white/60">{items.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((item, i) => {
          const active = isNavActive(item.href, location.pathname, location.search);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors',
                active ? 'border-orange-400/40 bg-orange-500/20' : 'border-white/[0.06] bg-white/[0.04] hover:border-white/10 hover:bg-white/[0.07]'
              )}
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6)]', tones[i % tones.length])}>
                <item.icon size={16} />
              </span>
              <span className="w-full truncate text-[11.5px] font-medium text-white/80">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <button onClick={() => setMore((v) => !v)} className="mx-auto mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-orange-300 hover:text-orange-200">
        {more ? 'Show less' : `View ${items.length - 2} more`} <ChevronDown size={12} className={cn('transition-transform', more && 'rotate-180')} />
      </button>
    </div>
  );
}

function SidebarNav({ onNavigate, counts, instanceId, collapsed = false }: { onNavigate?: () => void; counts: Partial<Record<BadgeKey, number>>; instanceId: string; collapsed?: boolean }) {
  const location = useLocation();
  const [closed, setClosed] = useState<Set<string>>(readClosedSections);

  const toggleSection = (label: string) => {
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify([...next]));
      } catch {
        // not remembered
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <nav className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-2.5 pb-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} className={cn('space-y-1', si > 0 && 'border-t border-white/[0.06] pt-3')}>
            {section.items.map((item) => {
              const active = isNavActive(item.href, location.pathname, location.search);
              const count = item.badge ? counts[item.badge] ?? 0 : 0;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  title={`${item.label} — ${item.hint}`}
                  aria-label={item.label}
                  className={cn(
                    'relative flex h-10 w-full items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-orange-500 text-white shadow-[0_8px_18px_-8px_rgba(255,90,31,0.9)]' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                  )}
                >
                  <item.icon size={19} />
                  {count > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#141317]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-5 px-3 pb-4 pt-2">
      {NAV_SECTIONS.map((section) => {
        const hasActive = section.items.some((item) => isNavActive(item.href, location.pathname, location.search));
        const isOpen = hasActive || !closed.has(section.label);
        const sectionCount = section.items.reduce((sum, item) => sum + (item.badge ? counts[item.badge] ?? 0 : 0), 0);
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              disabled={hasActive}
              className="group flex w-full items-center gap-1 px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35 hover:text-white/60 disabled:cursor-default"
            >
              <span className="flex-1 text-left">{section.label}</span>
              {!isOpen && sectionCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[9.5px] font-bold leading-4 text-white">{sectionCount}</span>}
              {!hasActive && <span className="opacity-0 transition-opacity group-hover:opacity-100">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isNavActive(item.href, location.pathname, location.search);
                      const count = item.badge ? counts[item.badge] ?? 0 : 0;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={onNavigate}
                          title={item.hint}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-[9px] text-[13.5px] font-medium transition-all',
                            active ? 'bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                          )}
                        >
                          {active && <motion.span layoutId={`nav-active-bar-${instanceId}`} className="absolute -left-3 bottom-2 top-2 w-[3px] rounded-r-full bg-orange-400 shadow-[0_0_12px_rgba(255,138,92,0.9)]" />}
                          <item.icon size={18} className={cn('shrink-0 transition-colors', active ? 'text-orange-300' : 'text-white/40 group-hover:text-white/75')} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count > 0 && (
                            <span className={cn('min-w-[22px] rounded-full px-1.5 text-center text-[10.5px] font-bold leading-5 tabular-nums', active ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/75')}>
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

function QueueCard({ items, onNavigate }: { items: AttentionItem[]; onNavigate?: () => void }) {
  const pending = items.filter((i) => i.count > 0);
  const total = pending.reduce((n, i) => n + i.count, 0);
  const colors: Record<string, string> = { rose: 'bg-rose-400', amber: 'bg-amber-400', sky: 'bg-sky-400', gray: 'bg-white/40' };
  return (
    <Link to="/" onClick={onNavigate} className="sidebar-queue mx-3 mb-3 block shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.07]">
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-1.5 font-semibold text-white/85">
          <span className={cn('h-1.5 w-1.5 rounded-full', total ? 'live-dot bg-rose-400' : 'bg-emerald-400')} /> Action queue
        </span>
        <span className="font-semibold tabular-nums text-white/60">{total ? `${total} waiting` : 'All clear'}</span>
      </div>
      <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-white/10">
        {pending.map((i) => (
          <span key={i.key} className={cn('h-full', colors[i.tone] || 'bg-orange-400')} style={{ width: `${(i.count / (total || 1)) * 100}%` }} />
        ))}
      </div>
      <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-orange-300">
        Open dashboard <ChevronRight size={11} />
      </span>
    </Link>
  );
}

function SidebarBody({
  counts,
  items,
  onNavigate,
  instanceId,
  collapsed = false,
  onToggleCollapse,
}: {
  counts: Partial<Record<BadgeKey, number>>;
  items: AttentionItem[];
  onNavigate?: () => void;
  instanceId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { user, logout } = useAuth();
  if (collapsed) {
    return (
      <>
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/[0.06]">
          <button onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_8px_18px_-8px_rgba(255,90,31,0.9)]">
            <SidebarSimple size={17} />
          </button>
        </div>
        <div className="h-3" />
        <SidebarNav counts={counts} onNavigate={onNavigate} instanceId={instanceId} collapsed />
        <div className="flex shrink-0 justify-center border-t border-white/[0.06] py-3">
          <Avatar name={user?.name} src={user?.avatarUrl} size={32} />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] px-5">
        <Link to="/" onClick={onNavigate} className="sidebar-logo flex items-center gap-2">
          <Logo className="h-7 w-auto" />
        </Link>
        <span className="ml-1 rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-200">Admin</span>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse} title="Collapse sidebar" aria-label="Collapse sidebar" className="ml-auto hidden rounded-lg p-1.5 text-white/40 hover:bg-white/[0.07] hover:text-white lg:block">
            <SidebarSimple size={17} />
          </button>
        )}
      </div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-4">
        <Favorites onNavigate={onNavigate} />
        <SidebarNav counts={counts} onNavigate={onNavigate} instanceId={instanceId} />
      </div>
      <QueueCard items={items} onNavigate={onNavigate} />
      <div className="mx-3 mb-3 flex shrink-0 items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2.5">
        <span className="relative">
          <Avatar name={user?.name} src={user?.avatarUrl} size={34} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1b1a1f]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-white">
            <span className="truncate">{user?.name}</span>
            <span className="rounded bg-amber-400/15 px-1 text-[9px] font-bold uppercase text-amber-300">Admin</span>
          </p>
          <p className="truncate text-[11px] text-white/45">{user?.email}</p>
        </div>
        <button onClick={logout} title="Log out" aria-label="Log out" className="rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white">
          <LogOut size={16} />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Top bar: Explore, Apps and Quick create menus
// ---------------------------------------------------------------------------
const EXPLORE = ['/', '/activity', '/app-analytics', '/insights/finance', '/insights/growth', '/insights/content', '/insights/leaderboards', '/system'];
const APPS = ['/users', '/posts', '/stories', '/communities', '/sessions', '/store', '/transactions', '/broadcast', '/home-layout'];
const QUICK_CREATE = [
  { href: '/broadcast', label: 'Send a notification', hint: 'Push to everyone or a group' },
  { href: '/home-banners', label: 'Add a home banner', hint: 'Slider on the app home' },
  { href: '/categories', label: 'Add a category', hint: 'Creator categories' },
  { href: '/subscription-plans', label: 'New subscription plan', hint: 'Creator or brand plan' },
  { href: '/agencies', label: 'Create an agency', hint: 'Agency login' },
  { href: '/admins', label: 'Add an admin', hint: 'Who can use this panel' },
];
const byHref = (list: string[]) => list.map((h) => ALL_NAV_ITEMS.find((i) => i.href === h)).filter(Boolean) as typeof ALL_NAV_ITEMS;

function ExploreMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className={cn('flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white', open && 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white')}>
        <LayoutGrid size={15} /> Explore <ChevronDown size={12} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="left-0 right-auto w-[440px] max-w-[calc(100vw-2rem)]">
        <div className="grid grid-cols-2 gap-1 p-2">
          {byHref(EXPLORE).map((item) => (
            <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-white/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <item.icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-gray-900 dark:text-white">{item.label}</span>
                <span className="line-clamp-2 block text-[11.5px] text-gray-500 dark:text-white/45">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function AppsMenu() {
  const [open, setOpen] = useState(false);
  const tones = ['bg-orange-50 text-orange-600', 'bg-sky-50 text-sky-600', 'bg-pink-50 text-pink-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600', 'bg-indigo-50 text-indigo-600', 'bg-teal-50 text-teal-600', 'bg-rose-50 text-rose-600', 'bg-fuchsia-50 text-fuchsia-600'];
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className={cn('flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white', open && 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white')}>
        <DotsNine size={15} /> Apps <ChevronDown size={12} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="left-0 right-auto w-[340px] max-w-[calc(100vw-2rem)]">
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {byHref(APPS).map((item, i) => (
            <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 rounded-xl p-3 text-center hover:bg-gray-50 dark:hover:bg-white/5">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl dark:bg-white/10 dark:text-white', tones[i % tones.length])}>
                <item.icon size={19} />
              </span>
              <span className="text-[11.5px] font-medium text-gray-700 dark:text-white/75">{item.label}</span>
            </Link>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function QuickCreate() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-full bg-orange-500 px-3 text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(255,90,31,0.95)] transition-colors hover:bg-orange-600 sm:px-4" aria-label="Quick create">
        <Plus size={15} /> <span className="hidden sm:inline">Quick create</span> <ChevronDown size={12} className="hidden sm:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-72 max-w-[calc(100vw-2rem)]">
        <div className="p-1.5">
          {QUICK_CREATE.map((q) => (
            <Link key={q.href} to={q.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <Plus size={13} />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-gray-900 dark:text-white">{q.label}</span>
                <span className="block text-[11.5px] text-gray-500 dark:text-white/45">{q.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return { on, toggle };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function AdminLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const fullscreen = useFullscreen();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        // not remembered
      }
      return !v;
    });
  const { items, counts, failed, reload } = useAttention();

  // Longest match wins, so /store/orders shows "Fanitt Store".
  const currentPage = ALL_NAV_ITEMS.filter((item) => isNavActive(item.href, location.pathname, location.search)).sort((a, b) => b.href.length - a.href.length)[0];

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.title = currentPage ? `${currentPage.label} · Fanitt Admin` : 'Fanitt Admin';
  }, [currentPage]);

  const isDashboard = location.pathname === '/';

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar — sticky, scrolls on its own */}
      <aside className={cn('sidebar hidden h-screen shrink-0 flex-col text-white transition-[width] duration-200 lg:sticky lg:top-0 lg:flex', collapsed ? 'w-[72px]' : 'w-[264px]')}>
        <SidebarBody counts={counts} items={items} instanceId="desktop" collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-gray-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0f1219]/90 sm:gap-3 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="-ml-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5 lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Link to="/" className="lg:hidden">
            <Logo className="h-6 w-auto" />
          </Link>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-10 w-[300px] items-center gap-2.5 rounded-full border border-gray-200 bg-gray-50/80 pl-1.5 pr-2 text-left text-[13px] text-gray-400 transition-colors hover:border-gray-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white/40 md:flex"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
              <Search size={14} />
            </span>
            <span className="flex-1 truncate">Search users, campaigns, pages…</span>
            <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-white/10 dark:bg-white/5">Ctrl K</kbd>
          </button>

          <div className="hidden items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50/80 p-0.5 dark:border-white/10 dark:bg-white/[0.04] xl:flex">
            <ExploreMenu />
            <AppsMenu />
          </div>

          <div className="flex-1" />

          <span className="md:hidden">
            <TopButton label="Search" onClick={() => setPaletteOpen(true)}>
              <Search size={18} />
            </TopButton>
          </span>
          <QuickCreate />
          <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500 transition-colors hover:bg-amber-100 dark:bg-white/[0.06] dark:text-amber-300 dark:hover:bg-white/10">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="hidden items-center gap-0.5 rounded-full border border-gray-200 p-0.5 dark:border-white/10 sm:flex">
            <TopButton label={fullscreen.on ? 'Exit full screen' : 'Full screen'} onClick={fullscreen.toggle}>
              {fullscreen.on ? <Minimize size={16} /> : <Maximize size={16} />}
            </TopButton>
            <NotificationsMenu items={items} onOpen={reload} failed={failed} />
          </div>
          <span className="sm:hidden">
            <NotificationsMenu items={items} onOpen={reload} failed={failed} />
          </span>
          <ProfileMenu />
        </header>

        {/* Page band: title on the left, breadcrumb on the right */}
        <div className="flex h-12 items-center justify-between gap-3 border-b border-gray-200/70 bg-white/60 px-4 dark:border-white/[0.05] dark:bg-white/[0.015] sm:px-6 lg:px-8">
          <p className="truncate text-[12px] font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-white/75">{currentPage?.label ?? 'Admin panel'}</p>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[12.5px] sm:flex">
            <Link to="/" className="font-medium text-orange-600 hover:underline dark:text-orange-300">
              Dashboard
            </Link>
            {!isDashboard && currentPage && (
              <>
                <span className="text-gray-300 dark:text-white/25">/</span>
                <span className="text-gray-400 dark:text-white/40">{currentPage.section}</span>
                <span className="text-gray-300 dark:text-white/25">/</span>
                <span className="truncate font-medium text-gray-700 dark:text-white/80">{currentPage.label}</span>
              </>
            )}
          </nav>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-950/50" onClick={() => setMobileOpen(false)} />
              <motion.aside
                initial={{ x: -290 }}
                animate={{ x: 0 }}
                exit={{ x: -290 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="sidebar absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col text-white shadow-2xl"
              >
                <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white/50 hover:bg-white/10" aria-label="Close menu">
                  <X size={18} />
                </button>
                <SidebarBody counts={counts} items={items} onNavigate={() => setMobileOpen(false)} instanceId="mobile" />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/70 px-4 py-4 text-[12.5px] text-gray-500 dark:border-white/[0.05] dark:text-white/40 sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} <span className="font-semibold text-gray-700 dark:text-white/70">Fanitt</span> Admin · signed in as {user?.email}
          </span>
          <span className="flex gap-4">
            <Link to="/system" className="hover:text-orange-600">
              System health
            </Link>
            <Link to="/activity?tab=audit" className="hover:text-orange-600">
              Audit log
            </Link>
            <Link to="/settings" className="hover:text-orange-600">
              Settings
            </Link>
          </span>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
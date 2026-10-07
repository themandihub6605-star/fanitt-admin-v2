import { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users2,
  UserX,
  Images,
  Building2,
  Percent,
  ShieldAlert,
  Receipt,
  Tag,
  Flag,
  Wallet,
  Megaphone,
  Settings,
  UserCog,
  KeyRound,
  LogOut,
  Menu,
  X,
  Layers,
  Milestone,
  Sun,
  Moon,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Check,
  UsersRound,
  FileText,
  Store,
  LayoutGrid,
  Video,
  Activity,
  BadgeCheck,
  ClipboardCheck,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useBackground, BACKGROUND_OPTIONS } from '@/context/BackgroundContext';
import { cn } from '@/utils/cn';
import { adminApi } from '@/services/adminApi';
import { accountDeletionApi } from '@/services/accountDeletionApi';

/** A nav item is active on its own page and on pages under it (e.g. /store/orders). */
function isNavActive(href: string, pathname: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

type BadgeKey = 'verifications' | 'withdrawals' | 'deletions';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line shown in search and on hover — what this page is for. */
  hint: string;
  /** Extra words people may type in "Jump to". */
  keywords?: string;
  badge?: BadgeKey;
};

type NavSection = { label: string; items: NavItem[] };

// Grouped by the job you came to do, most-used first.
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, hint: 'Platform numbers at a glance', keywords: 'home stats' },
      { href: '/app-analytics', label: 'App analytics', icon: Activity, hint: 'App installs, active users and screens', keywords: 'downloads usage' },
    ],
  },
  {
    label: 'Needs your action',
    items: [
      { href: '/verifications', label: 'Profile approvals', icon: BadgeCheck, hint: 'Approve or reject creator & brand profiles', keywords: 'verification verify pending kyc', badge: 'verifications' },
      { href: '/withdrawals', label: 'Withdrawal requests', icon: Wallet, hint: 'Pay out creator earnings', keywords: 'payout money bank upi', badge: 'withdrawals' },
      { href: '/account-deletions', label: 'Account deletions', icon: UserX, hint: 'Users who asked to delete their account', keywords: 'delete remove', badge: 'deletions' },
      { href: '/campaigns', label: 'Campaign review', icon: ClipboardCheck, hint: 'Approve, reject or unpublish brand campaigns', keywords: 'brand campaign approve' },
      { href: '/escrow-disputes', label: 'Payment disputes', icon: ShieldAlert, hint: 'Release or refund disputed escrow money', keywords: 'escrow refund dispute' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/users', label: 'All users', icon: Users2, hint: 'Search users, see profiles, ask to update, suspend', keywords: 'user creator brand fan phone incomplete' },
      { href: '/agencies', label: 'Agencies', icon: Building2, hint: 'Agency accounts and their creators', keywords: 'agency' },
      { href: '/admins', label: 'Admin team', icon: UserCog, hint: 'Who can log in to this panel', keywords: 'admin accounts staff' },
    ],
  },
  {
    label: 'App screens',
    items: [
      { href: '/home-layout', label: 'Home screen sections', icon: LayoutGrid, hint: 'Order, titles and pinned items on the app home', keywords: 'home layout rails' },
      { href: '/home-banners', label: 'Home slider', icon: Images, hint: 'Banner images at the top of the app home', keywords: 'banner carousel hero' },
      { href: '/categories', label: 'Categories', icon: Tag, hint: 'Creator categories shown in the app', keywords: 'category niche' },
      { href: '/broadcast', label: 'Send notification', icon: Megaphone, hint: 'Push a notification to everyone or a group', keywords: 'broadcast push message' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/communities', label: 'Communities', icon: UsersRound, hint: 'Communities, paid plans and payments', keywords: 'community group' },
      { href: '/posts', label: 'Posts', icon: FileText, hint: 'Search, edit or delete feed & community posts', keywords: 'post feed' },
      { href: '/live-sessions', label: 'Live sessions', icon: Video, hint: 'Watch, join or end creator meets', keywords: 'meet live video call' },
      { href: '/moderation', label: 'Reviews & moderation', icon: Flag, hint: 'Sessions, campaigns and reviews to moderate', keywords: 'moderation report hide review' },
    ],
  },
  {
    label: 'Fanitt Store',
    items: [{ href: '/store', label: 'Store dashboard', icon: Store, hint: 'Stores, KYC, products, orders, live, calls, FanBox', keywords: 'shop product order kyc fanbox affiliate' }],
  },
  {
    label: 'Money',
    items: [
      { href: '/transactions', label: 'Transactions', icon: Receipt, hint: 'Every payment on the platform', keywords: 'payment razorpay' },
      { href: '/milestones', label: 'Milestone payments', icon: Milestone, hint: 'Campaign milestones and escrow status', keywords: 'escrow milestone' },
      { href: '/subscription-plans', label: 'Subscription plans', icon: Layers, hint: 'Creator & brand plans and prices', keywords: 'plan pricing lite pro' },
      { href: '/referral-config', label: 'Referral commission', icon: Percent, hint: 'Referral and agency commission rates', keywords: 'referral commission' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/settings', label: 'Site settings', icon: Settings, hint: 'Platform-wide switches and config', keywords: 'config settings' },
      { href: '/change-password', label: 'Change password', icon: KeyRound, hint: 'Your admin password', keywords: 'password' },
    ],
  },
];

const SECTIONS_KEY = 'fanitt-admin-closed-sections';

function readClosedSections(): Set<string> {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Counts for the "Needs your action" badges. Refreshed on page change. */
function useActionCounts() {
  const location = useLocation();
  const [counts, setCounts] = useState<Partial<Record<BadgeKey, number>>>({});
  const last = useRef(0);

  useEffect(() => {
    // At most once every 30s while moving between pages.
    if (Date.now() - last.current < 30_000) return;
    last.current = Date.now();
    adminApi
      .listPendingVerifications()
      .then((d) => setCounts((c) => ({ ...c, verifications: (d.pendingCreators?.length ?? 0) + (d.pendingBrands?.length ?? 0) })))
      .catch(() => {});
    adminApi
      .listWithdrawals('initiated')
      .then((d) => setCounts((c) => ({ ...c, withdrawals: d.length })))
      .catch(() => {});
    accountDeletionApi
      .list({ status: 'pending' })
      .then((d) => setCounts((c) => ({ ...c, deletions: d.total })))
      .catch(() => {});
  }, [location.pathname]);

  return counts;
}

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.label })));

/** Best match first: label start, then label, then hint / keywords. */
function searchNav(term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const scored = ALL_NAV_ITEMS.map((item) => {
    const label = item.label.toLowerCase();
    const rest = `${item.hint} ${item.keywords ?? ''} ${item.section}`.toLowerCase();
    const score = label.startsWith(q) ? 3 : label.includes(q) ? 2 : rest.includes(q) ? 1 : 0;
    return { item, score };
  }).filter((r) => r.score > 0);
  return scored.sort((a, b) => b.score - a.score).slice(0, 7).map((r) => r.item);
}

/** "Jump to a page" with live suggestions. Ctrl/⌘ + K focuses it. */
function JumpSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchNav(term), [term]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    navigate(href);
    setTerm('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400 focus-within:border-orange-300 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
        <Search size={15} />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && results[cursor]) {
              go(results[cursor].href);
            } else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Find a page… e.g. payouts"
          className="w-52 bg-transparent text-xs font-medium text-gray-600 outline-none placeholder:text-gray-400 dark:text-white/70 dark:placeholder:text-white/30"
        />
        <kbd className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-400 dark:border-white/10 dark:text-white/30">Ctrl K</kbd>
      </div>

      <AnimatePresence>
        {open && term.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#171B26]"
          >
            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 dark:text-white/40">No page matches “{term.trim()}”.</p>
            ) : (
              results.map((item, i) => (
                <button
                  key={item.href}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left',
                    i === cursor ? 'bg-orange-50 dark:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <item.icon size={16} className="shrink-0 text-orange-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-gray-800 dark:text-white">{item.label}</span>
                    <span className="block truncate text-[11px] text-gray-400 dark:text-white/40">
                      {item.section} · {item.hint}
                    </span>
                  </span>
                  {i === cursor && <CornerDownLeft size={13} className="shrink-0 text-gray-300 dark:text-white/30" />}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** Picker for the panel's background image — a small popover of
 * swatches (the 3 curated photos + the warm texture + plain white).
 * Selecting one persists via BackgroundContext/localStorage and the
 * layout crossfades to it immediately. */
function BackgroundPicker() {
  const { backgroundId, setBackgroundId } = useBackground();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change background"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
      >
        <ImageIcon size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#171B26]"
            >
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Panel Background</p>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_OPTIONS.map((opt) => {
                  const selected = opt.id === backgroundId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setBackgroundId(opt.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-1.5 transition-colors',
                        selected ? 'border-orange-400' : 'border-transparent hover:border-gray-200 dark:hover:border-white/10'
                      )}
                    >
                      <span
                        className={cn(
                          'relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-white/10',
                          !opt.thumbnailUrl && 'bg-white dark:bg-[#0D1017]'
                        )}
                        style={opt.thumbnailUrl ? { backgroundImage: `url('${opt.thumbnailUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      >
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shadow"
                          >
                            <Check size={12} />
                          </motion.span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-white/50">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sidebar menu. Sections fold open/closed (remembered in this browser);
 * the section holding the open page always stays open. The menu scrolls
 * on its own — the page next to it scrolls separately.
 *
 * `instanceId` scopes the active pill's layoutId, because the desktop
 * sidebar and the mobile drawer can both be mounted at once. */
function SidebarNav({ onNavigate, instanceId, counts }: { onNavigate?: () => void; instanceId: string; counts: Partial<Record<BadgeKey, number>> }) {
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
        // Private mode — folding just isn't remembered.
      }
      return next;
    });
  };

  return (
    <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      {NAV_SECTIONS.map((section) => {
        const hasActiveItem = section.items.some((item) => isNavActive(item.href, location.pathname));
        const isOpen = hasActiveItem || !closed.has(section.label);
        const sectionCount = section.items.reduce((sum, item) => sum + (item.badge ? counts[item.badge] ?? 0 : 0), 0);
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              disabled={hasActiveItem}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                hasActiveItem ? 'cursor-default text-orange-600 dark:text-orange-400' : 'text-gray-500 hover:text-gray-800 dark:text-white/40 dark:hover:text-white/70'
              )}
            >
              <span className="flex-1 text-left">{section.label}</span>
              {!isOpen && sectionCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white">{sectionCount}</span>
              )}
              {!hasActiveItem && (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 pb-1 pt-0.5">
                    {section.items.map((item) => {
                      const active = isNavActive(item.href, location.pathname);
                      const count = item.badge ? counts[item.badge] ?? 0 : 0;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={onNavigate}
                          title={item.hint}
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                            active ? 'text-white' : 'text-gray-700 hover:bg-white/60 dark:text-white/65 dark:hover:bg-white/5'
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId={`active-nav-pill-${instanceId}`}
                              className="absolute inset-0 rounded-xl bg-brand-gradient shadow-md shadow-pink-500/20"
                              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                            />
                          )}
                          <item.icon size={17} className={cn('relative z-10 shrink-0', active && 'text-white')} />
                          <span className="relative z-10 flex-1 truncate">{item.label}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                'relative z-10 min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold leading-5',
                                active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'
                              )}
                            >
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

export function AdminLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { background } = useBackground();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const counts = useActionCounts();

  // Longest match wins, so /store/orders shows "Store dashboard".
  const currentPage = ALL_NAV_ITEMS.filter((item) => isNavActive(item.href, location.pathname)).sort((a, b) => b.href.length - a.href.length)[0];

  // Close the mobile menu after any navigation.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const backgroundStyle =
    background.url === null
      ? undefined
      : {
          backgroundImage:
            theme === 'dark'
              ? `linear-gradient(rgba(11,13,20,0.35),rgba(11,13,20,0.35)), url('${background.url}')`
              : `linear-gradient(rgba(250,250,251,0.35),rgba(250,250,251,0.35)), url('${background.url}')`,
        };

  return (
    <div className="min-h-screen bg-[#F1F2F8] dark:bg-[#0D1017] lg:flex">
      {/* Desktop sidebar — Point-Fix: plain white felt flat/washed-out
          against the page's own light-grey background (barely any
          contrast). A very soft indigo-tinted off-white gives the
          sidebar its own visual identity instead of blending into the
          page. */}
      {/* Desktop sidebar — fixed to the screen height and sticky, so it
          never scrolls away with the page; the menu inside scrolls on
          its own when it is taller than the screen. */}
      <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-gray-200 bg-[linear-gradient(160deg,#FFE1D3_0%,#FFD9E8_100%)] px-4 py-5 dark:border-white/10 dark:bg-[#111521] dark:bg-none lg:sticky lg:top-0 lg:flex">
        <Link to="/" className="mb-5 flex shrink-0 items-center gap-2 px-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <SidebarNav instanceId="desktop" counts={counts} />

        <div className="mt-3 flex shrink-0 items-center gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-gray-400 dark:text-white/40">Admin</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Background image layer — a separate absolutely-positioned
            element (not painted directly via the content wrapper's own
            style) so switching the selection can crossfade with
            AnimatePresence instead of popping instantly. */}
        <AnimatePresence mode="sync">
          <motion.div
            key={background.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={backgroundStyle}
          />
        </AnimatePresence>

        <div className="relative flex min-h-screen flex-1 flex-col">
          {/* Topbar — desktop + mobile */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111521]/80 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">{currentPage?.section ?? 'Admin panel'}</p>
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {currentPage?.label || 'Admin panel'}
                  {currentPage?.hint && <span className="ml-2 font-medium text-gray-400 dark:text-white/40">— {currentPage.hint}</span>}
                </p>
              </div>
              <Link to="/" className="lg:hidden">
                <Logo className="h-7 w-auto" />
              </Link>
            </div>

            <JumpSearch />

            <div className="flex items-center gap-2">
              <BackgroundPicker />
              <ThemeToggle />
              <button
                aria-label="Notifications"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
              >
                <Bell size={16} />
              </button>

              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 py-1.5 pl-1.5 pr-2.5 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-700 dark:text-white/80">{user?.name}</span>
                  <ChevronDown size={13} className="text-gray-400 dark:text-white/40" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#171B26]"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <Link
                      to="/change-password"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5"
                    >
                      <KeyRound size={14} /> Change Password
                    </Link>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Mobile sidebar drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
              <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[linear-gradient(160deg,#FFE1D3_0%,#FFD9E8_100%)] px-4 py-5 dark:bg-[#111521] dark:bg-none">
                <div className="mb-5 flex shrink-0 items-center justify-between px-2">
                  <Logo className="h-8 w-auto" />
                  <button onClick={() => setMobileOpen(false)} className="text-gray-400 dark:text-white/50" aria-label="Close menu">
                    <X size={20} />
                  </button>
                </div>
                <SidebarNav onNavigate={() => setMobileOpen(false)} instanceId="mobile" counts={counts} />
                <button
                  onClick={logout}
                  className="mt-3 flex shrink-0 items-center gap-2.5 rounded-xl border-t border-gray-200 px-3 pt-4 text-left text-sm font-semibold text-rose-500 dark:border-white/10 dark:text-rose-400"
                >
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
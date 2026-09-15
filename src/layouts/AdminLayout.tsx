import { type PropsWithChildren, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users2,
  ShieldCheck,
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
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useBackground, BACKGROUND_OPTIONS } from '@/context/BackgroundContext';
import { cn } from '@/utils/cn';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'People',
    items: [
      { href: '/users', label: 'Users', icon: Users2 },
      { href: '/verifications', label: 'Verifications', icon: ShieldCheck },
      { href: '/agencies', label: 'Agencies', icon: Building2 },
      { href: '/admins', label: 'Admin Accounts', icon: UserCog },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/transactions', label: 'Transactions', icon: Receipt },
      { href: '/withdrawals', label: 'Withdrawals', icon: Wallet },
      { href: '/escrow-disputes', label: 'Escrow Disputes', icon: ShieldAlert },
      { href: '/milestones', label: 'Milestones', icon: Milestone },
      { href: '/referral-config', label: 'Referral Commission', icon: Percent },
      { href: '/subscription-plans', label: 'Subscription Plans', icon: Layers },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/moderation', label: 'Content Moderation', icon: Flag },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/broadcast', label: 'Broadcast', icon: Megaphone },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/settings', label: 'Site Settings', icon: Settings },
      { href: '/change-password', label: 'Change Password', icon: KeyRound },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

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

/** Accordion-style sidebar — each section (Overview/People/Money/...) can
 * be collapsed independently, so a page like Money (6 items) doesn't
 * permanently push everything below it down when you only care about
 * People right now. Starts fully expanded (matches the old always-open
 * behaviour) and remembers per-section state locally, not persisted —
 * this is just a scan/declutter aid, not a setting worth saving.
 *
 * `instanceId` scopes the active-item indicator's shared layoutId —
 * needed because the desktop sidebar and the mobile drawer both mount
 * this component at once (the desktop one just hidden via CSS on
 * small screens), and framer-motion's layout animation breaks if two
 * elements in the DOM share the same layoutId at the same time. */
function SidebarNav({ onNavigate, instanceId }: { onNavigate?: () => void; instanceId: string }) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(NAV_SECTIONS.map((s) => s.label)));

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {NAV_SECTIONS.map((section) => {
        const isOpen = openSections.has(section.label);
        const hasActiveItem = section.items.some((item) => item.href === location.pathname);
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                hasActiveItem ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/50'
              )}
            >
              {section.label}
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
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
                      const active = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={onNavigate}
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                            active ? 'text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5'
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId={`active-nav-pill-${instanceId}`}
                              className="absolute inset-0 rounded-xl bg-brand-gradient shadow-md shadow-pink-500/20"
                              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                            />
                          )}
                          <item.icon size={17} className={cn('relative z-10', active && 'text-white')} />
                          <span className="relative z-10">{item.label}</span>
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { background } = useBackground();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentPage = ALL_NAV_ITEMS.find((item) => item.href === location.pathname);

  // Quick-jump search: typing a nav section's name (e.g. "withdrawals")
  // and hitting Enter routes straight there — real navigation, not a
  // decorative input with nothing behind it.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const match = ALL_NAV_ITEMS.find((item) => item.label.toLowerCase().includes(term));
    if (match) {
      navigate(match.href);
      setSearchTerm('');
    }
  };

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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-200 bg-[linear-gradient(160deg,#FFE1D3_0%,#FFD9E8_100%)] px-4 py-6 dark:border-white/10 dark:bg-[#111521] dark:bg-none lg:flex">
        <Link to="/" className="mb-7 flex items-center gap-2 px-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <SidebarNav instanceId="desktop" />

        <div className="mt-4 flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
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

      <div className="relative flex min-h-screen flex-1 flex-col">
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
              <div className="hidden lg:block">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{currentPage?.label || 'Admin Panel'}</p>
              </div>
              <Link to="/" className="lg:hidden">
                <Logo className="h-7 w-auto" />
              </Link>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white/40 md:flex"
            >
              <Search size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Jump to a page..."
                className="w-44 bg-transparent text-xs font-medium text-gray-600 outline-none placeholder:text-gray-400 dark:text-white/70 dark:placeholder:text-white/30"
              />
            </form>

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
              <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[linear-gradient(160deg,#FFE1D3_0%,#FFD9E8_100%)] px-4 py-6 dark:bg-[#111521] dark:bg-none">
                <div className="mb-7 flex items-center justify-between px-2">
                  <Logo className="h-8 w-auto" />
                  <button onClick={() => setMobileOpen(false)} className="text-gray-400 dark:text-white/50" aria-label="Close menu">
                    <X size={20} />
                  </button>
                </div>
                <SidebarNav onNavigate={() => setMobileOpen(false)} instanceId="mobile" />
                <button
                  onClick={logout}
                  className="mt-4 flex items-center gap-2.5 rounded-xl border-t border-gray-200 px-3 pt-4 text-left text-sm font-semibold text-rose-500 dark:border-white/10 dark:text-rose-400"
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

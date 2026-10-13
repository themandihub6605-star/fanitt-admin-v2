import {
  Activity,
  BadgeCheck,
  BarChart3,
  Aperture,
  Briefcase,
  Building2,
  CalendarClock,
  Gift,
  MessagesSquare,
  Scales,
  Star,
  ChartLineUp,
  Coins,
  Funnel,
  Trophy,
  ClipboardCheck,
  FileText,
  HeartPulse,
  History,
  Images,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  Megaphone,
  Milestone,
  Percent,
  Receipt,
  Settings,
  ShieldAlert,
  Store,
  Tag,
  UserCog,
  Users2,
  UsersRound,
  UserX,
  Video,
  Wallet,
  type LucideIcon,
} from '@/icons';

export type BadgeKey = 'verifications' | 'withdrawals' | 'deletions' | 'campaigns' | 'disputes' | 'store-kyc' | 'reviews' | 'api';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line shown in search and on hover — what this page is for. */
  hint: string;
  /** Extra words people may type in search. */
  keywords?: string;
  badge?: BadgeKey;
};

export type NavSection = { label: string; items: NavItem[] };

// Grouped by the job you came to do, most-used first.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, hint: 'The whole platform at a glance', keywords: 'home stats overview kpi' },
      { href: '/activity', label: 'Activity', icon: History, hint: 'Everything happening on the app and website', keywords: 'log timeline feed events tracking' },
      { href: '/app-analytics', label: 'App analytics', icon: BarChart3, hint: 'App users, screens and time spent', keywords: 'downloads usage screens' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/insights/finance', label: 'Finance center', icon: Coins, hint: 'Money in, commission, payouts, refunds, monthly report', keywords: 'revenue earnings money report accounting gmv take rate' },
      { href: '/insights/growth', label: 'Growth funnel', icon: Funnel, hint: 'Sign-ups → onboarding → verified → posted → paid', keywords: 'funnel conversion signup onboarding retention' },
      { href: '/insights/content', label: 'Content analytics', icon: ChartLineUp, hint: 'Posts, reels, stories, likes and reviews', keywords: 'engagement posts reels stories likes ratings' },
      { href: '/insights/leaderboards', label: 'Leaderboards', icon: Trophy, hint: 'Top creators, spenders, posts, communities, stores', keywords: 'top best ranking earners followers' },
    ],
  },
  {
    label: 'Action center',
    items: [
      { href: '/verifications', label: 'Profile approvals', icon: BadgeCheck, hint: 'Approve or reject creator & brand profiles', keywords: 'verification verify pending kyc', badge: 'verifications' },
      { href: '/withdrawals', label: 'Withdrawals', icon: Wallet, hint: 'Pay out creator earnings', keywords: 'payout money bank upi', badge: 'withdrawals' },
      { href: '/campaigns', label: 'Campaign review', icon: ClipboardCheck, hint: 'Approve, reject or unpublish brand campaigns', keywords: 'brand campaign approve', badge: 'campaigns' },
      { href: '/applications', label: 'Applications', icon: Briefcase, hint: 'Creator pitches on brand campaigns', keywords: 'apply pitch proposal creator campaign' },
      { href: '/escrow-disputes', label: 'Payment disputes', icon: ShieldAlert, hint: 'Release or refund disputed escrow money', keywords: 'escrow refund dispute', badge: 'disputes' },
      { href: '/account-deletions', label: 'Account deletions', icon: UserX, hint: 'Users who asked to delete their account', keywords: 'delete remove', badge: 'deletions' },
    ],
  },
  {
    label: 'Users & accounts',
    items: [
      { href: '/users', label: 'All users', icon: Users2, hint: 'Search users, see profiles, suspend', keywords: 'user creator brand fan phone incomplete' },
      { href: '/agencies', label: 'Agencies', icon: Building2, hint: 'Agency accounts and their creators', keywords: 'agency' },
      { href: '/wallets', label: 'Wallets', icon: Wallet, hint: 'Money in users’ Fanitt wallets', keywords: 'wallet balance owed' },
    ],
  },
  {
    label: 'Content & moderation',
    items: [
      { href: '/posts', label: 'Posts', icon: FileText, hint: 'Search, edit or delete feed & community posts', keywords: 'post feed reel' },
      { href: '/stories', label: 'Stories', icon: Aperture, hint: 'Live 24-hour stories — watch and remove', keywords: 'story status 24h' },
      { href: '/reviews', label: 'Reviews', icon: Star, hint: 'Ratings left on creators — hide fake or abusive ones', keywords: 'moderation report hide review flagged rating', badge: 'reviews' },
      { href: '/communities', label: 'Communities', icon: UsersRound, hint: 'Communities, members, paid plans and payments', keywords: 'community group members' },
      { href: '/community-content', label: 'Community chat', icon: MessagesSquare, hint: 'Comments and chat messages in communities', keywords: 'comment chat message spam abuse' },
      { href: '/sessions', label: 'Sessions & bookings', icon: CalendarClock, hint: '1:1 and group sessions, who booked, cancel with refund list', keywords: 'session booking cancel refund call' },
      { href: '/live-sessions', label: 'Live meets', icon: Video, hint: 'Watch, join or end creator meets', keywords: 'meet live video call' },
    ],
  },
  {
    label: 'Commerce',
    items: [{ href: '/store', label: 'Fanitt Store', icon: Store, hint: 'Stores, KYC, products, orders, live, calls, FanBox', keywords: 'shop product order kyc fanbox affiliate', badge: 'store-kyc' }],
  },
  {
    label: 'Finance',
    items: [
      { href: '/transactions', label: 'Transactions', icon: Receipt, hint: 'Every payment on the platform', keywords: 'payment razorpay revenue' },
      { href: '/gifts', label: 'Gifts & donations', icon: Gift, hint: 'Gifts, session donations and FanBox tips', keywords: 'gift donation tip fanbox support' },
      { href: '/milestones', label: 'Milestone payments', icon: Milestone, hint: 'Campaign milestones and escrow status', keywords: 'escrow milestone' },
      { href: '/subscription-plans', label: 'Subscription plans', icon: Layers, hint: 'Creator & brand plans and prices', keywords: 'plan pricing lite pro' },
      { href: '/referral-config', label: 'Referral commission', icon: Percent, hint: 'Referral and agency commission rates', keywords: 'referral commission' },
    ],
  },
  {
    label: 'App & website',
    items: [
      { href: '/home-layout', label: 'Home screen sections', icon: LayoutGrid, hint: 'Order, titles and pinned items on the app home', keywords: 'home layout rails' },
      { href: '/home-banners', label: 'Home slider', icon: Images, hint: 'Banner images at the top of the app home', keywords: 'banner carousel hero' },
      { href: '/categories', label: 'Categories', icon: Tag, hint: 'Creator categories shown in the app', keywords: 'category niche' },
      { href: '/broadcast', label: 'Notifications', icon: Megaphone, hint: 'Push a notification to everyone or a group', keywords: 'broadcast push message' },
      { href: '/legal', label: 'Legal pages', icon: Scales, hint: 'Privacy Policy and Terms of Use', keywords: 'terms privacy policy legal' },
    ],
  },
  {
    label: 'System & security',
    items: [
      { href: '/system', label: 'System health', icon: HeartPulse, hint: 'API errors, missing routes and traffic', keywords: 'errors api health uptime 500 404 monitoring', badge: 'api' },
      { href: '/activity?tab=audit', label: 'Audit log', icon: Activity, hint: 'Every change made by an admin', keywords: 'audit admin actions history who changed' },
      { href: '/activity?tab=logins', label: 'Login activity', icon: LogIn, hint: 'Sign-ins and failed logins', keywords: 'login signin failed security' },
      { href: '/admins', label: 'Admin team', icon: UserCog, hint: 'Who can log in to this panel', keywords: 'admin accounts staff team' },
      { href: '/settings', label: 'Site settings', icon: Settings, hint: 'Platform-wide switches and config', keywords: 'config settings maintenance commission' },
      { href: '/change-password', label: 'Change password', icon: KeyRound, hint: 'Your admin password', keywords: 'password' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.label })));

/** A nav item is active on its own page and on pages under it (e.g. /store/orders). Query items match on the query too. */
export function isNavActive(href: string, pathname: string, search = '') {
  const [path, query] = href.split('?');
  if (query) return pathname === path && search.includes(query);
  if (path === '/activity' && /tab=(audit|logins)/.test(search)) return false;
  return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
}

/** Best match first: label start, then label, then hint / keywords. */
export function searchNav(term: string, limit = 7) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return ALL_NAV_ITEMS.map((item) => {
    const label = item.label.toLowerCase();
    const rest = `${item.hint} ${item.keywords ?? ''} ${item.section}`.toLowerCase();
    const score = label.startsWith(q) ? 3 : label.includes(q) ? 2 : rest.includes(q) ? 1 : 0;
    return { item, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}

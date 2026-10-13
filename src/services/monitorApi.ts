import { apiClient } from './apiClient';
import type { ApiEnvelope } from '@/types/api';

// Backend: src/monitor (GET /api/admin/monitor/*). All numbers are counted
// from the real collections; `null` means "this backend doesn't have that data".

export type Cmp = { current: number | null; previous: number | null };
export type Point = { date: string; value: number };

export interface AuditLog {
  _id: string;
  actor?: string;
  actorName: string;
  actorEmail: string;
  method: string;
  path: string;
  rawPath: string;
  area: string;
  targetType: string;
  targetId: string;
  status: number;
  success: boolean;
  message: string;
  changes: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
  durationMs: number;
  createdAt: string;
}

export interface AttentionItem {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: 'amber' | 'rose' | 'sky' | 'gray';
  amount?: number | null;
}

export interface Overview {
  period: { days: number; start: string; end: string };
  users: {
    total: number | null;
    new: Cmp;
    byRole: { creator: number | null; brand: number | null; fan: number | null; agency: number | null };
    suspended: number | null;
    active: { day: number | null; week: number | null; period: Cmp };
    appVisitors: number | null;
  };
  content: { posts: Cmp; reels: Cmp; storiesLive: number | null; communityPosts: Cmp; communities: { total: number | null; new: number | null } };
  business: { campaigns: Cmp & { total: number | null }; sessions: { upcoming: number | null; created: number | null }; activeSubscriptions: number | null };
  money: { gmv: Cmp; commission: Cmp; failedPayments: Cmp; refunds: number | null; inEscrow: number | null; pendingPayouts: number | null; allTime?: { moneyIn: number | null; commission: number | null } };
  store: { activeStores: number | null; digitalOrders: Cmp; digitalRevenue: number | null; shopOrders: Cmp; shopRevenue: number | null };
  attention: AttentionItem[];
  series: { signups: Point[] | null; revenue: Point[] | null; logins: Point[] | null; posts: Point[] | null };
  api: { requests24h: number; errors24h: number; clientErrors24h: number; errorRate: number | null; avgMs: number | null; openIssues: number | null };
  recentAdmin: AuditLog[];
  trackingSince: { adminActions: string | null; logins: string | null; api: string | null };
}

export interface ActivityItem {
  id: string;
  type: string;
  at: string;
  title: string;
  meta?: string;
  actor?: { name?: string; avatarUrl?: string; id?: string };
  thumb?: string;
  href: string | null;
  tone: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  days: number;
  sources: { key: string; label: string; count: number | null; available: boolean }[];
}

export interface AuthEvent {
  _id: string;
  user: string | null;
  name: string;
  email: string;
  role: string;
  action: string;
  success: boolean;
  reason: string;
  client: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface ApiIssue {
  _id: string;
  key: string;
  method: string;
  path: string;
  status: number;
  kind: 'server_error' | 'missing_route';
  count: number;
  lastMessage: string;
  lastRole: string;
  lastClient: string;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}

export interface SystemHealth {
  days: number;
  server: { uptimeSeconds: number; node: string; memoryMb: number; heapMb: number; database: string; environment: string };
  totals: { requests: number; serverErrors: number; clientErrors: number; errorRate: number | null; avgMs: number | null };
  traffic: { date: string; requests: number; clientErrors: number; serverErrors: number; avgMs: number }[];
  issues: ApiIssue[];
  trackingSince: string | null;
}

export interface SearchResults {
  users: { _id: string; name: string; email: string; role: string; avatarUrl?: string; isSuspended?: boolean }[];
  campaigns: { _id: string; title: string; status: string; approvalStatus?: string; budget?: number }[];
  communities: { _id: string; name: string; slug: string }[];
  stores: { _id: string; name: string; slug: string; status: string }[];
  transactions: { _id: string; type: string; status: string; amount: number; createdAt: string }[];
}

type Paged<T> = { items: T[]; total: number; page: number; pages: number };

export const monitorApi = {
  attention: () => apiClient.get<ApiEnvelope<AttentionItem[]>>('/admin/monitor/attention').then((r) => r.data.data),

  overview: (days: number) => apiClient.get<ApiEnvelope<Overview>>('/admin/monitor/overview', { params: { days } }).then((r) => r.data.data),

  activity: (params: { type?: string; days?: number; page?: number; limit?: number }) =>
    apiClient.get<ApiEnvelope<ActivityPage>>('/admin/monitor/activity', { params }).then((r) => r.data.data),

  auditLogs: (params: { search?: string; actor?: string; area?: string; result?: string; days?: number; page?: number; limit?: number; targetId?: string }) =>
    apiClient
      .get<ApiEnvelope<Paged<AuditLog> & { actors: { _id: string; name: string; email: string; count: number }[]; areas: string[]; trackingSince: string | null }>>('/admin/monitor/audit-logs', { params })
      .then((r) => r.data.data),

  authEvents: (params: { search?: string; result?: string; client?: string; days?: number; page?: number; limit?: number; user?: string }) =>
    apiClient
      .get<ApiEnvelope<Paged<AuthEvent> & { summary: { failed: number; succeeded: number }; trackingSince: string | null }>>('/admin/monitor/auth-events', { params })
      .then((r) => r.data.data),

  system: (days: number, all = false) => apiClient.get<ApiEnvelope<SystemHealth>>('/admin/monitor/system', { params: { days, all } }).then((r) => r.data.data),

  resolveIssue: (id: string) => apiClient.patch<ApiEnvelope<ApiIssue>>(`/admin/monitor/issues/${id}/resolve`).then((r) => r.data.data),

  search: (q: string) => apiClient.get<ApiEnvelope<SearchResults>>('/admin/monitor/search', { params: { q } }).then((r) => r.data.data),
};

/** True when the backend doesn't have the monitor module deployed yet. */
export function isMissingMonitor(err: unknown) {
  const e = err as { response?: { status?: number; data?: { message?: string } } };
  return e?.response?.status === 404 && String(e.response.data?.message || '').includes('/admin/monitor');
}

// ---------------------------------------------------------------------------
// Insights (GET /admin/monitor/leaderboards | finance | content | growth)
// ---------------------------------------------------------------------------
export interface RankedPerson {
  userId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  slug?: string;
  value: number;
  rating?: number;
}
export interface RankedPost {
  id: string;
  caption: string;
  value: number;
  likes?: number;
  thumb: string;
  author: string;
  authorId?: string;
  avatarUrl: string;
  createdAt: string;
}
export interface Leaderboards {
  days: number;
  topEarners: RankedPerson[] | null;
  topSpenders: RankedPerson[] | null;
  mostFollowed: RankedPerson[] | null;
  mostViewed: RankedPerson[] | null;
  topPosts: RankedPost[] | null;
  topReels: RankedPost[] | null;
  topCommunities: { id: string; name: string; slug: string; value: number; owner: string }[] | null;
  topStores: { id: string; name: string; slug: string; value: number }[] | null;
}
export interface FinanceStats {
  days: number;
  totals: {
    moneyIn: number | null;
    commission: number | null;
    payoutsPaid: number | null;
    payoutsPending: number | null;
    refunds: number | null;
    failedPayments: number | null;
    storeSales: number | null;
    shopSales: number | null;
  };
  byType: { type: string; amount: number }[] | null;
  commissionByType: { type: string; amount: number }[] | null;
  refundsByType: { type: string; amount: number }[] | null;
  failedByType: { type: string; count: number }[] | null;
  statusMix: { status: string; count: number }[] | null;
  storeByItem: { type: string; amount: number }[] | null;
  series: { moneyIn: Point[] | null; commission: Point[] | null; payouts: Point[] | null };
  monthly: { month: string; moneyIn: number | null; commission: number | null; payouts: number | null; refunds: number | null; storeSales: number | null }[];
}
export interface ContentStats {
  days: number;
  totals: { posts: number | null; reels: number | null; stories: number | null; communityPosts: number | null; storiesLive: number | null; likes: number | null; reelViews: number | null; avgLikesPerPost: number | null };
  series: { posts: Point[] | null; reels: Point[] | null; stories: Point[] | null; communityPosts: Point[] | null };
  topPosters: RankedPerson[] | null;
  reviews: { period: { rating: number; count: number }[] | null; allTime: { rating: number; count: number }[] | null };
}
export interface GrowthStats {
  days: number;
  funnel: { key: string; label: string; count: number; of?: number }[];
  cameBack: number;
  byRole: { role: string; count: number }[] | null;
  byMethod: { method: string; count: number }[] | null;
  series: Point[] | null;
}

export const insightsApi = {
  leaderboards: (days: number) => apiClient.get<ApiEnvelope<Leaderboards>>('/admin/monitor/leaderboards', { params: { days } }).then((r) => r.data.data),
  finance: (days: number) => apiClient.get<ApiEnvelope<FinanceStats>>('/admin/monitor/finance', { params: { days } }).then((r) => r.data.data),
  content: (days: number) => apiClient.get<ApiEnvelope<ContentStats>>('/admin/monitor/content', { params: { days } }).then((r) => r.data.data),
  growth: (days: number) => apiClient.get<ApiEnvelope<GrowthStats>>('/admin/monitor/growth', { params: { days } }).then((r) => r.data.data),
};

// ---------------------------------------------------------------------------
// App feature switches (GET/PATCH /admin/monitor/features)
// ---------------------------------------------------------------------------
export interface AppFeatures {
  storeEnabled: boolean;
  updatedAt: string | null;
  updatedBy?: { name: string; email: string } | null;
}
export const featuresApi = {
  get: () => apiClient.get<ApiEnvelope<AppFeatures>>('/admin/monitor/features').then((r) => r.data.data),
  setStore: (storeEnabled: boolean) => apiClient.patch<ApiEnvelope<AppFeatures>>('/admin/monitor/features', { storeEnabled }).then((r) => r.data.data),
};
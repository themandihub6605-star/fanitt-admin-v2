import { apiClient } from './apiClient';
import type { ApiEnvelope } from '@/types/api';

// Backend: src/monitor/manage.controller.js (/api/admin/monitor/*).
// Every list is paged on the server: { items, total, page, pages, limit }.

export type Paged<T, S = undefined> = { items: T[]; total: number; page: number; pages: number; limit: number } & (S extends undefined ? object : { summary: S });

export type MiniUser = { _id: string; name: string; email?: string; avatarUrl?: string; role?: string; phone?: string };

// ---- Reviews
export interface ManagedReview {
  _id: string;
  fromUser: MiniUser | null;
  toUser: MiniUser | null;
  relatedModel: 'Session' | 'Campaign';
  rating: number;
  comment: string;
  subRatings?: Partial<Record<'communication' | 'qualityOfWork' | 'paymentExperience' | 'professionalism', number>>;
  isFlagged: boolean;
  isHidden: boolean;
  createdAt: string;
}
export type ReviewSummary = { visible: number; hidden: number; flagged: number; average: number | null; byRating: { rating: number; count: number }[] };

// ---- Stories
export interface ManagedStory {
  _id: string;
  author: MiniUser | null;
  authorRole: 'creator' | 'brand';
  media: { url: string; type: 'image' | 'video'; thumbnailUrl?: string; duration?: number };
  caption: string;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
}

// ---- Gifts
export interface GiftRow {
  _id: string;
  kind: 'gift' | 'donation' | 'fanbox';
  amount: number;
  message?: string;
  from: MiniUser | null;
  to: MiniUser | null;
  context?: string;
  createdAt: string;
}
export type GiftLeader = { user: MiniUser; amount: number; count: number };
export type GiftSummary = {
  gifts: { count: number | null; amount: number | null };
  donations: { count: number | null; amount: number | null };
  fanbox: { count: number | null; amount: number | null };
  topSenders: GiftLeader[];
  topReceivers: GiftLeader[];
};

// ---- Sessions & bookings
export interface ManagedSession {
  _id: string;
  title: string;
  type: string;
  price: number;
  scheduledAt: string;
  durationMinutes: number;
  maxParticipants?: number;
  isLive: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  coverImageUrl?: string;
  creator: { _id: string; slug?: string; user: MiniUser | null } | null;
  stats: { booked: number; cancelled: number; revenue: number };
}
export interface ManagedBooking {
  _id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  amountPaid: number;
  attended?: boolean;
  user: MiniUser | null;
  session?: { _id: string; title: string; scheduledAt: string; isCancelled: boolean; price: number; type: string; creator?: { user: MiniUser | null } | null } | null;
  transaction?: { amount: number; status: string; razorpayPaymentId?: string } | null;
  createdAt: string;
}
export type CancelResult = { session: { _id: string; title: string }; cancelledBookings: number; notified: number; toRefund: { bookingId: string; user: MiniUser | null; amount: number; razorpayPaymentId: string }[] };

// ---- Applications
export interface ManagedApplication {
  _id: string;
  status: 'pending' | 'accepted' | 'rejected';
  pitch: string;
  quotedAmount: number | null;
  portfolioLinks: string[];
  deliveryTimeline: string;
  rejectionReason?: string;
  feedback?: string;
  creator: { _id: string; slug?: string; followerCount?: number; user: MiniUser | null } | null;
  campaign: { _id: string; title: string; budget: number; status: string; brand?: { companyName?: string } | null } | null;
  createdAt: string;
  respondedAt?: string | null;
}

// ---- Wallets
export interface WalletRow extends MiniUser {
  walletBalance: number;
  walletFeeExempt?: number;
  createdAt: string;
  withdrawals: { pending: number; paid: number };
}

// ---- Community content
export interface CommunityContentRow {
  _id: string;
  kind: 'comments' | 'messages';
  text: string;
  author: MiniUser | null;
  community: { _id: string; name: string; slug: string } | null;
  post: string | null;
  likeCount: number;
  createdAt: string;
}
export interface MemberRow {
  _id: string;
  user: MiniUser | null;
  role: string;
  status: string;
  access: 'free' | 'paid';
  plan: string | null;
  paidUntil: string | null;
  createdAt: string;
}

// ---- Disputes
export interface DisputeHistoryRow {
  _id: string;
  reason: string;
  status: string;
  campaign?: { title: string; brand?: { companyName?: string } } | null;
  milestone?: { title: string; amount: number } | null;
  raisedBy?: MiniUser | null;
  resolution?: { outcome: string | null; creatorAmount: number | null; brandRefundAmount: number | null; adminNotes: string; resolvedBy?: { name: string } | null; resolvedAt: string | null };
  createdAt: string;
}

// ---- Legal
export interface LegalDoc {
  slug: string;
  title: string;
  text: string;
  updatedAt: string | null;
  size: number;
  missing?: boolean;
}

// ---- Users
export interface UserRow extends MiniUser {
  isSuspended?: boolean;
  authProvider?: string;
  lastLoginAt?: string | null;
  createdAt: string;
  walletBalance?: number;
  isEmailVerified?: boolean;
  verificationStatus: string | null;
  followerCount: number | null;
  slug: string | null;
  companyName: string | null;
}
export interface UserOverview {
  user: { _id: string; name: string; email: string; role: string; walletBalance: number; lastLoginAt: string | null; createdAt: string };
  profile: ({ kind: 'creator' | 'brand' } & Record<string, unknown>) | null;
  money: { earned: number | null; earnedCount: number | null; spent: number | null; spentCount: number | null; wallet: number; withdrawnPaid: number | null; withdrawPending: number | null; storeSoldAmount: number | null };
  content: { posts: number | null; reels: number | null; stories: number | null; sessionsHosted: number | null; communitiesOwned: number | null };
  activity: {
    bookingsMade: number | null;
    communitiesJoined: number | null;
    campaigns: number | null;
    applications: number | null;
    applicationsAccepted: number | null;
    storeBought: number | null;
    storeSold: number | null;
    shopBought: number | null;
    logins30d: number | null;
    failedLogins30d: number | null;
  };
  reviews: { received: number | null; given: number | null; average: number | null };
  recentTransactions: { _id: string; type: string; status: string; amount: number; netAmount?: number; createdAt: string; direction: 'in' | 'out' }[];
}

type Q = Record<string, string | number | boolean | undefined>;
const clean = (q: Q) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v !== undefined && v !== null));
const get = <T,>(url: string, q: Q = {}) => apiClient.get<ApiEnvelope<T>>(`/admin/monitor${url}`, { params: clean(q) }).then((r) => r.data.data);

export const manageApi = {
  reviews: (q: Q) => get<Paged<ManagedReview, ReviewSummary>>('/reviews', q),
  setReviewHidden: (id: string, hidden: boolean) => apiClient.patch<ApiEnvelope<ManagedReview>>(`/admin/monitor/reviews/${id}`, { hidden }).then((r) => r.data.data),

  stories: (q: Q) => get<Paged<ManagedStory, { live: number; last24h: number; liveViews: number | null }>>('/stories', q),
  deleteStory: (id: string) => apiClient.delete(`/admin/monitor/stories/${id}`).then((r) => r.data.data),

  gifts: (q: Q) => get<Paged<GiftRow, GiftSummary>>('/gifts', q),

  sessions: (q: Q) => get<Paged<ManagedSession, { upcoming: number; live: number; cancelled: number }>>('/sessions', q),
  sessionBookings: (id: string) => get<ManagedBooking[]>(`/sessions/${id}/bookings`),
  cancelSession: (id: string, reason: string) => apiClient.post<ApiEnvelope<CancelResult>>(`/admin/monitor/sessions/${id}/cancel`, { reason }).then((r) => r.data.data),
  bookings: (q: Q) => get<Paged<ManagedBooking, { confirmed: number; cancelled: number; paid: number | null }>>('/bookings', q),

  applications: (q: Q) => get<Paged<ManagedApplication, { pending: number; accepted: number; rejected: number }>>('/applications', q),

  wallets: (q: Q) => get<Paged<WalletRow, { totalBalance: number | null; holders: number; pendingWithdrawals: number | null }>>('/wallets', q),

  communityContent: (q: Q) => get<Paged<CommunityContentRow>>('/community-content', q),
  removeCommunityContent: (kind: 'comments' | 'messages', id: string) => apiClient.delete(`/admin/monitor/community-content/${kind}/${id}`).then((r) => r.data.data),
  communityMembers: (id: string, q: Q) =>
    get<Paged<MemberRow, { active: number; paid: number; earnings: number | null; posts: number | null }> & { community: { _id: string; name: string; slug: string; isPaid: boolean; memberCount: number; createdBy?: MiniUser } }>(`/communities/${id}/members`, q),

  disputeHistory: (q: Q) => get<Paged<DisputeHistoryRow>>('/disputes/history', q),

  legal: () => get<LegalDoc[]>('/legal'),
  saveLegal: (slug: string, text: string) => apiClient.put<ApiEnvelope<{ slug: string; updatedAt: string }>>(`/admin/monitor/legal/${slug}`, { text }).then((r) => r.data.data),

  users: (q: Q) => get<Paged<UserRow>>('/users', q),
  userOverview: (id: string) => get<UserOverview>(`/users/${id}/overview`),
};

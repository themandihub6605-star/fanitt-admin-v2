import { apiClient } from './apiClient';
import type { ApiEnvelope } from '@/types/api';
import type { ApiAgency } from '@/types/agency';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  createdAt: string;
}

export interface AdminPost {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likeCount: number;
  createdAt: string;
}

export interface UserDetail {
  user: AdminUser & { phone?: string; walletBalance?: number; referralCode?: string; lastLoginAt?: string };
  roleProfile: Record<string, unknown> | null;
  posts: AdminPost[];
  transactions: AdminTransaction[];
  reviews: { _id: string; rating: number; comment: string; createdAt: string; fromUser?: { name: string } }[];
  referredCount: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalCreators: number;
  totalBrands: number;
  totalSessions: number;
  totalCampaigns: number;
  totalRevenue: number;
  totalPlatformCommission: number;
  totalInEscrow: number;
  monthlyRevenue: { _id: { year: number; month: number }; total: number }[];
  activeSubscriptionsByPlan?: { _id: string; count: number }[];
}

export interface DisputedCampaign {
  _id: string;
  title: string;
  budget: number;
  status: string;
  brand: { companyName: string; user?: { name: string; email: string } };
  assignedCreator?: { user?: { name: string; email: string } } | null;
  createdAt: string;
}

export interface AdminWithdrawal {
  _id: string;
  amount: number;
  platformFeePercent: number;
  platformFee: number;
  netPayoutAmount: number;
  payoutMethod: 'upi' | 'bank';
  payoutDetails: string;
  status: 'initiated' | 'processing' | 'completed' | 'rejected';
  adminNote?: string;
  createdAt: string;
  user?: { name: string; email: string; role: string };
}

export interface SiteSettings {
  platformCommissionPercent: number;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  homepageBannerText: string;
  creatorEarlyAccessHours?: number;
}

export interface AdminCategory {
  _id: string;
  label: string;
  slug: string;
  icon: string;
  isActive: boolean;
}

export interface AdminSession {
  _id: string;
  title: string;
  scheduledAt: string;
  isCancelled: boolean;
  creator?: { user?: { name: string; email: string } };
}

export interface AdminCampaign {
  _id: string;
  title: string;
  budget: number;
  status: string;
  createdAt: string;
  brand?: { companyName: string; user?: { name: string; email: string } };
}

export interface AdminReview {
  _id: string;
  rating: number;
  comment: string;
  isFlagged: boolean;
  isHidden: boolean;
  createdAt: string;
  fromUser?: { name: string; email: string };
  toUser?: { name: string; email: string };
}

export interface AdminTransaction {
  _id: string;
  type: string;
  status: string;
  amount: number;
  platformCommission?: number;
  agencyCommission?: number;
  referralCommission?: number;
  netAmount?: number;
  from?: { name: string; email: string } | null;
  to?: { name: string; email: string } | null;
  createdAt: string;
}

// NEW — platform-wide milestone tracking
export interface AdminMilestone {
  _id: string;
  title: string;
  amount: number;
  status: 'pending' | 'funded' | 'submitted' | 'changes_requested' | 'disputed' | 'released';
  order: number;
  createdAt: string;
  campaign?: {
    _id: string;
    title: string;
    brand?: { companyName: string; user?: { name: string; email: string } };
  };
  creator?: {
    _id: string;
    slug: string;
    user?: { name: string; email: string };
  };
}

export interface PendingVerifications {
  pendingCreators: { _id: string; user: { name: string; email: string; avatarUrl?: string }; category?: { label: string }; bio?: string }[];
  pendingBrands: { _id: string; user: { name: string; email: string; avatarUrl?: string }; companyName: string; industry?: string }[];
}

export interface AdminSubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  appliesTo: 'creator' | 'brand';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  razorpayPlanId: string;
  proposalLimit: number | null;
  extraProposalCost: number;
  platformFeePercent: number;
  campaignAccessTier: 'lite_only' | 'all';
  hasEarlyAccess: boolean;
  campaignPostLimit: number | null;
  campaignVisibilityTier: 'lite' | 'exclusive';
  canSetApplicantLimit: boolean;
  isFeaturedListing: boolean;
  description: string;
  perks: string[];
  createdAt: string;
}

export interface AdminUserSubscription {
  _id: string;
  user: string;
  plan: AdminSubscriptionPlan;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  razorpaySubscriptionId: string;
  cancelAtPeriodEnd: boolean;
  proposalsUsedThisCycle: number;
  campaignsPostedThisCycle: number;
}

/** Admin-only endpoints — Agency approval, core moderation/analytics, and
 * subscription plan management (Creator Lite/Pro, Brand Lite/Pro/Elite). */
export const adminApi = {
  setAgencyPassword: (id: string, password: string) =>
    apiClient.patch<ApiEnvelope<{ email: string; password: string }>>(`/admin/agencies/${id}/set-password`, { password }).then((r) => r.data.data),

  createAgency: (payload: {
    agencyName: string;
    ownerName?: string;
    email: string;
    password: string;
    mobile?: string;
    city?: string;
    state?: string;
    commissionPercent?: number;
  }) =>
    apiClient
      .post<ApiEnvelope<{ user: { email: string }; agency: ApiAgency }>>('/admin/agencies', payload)
      .then((r) => r.data.data),

  listAgencies: (status?: 'unverified' | 'pending' | 'verified' | 'rejected') =>
    apiClient.get<ApiEnvelope<ApiAgency[]>>('/admin/agencies', { params: { status } }).then((r) => r.data.data),

  verifyAgency: (id: string, decision: 'verified' | 'rejected', rejectionReason?: string) =>
    apiClient.patch<ApiEnvelope<ApiAgency>>(`/admin/agencies/${id}/verify`, { decision, rejectionReason }).then((r) => r.data.data),

  getAnalytics: () => apiClient.get<ApiEnvelope<AdminAnalytics>>('/admin/analytics/overview').then((r) => r.data.data),

  listUsers: (params: { role?: string; search?: string; page?: number; limit?: number } = {}) =>
    apiClient
      .get<ApiEnvelope<{ users: AdminUser[]; total: number; page: number; pages: number }>>('/admin/users', { params })
      .then((r) => r.data.data),

  suspendUser: (id: string, reason?: string) =>
    apiClient.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data.data),

  reinstateUser: (id: string) => apiClient.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}/reinstate`).then((r) => r.data.data),

  listPendingVerifications: () =>
    apiClient.get<ApiEnvelope<PendingVerifications>>('/admin/verifications/pending').then((r) => r.data.data),

  verifyCreator: (id: string, decision: 'verified' | 'rejected') =>
    apiClient.patch(`/admin/verifications/creator/${id}`, { decision }).then((r) => r.data.data),

  verifyBrand: (id: string, decision: 'verified' | 'rejected') =>
    apiClient.patch(`/admin/verifications/brand/${id}`, { decision }).then((r) => r.data.data),

  listDisputedEscrows: () =>
    apiClient.get<ApiEnvelope<DisputedCampaign[]>>('/admin/disputes/escrow').then((r) => r.data.data),

  releaseEscrow: (campaignId: string) =>
    apiClient.post(`/admin/escrow/${campaignId}/release`).then((r) => r.data.data),

  refundEscrow: (campaignId: string) =>
    apiClient.post(`/admin/escrow/${campaignId}/refund`).then((r) => r.data.data),

   listAllTransactions: (params: { type?: string; status?: string; page?: number; limit?: number; startDate?: string; endDate?: string } = {}) =>
    apiClient
      .get<ApiEnvelope<{ transactions: AdminTransaction[]; total: number; page: number; pages: number }>>('/admin/transactions', { params })
      .then((r) => r.data.data),

  // NEW — platform-wide milestone tracking
  listMilestones: (params: { status?: string; page?: number; limit?: number } = {}) =>
    apiClient
      .get<
        ApiEnvelope<{
          milestones: AdminMilestone[];
          total: number;
          page: number;
          pages: number;
          countsByStatus: Record<string, number>;
        }>
      >('/admin/milestones', { params })
      .then((r) => r.data.data),

  listCategories: () => apiClient.get<ApiEnvelope<AdminCategory[]>>('/admin/categories').then((r) => r.data.data),

  createCategory: (payload: { label: string; icon: string }) =>
    apiClient.post<ApiEnvelope<AdminCategory>>('/admin/categories', payload).then((r) => r.data.data),

  updateCategory: (id: string, payload: Partial<{ label: string; icon: string; isActive: boolean }>) =>
    apiClient.patch<ApiEnvelope<AdminCategory>>(`/admin/categories/${id}`, payload).then((r) => r.data.data),

  deleteCategory: (id: string) => apiClient.delete(`/admin/categories/${id}`).then((r) => r.data.data),

  listAllSessions: () => apiClient.get<ApiEnvelope<AdminSession[]>>('/admin/sessions').then((r) => r.data.data),

  removeSession: (id: string) => apiClient.patch(`/admin/sessions/${id}/remove`).then((r) => r.data.data),

  listAllCampaigns: () => apiClient.get<ApiEnvelope<AdminCampaign[]>>('/admin/campaigns').then((r) => r.data.data),

  listAllReviews: (flaggedOnly?: boolean) =>
    apiClient.get<ApiEnvelope<AdminReview[]>>('/admin/reviews', { params: { flaggedOnly } }).then((r) => r.data.data),

  hideReview: (id: string) => apiClient.patch(`/admin/reviews/${id}/hide`).then((r) => r.data.data),

  listWithdrawals: (status?: string) =>
    apiClient.get<ApiEnvelope<AdminWithdrawal[]>>('/admin/withdrawals', { params: { status } }).then((r) => r.data.data),

  markWithdrawalProcessing: (id: string) =>
    apiClient.patch<ApiEnvelope<AdminWithdrawal>>(`/admin/withdrawals/${id}/processing`).then((r) => r.data.data),

  markWithdrawalPaid: (id: string) => apiClient.patch<ApiEnvelope<AdminWithdrawal>>(`/admin/withdrawals/${id}/paid`).then((r) => r.data.data),

  rejectWithdrawal: (id: string, reason?: string) =>
    apiClient.patch<ApiEnvelope<AdminWithdrawal>>(`/admin/withdrawals/${id}/reject`, { reason }).then((r) => r.data.data),

  getSiteSettings: () => apiClient.get<ApiEnvelope<SiteSettings>>('/admin/settings').then((r) => r.data.data),

  updateSiteSettings: (payload: Partial<SiteSettings>) =>
    apiClient.patch<ApiEnvelope<SiteSettings>>('/admin/settings', payload).then((r) => r.data.data),

  broadcastNotification: (payload: { title: string; message: string; role?: string }) =>
    apiClient.post<ApiEnvelope<{ sentTo: number }>>('/admin/notifications/broadcast', payload).then((r) => r.data.data),

  getUserDetail: (id: string) => apiClient.get<ApiEnvelope<UserDetail>>(`/admin/users/${id}`).then((r) => r.data.data),

  listAdmins: () => apiClient.get<ApiEnvelope<AdminUser[]>>('/admin/admins').then((r) => r.data.data),

  createAdmin: (payload: { name: string; email: string; password: string }) =>
    apiClient.post<ApiEnvelope<AdminUser>>('/admin/admins', payload).then((r) => r.data.data),

  changeMyPassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/users/me/password', { currentPassword, newPassword }),

  // --- Subscription plans (Creator Lite/Pro, Brand Lite/Pro/Elite) ---

  listSubscriptionPlans: (appliesTo?: 'creator' | 'brand') =>
    apiClient.get<ApiEnvelope<AdminSubscriptionPlan[]>>('/admin/subscription-plans', { params: { appliesTo } }).then((r) => r.data.data),

  createSubscriptionPlan: (payload: Partial<AdminSubscriptionPlan>) =>
    apiClient.post<ApiEnvelope<AdminSubscriptionPlan>>('/admin/subscription-plans', payload).then((r) => r.data.data),

  updateSubscriptionPlan: (id: string, payload: Partial<AdminSubscriptionPlan>) =>
    apiClient.patch<ApiEnvelope<AdminSubscriptionPlan>>(`/admin/subscription-plans/${id}`, payload).then((r) => r.data.data),

  deleteSubscriptionPlan: (id: string) =>
    apiClient.delete<ApiEnvelope<AdminSubscriptionPlan>>(`/admin/subscription-plans/${id}`).then((r) => r.data.data),

  getUserSubscription: (userId: string) =>
    apiClient.get<ApiEnvelope<AdminUserSubscription | null>>(`/admin/users/${userId}/subscription`).then((r) => r.data.data),

  setUserSubscription: (userId: string, payload: { planId: string; periodDays?: number }) =>
    apiClient.patch<ApiEnvelope<AdminUserSubscription>>(`/admin/users/${userId}/subscription`, payload).then((r) => r.data.data),
};
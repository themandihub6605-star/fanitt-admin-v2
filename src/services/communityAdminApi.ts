import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type CommunityPlanKey = 'monthly' | 'yearly' | 'lifetime';

export interface CommunityPlans {
  monthly?: { enabled: boolean; price: number };
  yearly?: { enabled: boolean; price: number };
  lifetime?: { enabled: boolean; price: number };
}

export interface AdminCommunity {
  _id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string;
  coverImageUrl: string;
  visibility: 'public' | 'private';
  postPermission: 'all' | 'moderators';
  chatEnabled: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  memberCount: number;
  discussionCount: number;
  pendingRequestCount: number;
  lastActivityAt?: string;
  createdAt: string;
  category?: { _id: string; label: string } | null;
  createdBy?: { _id: string; name: string; email?: string; avatarUrl?: string } | null;
  // Paid community
  isPaid?: boolean;
  plans?: CommunityPlans;
  paidSince?: string | null;
  paidStats?: { revenue: number; payments: number };
  paidMemberCount?: number;
}

export interface CommunitySettings {
  requireSubscription: boolean;
  paidCommunitiesEnabled: boolean;
}

export interface CommunityPayment {
  _id: string;
  communityId: string;
  title: string;
  plan: CommunityPlanKey | string;
  amount: number;
  feeAmount: number;
  creatorEarning: number;
  paidWith: 'razorpay' | 'wallet' | 'free';
  status: 'paid' | 'refunded';
  invoiceNumber: string;
  paidAt: string | null;
  refundedAt: string | null;
  buyer: { _id: string; name: string; email?: string; avatarUrl?: string } | null;
  owner: { _id: string; name: string; email?: string } | null;
  access: { status: string; plan: string | null; paidUntil: string | null } | null;
}

export interface CommunityPaymentTotals {
  gross: number;
  fees: number;
  net: number;
  payments: number;
  paidCommunities: number;
  activePaidMembers: number;
}

export const communityAdminApi = {
  list: (params: { search?: string; page?: number; limit?: number; type?: 'all' | 'paid' | 'free' }) =>
    apiClient
      .get<ApiEnvelope<{ communities: AdminCommunity[]; total: number; page: number; pages: number }>>('/communities/admin/all', {
        params: { ...params, type: params.type === 'all' ? undefined : params.type },
      })
      .then((r) => r.data.data),

  update: (id: string, payload: { isVerified?: boolean; isFeatured?: boolean; isPaid?: boolean }) =>
    apiClient.patch<ApiEnvelope<AdminCommunity>>(`/communities/admin/${id}`, payload).then((r) => r.data.data),

  remove: (id: string) => apiClient.delete(`/communities/admin/${id}`),

  settings: () => apiClient.get<ApiEnvelope<CommunitySettings>>('/communities/admin/settings').then((r) => r.data.data),

  updateSettings: (payload: Partial<CommunitySettings>) =>
    apiClient.patch<ApiEnvelope<CommunitySettings>>('/communities/admin/settings', payload).then((r) => r.data.data),

  payments: (params: { page?: number; search?: string; status?: 'all' | 'paid' | 'refunded'; community?: string }) =>
    apiClient
      .get<ApiEnvelope<{ payments: CommunityPayment[]; total: number; page: number; pages: number; totals: CommunityPaymentTotals }>>(
        '/communities/admin/payments',
        { params: { ...params, status: params.status === 'all' ? undefined : params.status } }
      )
      .then((r) => r.data.data),
};
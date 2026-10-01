import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';

interface PersonLite {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AdminCampaignRow {
  _id: string;
  title: string;
  description: string;
  campaignType: 'paid' | 'barter';
  status: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  budget: number;
  costPerInfluencer: number;
  maxInfluencers: number;
  applicantCount: number;
  campaignImageUrl: string;
  location: string;
  durationLabel?: string;
  createdAt: string;
  publishedAt?: string | null;
  submittedForReviewAt?: string | null;
  reviewedAt?: string | null;
  isEscrowFunded?: boolean;
  category?: { _id: string; label: string } | null;
  brand?: { _id: string; companyName: string; logoUrl?: string; slug?: string; user?: PersonLite } | null;
  assignedCreator?: { _id: string; slug?: string; user?: PersonLite } | null;
}

export interface AdminCampaignDetail extends AdminCampaignRow {
  deliverables?: { reel: number; story: number; post: number };
  influencerCategories?: string[];
  genderTarget?: string[];
  ageRange?: { min: number; max: number };
  minFollowers?: number | null;
  creatorRequirement?: string;
  dos?: string[];
  donts?: string[];
  sampleMedia?: string[];
  products?: { _id: string; name: string; quantity: number; price: number; imageUrl?: string }[];
  milestoneCount?: number;
  reviewedBy?: PersonLite | null;
}

export interface AdminApplication {
  _id: string;
  status: 'pending' | 'accepted' | 'rejected';
  quotedAmount?: number | null;
  pitch?: string;
  deliveryTimeline?: string;
  portfolioLinks?: string[];
  rejectionReason?: string;
  createdAt: string;
  creator?: { _id: string; slug?: string; followerCount?: number; user?: PersonLite } | null;
}

export interface AdminMilestone {
  _id: string;
  title: string;
  order: number;
  amount: number;
  status: string;
  fundedAt?: string | null;
  submittedAt?: string | null;
}

export interface AdminTransaction {
  _id: string;
  type: string;
  status: string;
  amount: number;
  platformCommission?: number;
  netAmount?: number;
  createdAt: string;
  from?: PersonLite | null;
  to?: PersonLite | null;
}

export interface CampaignDetailsResponse {
  campaign: AdminCampaignDetail;
  applications: AdminApplication[];
  milestones: AdminMilestone[];
  transactions: AdminTransaction[];
  summary: {
    applicants: number;
    pending: number;
    accepted: number;
    rejected: number;
    lowestQuote: number | null;
    highestQuote: number | null;
    milestoneTotal: number;
    fundedTotal: number;
    releasedTotal: number;
  };
}

export interface CampaignRules {
  minCampaignBudget: number;
  requireCampaignApproval: boolean;
}

export const campaignAdminApi = {
  list: (params: { approval?: ApprovalFilter; search?: string; page?: number }) =>
    apiClient
      .get<ApiEnvelope<{ campaigns: AdminCampaignRow[]; total: number; page: number; pages: number; pendingCount: number }>>(
        '/admin/campaigns/all',
        { params: { ...params, approval: params.approval === 'all' ? undefined : params.approval } }
      )
      .then((r) => r.data.data),

  details: (id: string) => apiClient.get<ApiEnvelope<CampaignDetailsResponse>>(`/admin/campaigns/${id}/details`).then((r) => r.data.data),

  approve: (id: string) => apiClient.patch<ApiEnvelope<AdminCampaignRow>>(`/admin/campaigns/${id}/approve`).then((r) => r.data.data),

  reject: (id: string, reason: string) =>
    apiClient.patch<ApiEnvelope<AdminCampaignRow>>(`/admin/campaigns/${id}/reject`, { reason }).then((r) => r.data.data),

  unpublish: (id: string, reason: string) =>
    apiClient.patch<ApiEnvelope<AdminCampaignRow>>(`/admin/campaigns/${id}/unpublish`, { reason }).then((r) => r.data.data),

  getRules: () => apiClient.get<ApiEnvelope<CampaignRules>>('/admin/campaigns/rules').then((r) => r.data.data),

  updateRules: (rules: Partial<CampaignRules>) =>
    apiClient.patch<ApiEnvelope<CampaignRules>>('/admin/campaigns/rules', rules).then((r) => r.data.data),
};
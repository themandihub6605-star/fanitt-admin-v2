import { apiClient } from './apiClient';
import type { ApiEnvelope } from '@/types/api';

export interface ReferralConfig {
  agentToAgentPercent: number;
  agentToBrandOrCreatorPercent: number;
  creatorToCreatorPercent: number;
  creatorToBrandPercent: number;
}

export interface ReferredUser {
  _id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface MyReferralsData {
  referralCode: string;
  referredUsers: ReferredUser[];
  totalEarned: number; // paise
  recentCommissions: {
    _id: string;
    amount: number;
    referralCommission: number;
    createdAt: string;
    from?: { name: string };
  }[];
}

export const referralApi = {
  // User-facing — my own code, who I've referred, what I've earned
  getMyReferrals: () => apiClient.get<ApiEnvelope<MyReferralsData>>('/users/me/referrals').then((r) => r.data.data),

  // Admin-only — the 4-tier commission configuration
  getConfig: () => apiClient.get<ApiEnvelope<ReferralConfig>>('/admin/referral-config').then((r) => r.data.data),
  updateConfig: (payload: Partial<ReferralConfig>) =>
    apiClient.patch<ApiEnvelope<ReferralConfig>>('/admin/referral-config', payload).then((r) => r.data.data),
};

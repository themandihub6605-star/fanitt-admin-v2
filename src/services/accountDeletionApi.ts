import { apiClient } from '@/services/apiClient';

// Account deletion requests — backend: src/controllers/accountDeletion.controller.js
// (mounted at /api/admin/account-deletions).

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type DeletionTab = 'pending' | 'approved';

export interface DeletionRequest {
  _id: string;
  name: string;
  email: string;
  deletedEmail?: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  roles?: string[];
  authProvider?: 'local' | 'google';
  walletBalance?: number;
  createdAt: string;
  lastLoginAt?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  deletionRequestedAt?: string | null;
  deletionReviewedAt?: string | null;
  deletionReason?: string;
  deletionNote?: string;
}

export interface DeletionList {
  requests: DeletionRequest[];
  total: number;
  page: number;
  pages: number;
  counts: { pending: number; approved: number };
}

const base = '/admin/account-deletions';

export const accountDeletionApi = {
  list: (params: { status: DeletionTab; search?: string; page?: number }) =>
    apiClient.get<Envelope<DeletionList>>(base, { params }).then((r) => r.data.data),
  approve: (id: string, note = '') => apiClient.patch<Envelope<unknown>>(`${base}/${id}/approve`, { note }).then((r) => r.data),
  reject: (id: string, note = '') => apiClient.patch<Envelope<unknown>>(`${base}/${id}/reject`, { note }).then((r) => r.data),
};
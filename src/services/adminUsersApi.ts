import { apiClient } from './apiClient';
import type { ApiEnvelope } from '@/types/api';

export type ProfileStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ProfileSummary {
  profileId: string | null;
  status: ProfileStatus;
  rejectionReason: string;
  /** Required fields still empty, e.g. ["Phone", "Bio"]. */
  missing: string[];
  percent: number;
}

export interface UserRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  isEmailVerified?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  lastLoginAt?: string;
  createdAt: string;
  /** null for fans and admins — they have no reviewed profile. */
  profileSummary: ProfileSummary | null;
}

export interface UserStats {
  total: number;
  newToday: number;
  new7d: number;
  new30d: number;
  activeToday: number;
  suspended: number;
  google: number;
  email: number;
  byRole: Record<string, number>;
  incompleteProfiles: number;
  pendingReview: number;
  changesRequested: number;
  notSubmitted: number;
}

export interface UserListParams {
  role?: string;
  search?: string;
  profile?: 'incomplete' | ProfileStatus;
  joined?: 'today' | '7d' | '30d';
  provider?: 'google' | 'local';
  page?: number;
  limit?: number;
}

export const adminUsersApi = {
  list: (params: UserListParams = {}) =>
    apiClient
      .get<ApiEnvelope<{ users: UserRow[]; total: number; page: number; pages: number }>>('/admin/users', { params })
      .then((r) => r.data.data),

  stats: () => apiClient.get<ApiEnvelope<UserStats>>('/admin/users/stats').then((r) => r.data.data),

  /** Locks the profile into "changes needed" with the note until the user resubmits. */
  requestUpdate: (id: string, note?: string) =>
    apiClient.post<ApiEnvelope<UserRow>>(`/admin/users/${id}/request-profile-update`, { note }).then((r) => r.data.data),

  requestUpdateBulk: (body: { userIds?: string[]; allIncomplete?: boolean; role?: string; note?: string }) =>
    apiClient
      .post<ApiEnvelope<{ requested: number; updated: number; skipped: number }>>('/admin/users/request-profile-update', body)
      .then((r) => r.data.data),

  suspend: (id: string, reason?: string) => apiClient.patch<ApiEnvelope<UserRow>>(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data.data),

  reinstate: (id: string) => apiClient.patch<ApiEnvelope<UserRow>>(`/admin/users/${id}/reinstate`).then((r) => r.data.data),
};
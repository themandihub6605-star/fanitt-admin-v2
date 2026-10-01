import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
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
}

export const communityAdminApi = {
  list: (params: { search?: string; page?: number; limit?: number }) =>
    apiClient
      .get<ApiEnvelope<{ communities: AdminCommunity[]; total: number; page: number; pages: number }>>('/communities/admin/all', { params })
      .then((r) => r.data.data),

  update: (id: string, payload: { isVerified?: boolean; isFeatured?: boolean }) =>
    apiClient.patch<ApiEnvelope<AdminCommunity>>(`/communities/admin/${id}`, payload).then((r) => r.data.data),

  remove: (id: string) => apiClient.delete(`/communities/admin/${id}`),
};
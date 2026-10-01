import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AdminPostType = 'feed' | 'community';

export interface AdminPost {
  _id: string;
  type: AdminPostType;
  text: string;
  media: { url: string; type: 'image' | 'video' }[];
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  isAnnouncement: boolean;
  hasPoll?: boolean;
  createdAt: string;
  updatedAt: string;
  author: { _id: string; name: string; email?: string; avatarUrl?: string; role?: string } | null;
  creatorSlug?: string | null;
  community: { _id: string; name: string; slug: string } | null;
}

export interface AdminPostUpdate {
  text?: string;
  removeMediaUrls?: string[];
  isPinned?: boolean;
  isAnnouncement?: boolean;
}

export const postAdminApi = {
  list: (params: { type: AdminPostType; search?: string; page?: number; limit?: number }) =>
    apiClient
      .get<ApiEnvelope<{ posts: AdminPost[]; total: number; page: number; pages: number }>>('/admin/posts', { params })
      .then((r) => r.data.data),

  update: (type: AdminPostType, id: string, payload: AdminPostUpdate) =>
    apiClient.patch<ApiEnvelope<AdminPost>>(`/admin/posts/${type}/${id}`, payload).then((r) => r.data.data),

  remove: (type: AdminPostType, id: string) => apiClient.delete(`/admin/posts/${type}/${id}`),
};
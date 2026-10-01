import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AudienceRole = 'fan' | 'creator' | 'brand' | 'agency';
export type BroadcastStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface Broadcast {
  _id: string;
  title: string;
  message: string;
  imageUrl: string;
  link: string;
  roles: AudienceRole[];
  testEmail: string;
  status: BroadcastStatus;
  scheduledAt: string;
  sentAt: string | null;
  error: string;
  stats: { targeted: number; inApp: number; devices: number; pushSent: number; pushFailed: number };
  createdBy?: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface NewBroadcast {
  title: string;
  message: string;
  roles: AudienceRole[];
  testEmail?: string;
  link?: string;
  imageUrl?: string;
  image?: File | null;
  scheduledAt?: string | null;
}

export const notificationAdminApi = {
  send: (payload: NewBroadcast) => {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('message', payload.message);
    form.append('roles', JSON.stringify(payload.roles));
    if (payload.testEmail) form.append('testEmail', payload.testEmail);
    if (payload.link) form.append('link', payload.link);
    if (payload.image) form.append('image', payload.image);
    else if (payload.imageUrl) form.append('imageUrl', payload.imageUrl);
    if (payload.scheduledAt) form.append('scheduledAt', payload.scheduledAt);
    return apiClient
      .post<ApiEnvelope<{ broadcast: Broadcast; sentTo: number }>>('/admin/notifications/broadcast', form)
      .then((r) => r.data);
  },

  audience: (roles: AudienceRole[], testEmail?: string) =>
    apiClient
      .get<ApiEnvelope<{ count: number }>>('/admin/notifications/audience', {
        params: { roles: roles.join(','), testEmail: testEmail || undefined },
      })
      .then((r) => r.data.data.count),

  list: (params: { status?: BroadcastStatus; page?: number }) =>
    apiClient
      .get<ApiEnvelope<{ broadcasts: Broadcast[]; total: number; page: number; pages: number }>>('/admin/notifications/broadcasts', { params })
      .then((r) => r.data.data),

  cancel: (id: string) => apiClient.patch<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/cancel`).then((r) => r.data.data),

  sendNow: (id: string) => apiClient.post<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/send-now`).then((r) => r.data.data),

  reschedule: (id: string, scheduledAt: string) =>
    apiClient.patch<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/reschedule`, { scheduledAt }).then((r) => r.data.data),
};
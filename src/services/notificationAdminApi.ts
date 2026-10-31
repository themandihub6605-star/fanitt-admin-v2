import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AudienceRole = 'fan' | 'creator' | 'brand' | 'agency';
export type BroadcastStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export type PlanFilter = 'any' | 'free' | 'paid' | 'expiring' | 'plans';
export type VerificationFilter = 'any' | 'verified' | 'unverified' | 'pending' | 'rejected';
export type YesNo = 'any' | 'yes' | 'no';

/** Extra audience filters on top of roles. 'any' / null = not used. */
export interface AudienceFilters {
  plan: PlanFilter;
  planIds: string[];
  verification: VerificationFilter;
  onboarded: YesNo;
  emailVerified: YesNo;
  loginWithinDays: number | null;
  inactiveDays: number | null;
  joinedWithinDays: number | null;
  appOnly: boolean;
}

export const EMPTY_FILTERS: AudienceFilters = {
  plan: 'any',
  planIds: [],
  verification: 'any',
  onboarded: 'any',
  emailVerified: 'any',
  loginWithinDays: null,
  inactiveDays: null,
  joinedWithinDays: null,
  appOnly: false,
};

export interface AudiencePlan {
  _id: string;
  name: string;
  slug: string;
  appliesTo: 'creator' | 'brand';
  price: number; // paise, 0 = free
  billingCycle: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface AudienceCount {
  count: number;
  byRole: Partial<Record<AudienceRole, number>>;
}

export interface Broadcast {
  _id: string;
  title: string;
  message: string;
  imageUrl: string;
  link: string;
  roles: AudienceRole[];
  testEmail: string;
  filters?: Partial<AudienceFilters> | null;
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
  filters?: AudienceFilters;
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
    if (payload.filters && !payload.testEmail) form.append('filters', JSON.stringify(payload.filters));
    if (payload.testEmail) form.append('testEmail', payload.testEmail);
    if (payload.link) form.append('link', payload.link);
    if (payload.image) form.append('image', payload.image);
    else if (payload.imageUrl) form.append('imageUrl', payload.imageUrl);
    if (payload.scheduledAt) form.append('scheduledAt', payload.scheduledAt);
    return apiClient
      .post<ApiEnvelope<{ broadcast: Broadcast; sentTo: number }>>('/admin/notifications/broadcast', form)
      .then((r) => r.data);
  },

  audience: (roles: AudienceRole[], filters: AudienceFilters, testEmail?: string) =>
    apiClient
      .get<ApiEnvelope<AudienceCount>>('/admin/notifications/audience', {
        params: {
          roles: roles.join(','),
          filters: testEmail ? undefined : JSON.stringify(filters),
          testEmail: testEmail || undefined,
        },
      })
      .then((r) => ({ count: r.data.data.count, byRole: r.data.data.byRole || {} })),

  /** Creator + brand subscription plans, for the "Specific plans" filter. */
  plans: () => apiClient.get<ApiEnvelope<AudiencePlan[]>>('/admin/subscription-plans').then((r) => r.data.data || []),

  list: (params: { status?: BroadcastStatus; page?: number }) =>
    apiClient
      .get<ApiEnvelope<{ broadcasts: Broadcast[]; total: number; page: number; pages: number }>>('/admin/notifications/broadcasts', { params })
      .then((r) => r.data.data),

  cancel: (id: string) => apiClient.patch<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/cancel`).then((r) => r.data.data),

  sendNow: (id: string) => apiClient.post<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/send-now`).then((r) => r.data.data),

  reschedule: (id: string, scheduledAt: string) =>
    apiClient.patch<ApiEnvelope<Broadcast>>(`/admin/notifications/broadcasts/${id}/reschedule`, { scheduledAt }).then((r) => r.data.data),
};
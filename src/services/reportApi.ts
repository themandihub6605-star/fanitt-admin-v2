// File: src/services/reportApi.ts
import { apiClient } from '@/services/apiClient';

// Reported content — backend: src/controllers/report.controller.js
// (mounted at /api/reports/admin).

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type ReportStatus = 'pending' | 'removed' | 'suspended' | 'dismissed' | 'all';
export type ReportTargetType = 'post' | 'story' | 'user' | 'community' | 'community_post' | 'community_comment' | 'community_message' | 'message';
export type ReportAction = 'dismiss' | 'remove' | 'suspend';

export interface ReportPerson {
  _id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  isSuspended?: boolean;
}

export interface Report {
  _id: string;
  reporter: ReportPerson | null;
  targetType: ReportTargetType;
  targetId: string;
  targetOwner: ReportPerson | null;
  reason: string;
  reasonLabel: string;
  details?: string;
  snapshot?: { text?: string; mediaUrl?: string; ownerName?: string };
  status: Exclude<ReportStatus, 'all'>;
  reviewedBy?: { _id: string; name?: string } | null;
  reviewedAt?: string | null;
  adminNote?: string;
  createdAt: string;
  reportsOnItem: number;
}

export interface ReportList {
  items: Report[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  counts: Record<Exclude<ReportStatus, 'all'>, number>;
}

const base = '/reports/admin';

export const reportApi = {
  list: (params: { status: ReportStatus; type?: ReportTargetType | ''; page?: number }) =>
    apiClient.get<Envelope<ReportList>>(base, { params: { ...params, type: params.type || undefined } }).then((r) => r.data.data),
  resolve: (id: string, action: ReportAction, note = '') =>
    apiClient.patch<Envelope<{ id: string; status: string }>>(`${base}/${id}`, { action, note }).then((r) => r.data),
};
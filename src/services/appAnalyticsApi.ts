import { apiClient } from '@/services/apiClient';

// App screen analytics — backend: src/controllers/appAnalytics.controller.js
// (GET /api/analytics/admin/screens). Times are in milliseconds.

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AnalyticsRole = 'all' | 'creator' | 'brand' | 'fan' | 'agency' | 'guest';

export interface ScreenStat {
  screen: string;
  views: number;
  visitors: number;
  totalMs: number;
  avgMs: number;
  sharePct: number;
}

export interface ScreenReport {
  range: { days: number; since: string; role: string | null };
  totals: {
    views: number;
    totalMs: number;
    visitors: number;
    sessions: number;
    activeToday: number;
    avgSessionMs: number;
    screensPerSession: number;
  };
  screens: ScreenStat[];
  daily: { date: string; views: number; totalMs: number; visitors: number; sessions: number }[];
  hours: { hour: number; views: number }[];
  roles: { role: string; totalMs: number; visitors: number; sharePct: number }[];
  exits: { screen: string; sessions: number; bounces: number; sharePct: number }[];
}

export const appAnalyticsApi = {
  screens: async (days: number, role: AnalyticsRole) =>
    (await apiClient.get<Envelope<ScreenReport>>('/analytics/admin/screens', { params: { days, ...(role === 'all' ? {} : { role }) } })).data.data,
};
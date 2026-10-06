import { apiClient } from '@/services/apiClient';

// Admin client for Live Sessions (Virtual Meets) —
// backend: src/FanittStore/controllers/adminMeet.controller.js (/api/store/admin/meets).
// Money values are in paise.

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type MeetStatus = 'live' | 'upcoming' | 'late' | 'missed' | 'completed' | 'cancelled';
export type MeetFilter = 'live' | 'upcoming' | 'past' | 'cancelled' | 'all';
export type JoinMode = 'silent' | 'speak';

export interface MeetRow {
  _id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  type: 'free' | 'paid' | string;
  price: number;
  scheduledAt: string;
  endsAt: string;
  durationMinutes: number;
  maxParticipants: number;
  bookedCount: number;
  status: MeetStatus;
  host: { _id: string | null; name: string; email: string; avatarUrl: string; slug: string };
  createdAt: string;
}

export interface MeetPage {
  items: MeetRow[];
  total: number;
  page: number;
  pages: number;
  liveNow: number;
}

export interface RoomParticipant {
  identity: string;
  name: string;
  role: 'host' | 'guest' | 'admin' | string;
  joinedAt: string | null;
  hidden: boolean;
  audioOn: boolean;
  videoOn: boolean;
}

export interface MeetBooking {
  _id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string;
  amountPaid: number;
  joinedAt: string | null;
  createdAt: string;
  user: { _id: string; name: string; email: string; avatarUrl: string; phone: string } | null;
}

export interface MeetDetail {
  meet: MeetRow;
  stats: { booked: number; pending: number; revenue: number; inRoom: number };
  bookings: MeetBooking[];
  participants: RoomParticipant[];
}

export interface MeetConnection {
  meet: MeetRow;
  connection: { url: string; token: string; roomName: string };
  mode: JoinMode;
}

const base = '/store/admin/meets';

function clean(query: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));
}

export const meetAdminApi = {
  list: async (q: { page: number; status: MeetFilter; search?: string }): Promise<MeetPage> => {
    const res = await apiClient.get<Envelope<{ meets: MeetRow[]; total: number; page: number; pages: number; liveNow: number }>>(base, { params: clean(q) });
    const d = res.data.data;
    return { items: d.meets || [], total: d.total || 0, page: d.page || 1, pages: Math.max(1, d.pages || 1), liveNow: d.liveNow || 0 };
  },
  detail: async (id: string) => (await apiClient.get<Envelope<MeetDetail>>(`${base}/${id}`)).data.data,
  participants: async (id: string) => (await apiClient.get<Envelope<RoomParticipant[]>>(`${base}/${id}/participants`)).data.data,
  join: async (id: string, mode: JoinMode) => (await apiClient.post<Envelope<MeetConnection>>(`${base}/${id}/join`, { mode })).data.data,
  removeParticipant: (id: string, identity: string) => apiClient.post(`${base}/${id}/participants/${encodeURIComponent(identity)}/remove`),
  end: (id: string, reason: string) => apiClient.post(`${base}/${id}/end`, { reason }),
  cancel: (id: string, reason: string) => apiClient.post(`${base}/${id}/cancel`, { reason }),
};
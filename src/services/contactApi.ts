// File: src/services/contactApi.ts  (fanitt-admin)
import { apiClient } from '@/services/apiClient';

// Website contact form messages — backend: src/controllers/contact.controller.js
// (mounted at /api/admin/contact-messages).

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type ContactStatus = 'new' | 'read' | 'replied' | 'archived';
export type ContactTab = ContactStatus | 'all';

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Creator' | 'Brand' | 'Fan' | 'Agency' | 'Other';
  message: string;
  status: ContactStatus;
  note?: string;
  createdAt: string;
}

export interface ContactList {
  messages: ContactMessage[];
  total: number;
  page: number;
  pages: number;
  counts: Record<ContactStatus, number>;
}

const base = '/admin/contact-messages';

export const contactApi = {
  list: (params: { status: ContactTab; search?: string; page?: number }) =>
    apiClient.get<Envelope<ContactList>>(base, { params }).then((r) => r.data.data),
  update: (id: string, body: { status?: ContactStatus; note?: string }) =>
    apiClient.patch<Envelope<ContactMessage>>(`${base}/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete<Envelope<null>>(`${base}/${id}`).then((r) => r.data),
};
import { apiClient } from '@/services/apiClient';

// Admin: the app home's discover sections — order, titles, show/hide and
// items pinned first in each (backend: /api/admin/home-layout).

export type SectionKey = 'live' | 'creators' | 'campaigns' | 'meets' | 'brands' | 'communities' | 'products' | 'stores';

export interface PinItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface HomeSection {
  key: SectionKey;
  title: string;
  subtitle: string;
  enabled: boolean;
  canPin: boolean;
  pinned: PinItem[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const homeLayoutApi = {
  get: () =>
    apiClient
      .get<Envelope<{ sections: HomeSection[]; defaults: { key: SectionKey; title: string; subtitle: string }[] }>>('/admin/home-layout')
      .then((r) => r.data.data),
  save: (sections: HomeSection[]) =>
    apiClient.put('/admin/home-layout', {
      sections: sections.map((s) => ({ key: s.key, title: s.title, subtitle: s.subtitle, enabled: s.enabled, pinned: s.pinned.map((p) => p.id) })),
    }),
  search: (type: SectionKey, q: string) =>
    apiClient.get<Envelope<PinItem[]>>('/admin/home-layout/search', { params: { type, q } }).then((r) => r.data.data),
};
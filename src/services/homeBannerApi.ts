import { apiClient } from '@/services/apiClient';

// Home slider banners — backend: src/controllers/homeBanner.controller.js
// (routes in src/routes/home.routes.js, under /api/home/admin/banners).

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type BannerLinkType = 'none' | 'screen' | 'url' | 'campaign' | 'creator' | 'brand' | 'community' | 'store' | 'product' | 'live' | 'meet';
export type BannerPlatform = 'all' | 'app' | 'web';
export type BannerAudience = 'creator' | 'brand' | 'fan' | 'agency';

export interface HomeBanner {
  _id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  linkType: BannerLinkType;
  linkValue: string;
  platform: BannerPlatform;
  audience: BannerAudience[];
  isActive: boolean;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  views: number;
  clicks: number;
  createdAt: string;
}

export interface BannerInput {
  title: string;
  subtitle: string;
  ctaLabel: string;
  linkType: BannerLinkType;
  linkValue: string;
  platform: BannerPlatform;
  audience: BannerAudience[];
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const base = '/home/admin/banners';

function toForm(input: Partial<BannerInput>, image?: File | null) {
  const form = new FormData();
  Object.entries(input).forEach(([k, v]) => {
    if (v === undefined) return;
    form.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
  });
  if (image) form.append('image', image);
  return form;
}

export const homeBannerApi = {
  list: () => apiClient.get<Envelope<{ banners: HomeBanner[] }>>(base).then((r) => r.data.data.banners),
  create: (input: BannerInput, image: File) =>
    apiClient.post<Envelope<HomeBanner>>(base, toForm(input, image)).then((r) => r.data.data),
  update: (id: string, input: Partial<BannerInput>, image?: File | null) =>
    apiClient.patch<Envelope<HomeBanner>>(`${base}/${id}`, toForm(input, image)).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete<Envelope<null>>(`${base}/${id}`).then((r) => r.data),
  reorder: (ids: string[]) => apiClient.put<Envelope<{ banners: HomeBanner[] }>>(`${base}/order`, { ids }).then((r) => r.data.data.banners),
};
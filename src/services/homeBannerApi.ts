// File: src/services/homeBannerApi.ts
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

export interface BannerImage {
  url: string;
  replacedAt: string;
}

export interface HomeBanner {
  _id: string;
  imageUrl: string;
  imageHistory: BannerImage[];
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
  /** Festival / special — replaces the regular banners while live. */
  takeover: boolean;
  /** Archived ("deleted") — hidden, can be restored. */
  archivedAt: string | null;
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
  takeover: boolean;
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

/** Older banners saved before these fields existed. */
function normalize(b: HomeBanner): HomeBanner {
  return { ...b, imageHistory: b.imageHistory ?? [], takeover: b.takeover ?? false, archivedAt: b.archivedAt ?? null };
}

export const homeBannerApi = {
  list: () => apiClient.get<Envelope<{ banners: HomeBanner[] }>>(base).then((r) => r.data.data.banners.map(normalize)),
  create: (input: BannerInput, image: File) => apiClient.post<Envelope<HomeBanner>>(base, toForm(input, image)).then((r) => normalize(r.data.data)),
  update: (id: string, input: Partial<BannerInput>, image?: File | null) =>
    apiClient.patch<Envelope<HomeBanner>>(`${base}/${id}`, toForm(input, image)).then((r) => normalize(r.data.data)),
  /** Puts an earlier picture back (the current one goes into the history). */
  useOldImage: (id: string, url: string) => apiClient.post<Envelope<HomeBanner>>(`${base}/${id}/image`, { url }).then((r) => normalize(r.data.data)),
  /** First call archives; with permanent on an archived banner, deletes for good. */
  archive: (id: string) => apiClient.delete<Envelope<HomeBanner>>(`${base}/${id}`).then((r) => normalize(r.data.data)),
  deleteForever: (id: string) => apiClient.delete<Envelope<null>>(`${base}/${id}`, { params: { permanent: 1 } }).then((r) => r.data),
  restore: (id: string) => apiClient.post<Envelope<HomeBanner>>(`${base}/${id}/restore`).then((r) => normalize(r.data.data)),
  reorder: (ids: string[]) => apiClient.put<Envelope<{ banners: HomeBanner[] }>>(`${base}/order`, { ids }).then((r) => r.data.data.banners.map(normalize)),
};
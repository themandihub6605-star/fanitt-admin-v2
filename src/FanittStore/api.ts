import { apiClient } from '@/services/apiClient';

// Typed client for /api/store/admin/* (backend: src/FanittStore/routes/admin.routes.js).
// All money values are in paise.

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Paged<T> {
  total: number;
  page: number;
  pages: number;
  items: T[];
}

export interface PersonLite {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export type StoreStatus = 'draft' | 'pending_review' | 'active' | 'rejected' | 'suspended';
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface StoreRow {
  _id: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
  status: StoreStatus;
  statusReason: string;
  kycStatus: KycStatus;
  hasPayout: boolean;
  isOpen: boolean;
  submittedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  stats: { views: number; orders: number; grossSales: number; feesPaid: number; netEarnings: number; refunds: number };
  user: PersonLite;
}

export interface StoreDetail {
  store: StoreRow & { about: string; bannerUrl: string; termsAcceptedAt: string | null; termsVersion: string };
  payout: {
    method: 'upi' | 'bank';
    upiId?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  } | null;
  kyc: {
    status: KycStatus;
    panNumber: string;
    panName: string;
    idType: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string;
    documents: { pan?: string; id?: string };
  } | null;
  products: ProductRow[];
  recentOrders: OrderRow[];
}

export type ProductStatus = 'draft' | 'published' | 'unpublished' | 'removed';

export interface ProductRow {
  _id: string;
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  price: number;
  status: ProductStatus;
  fileCount: number;
  totalSize: number;
  salesCount: number;
  revenue?: number;
  removedReason?: string;
  createdAt: string;
  owner?: PersonLite;
  store?: { _id: string; name: string; slug: string };
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type ItemType = 'digital_product' | 'live_stream' | 'call' | 'fanbox';

export interface OrderRow {
  _id: string;
  itemType: ItemType;
  itemTitle: string;
  itemCoverUrl: string;
  message?: string;
  amount: number;
  paidWith?: 'razorpay' | 'wallet' | 'free';
  settledAmount?: number | null;
  walletRefund?: number;
  feePercent: number;
  feeAmount: number;
  creatorEarning: number;
  status: OrderStatus;
  invoiceNumber: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string;
  createdAt: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  buyer?: PersonLite;
  seller?: PersonLite;
  store?: { _id: string; name: string; slug: string } | null;
}

export type LiveStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface LiveRow {
  _id: string;
  title: string;
  coverUrl: string;
  status: LiveStatus;
  visibility: 'public' | 'private';
  privateMode: 'invite' | 'community' | 'selected' | null;
  price: number;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedByAdmin: boolean;
  stats: { currentViewers: number; peakViewers: number; totalJoins: number; ticketsSold: number; revenue: number };
  host?: PersonLite;
  store?: { _id: string; name: string; slug: string };
  createdAt: string;
}

export type CallStatus = 'awaiting_payment' | 'requested' | 'active' | 'completed' | 'declined' | 'missed' | 'cancelled';

export interface CallRow {
  _id: string;
  type: 'audio' | 'video';
  status: CallStatus;
  ratePerMinute: number;
  prepaidMinutes: number;
  prepaidAmount: number;
  billedMinutes: number;
  billedAmount: number;
  refundedAmount: number;
  creatorEarning: number;
  note: string;
  endReason: string;
  requestedAt: string | null;
  connectedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  host?: PersonLite;
  caller?: PersonLite;
  store?: { _id: string; name: string; slug: string };
}

export type AffiliateStatus = 'active' | 'hidden' | 'removed';

export interface AffiliateRow {
  _id: string;
  title: string;
  imageUrl: string;
  price: number | null;
  merchant: string;
  category: string;
  url: string;
  status: AffiliateStatus;
  removedReason: string;
  clicks: number;
  lastClickedAt: string | null;
  createdAt: string;
  owner?: PersonLite;
  store?: { _id: string; name: string; slug: string };
}

export interface Overview {
  stores: Partial<Record<StoreStatus, number>>;
  pendingKyc: number;
  products: Partial<Record<ProductStatus, number>>;
  sales: { orders: number; gross: number; fees: number; creatorEarnings: number; refundedOrders: number; refundedAmount: number };
  lives: Partial<Record<LiveStatus, number>>;
  calls: { byStatus: Partial<Record<CallStatus, number>>; billedAmount: number; billedMinutes: number };
}

export interface SourceTotals {
  orders: number;
  gross: number;
  fees: number;
  net: number;
}

export interface PlatformAnalytics {
  range: { days: number; from: string; to: string };
  totals: SourceTotals & { sellers: number; affiliateClicks: number; callMinutes: number };
  bySource: Record<ItemType, SourceTotals>;
  daily: { date: string; gross: number; net: number; orders: number }[];
  topStores: { store: string; name: string; slug: string; logoUrl: string; orders: number; gross: number; fees: number }[];
}

export type ToolKey = 'virtual_meet' | 'stream_live' | 'chat_calls' | 'digital_products' | 'community' | 'affiliate' | 'fanbox';

export interface ToolCard {
  key: ToolKey;
  title: string;
  description: string;
  imageUrl: string;
  enabled: boolean;
  order: number;
}

export interface WebBanner {
  enabled: boolean;
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  playStoreUrl: string;
  appDeepLink: string;
}

export interface StoreSettings {
  storeFeePercent: number;
  fanboxFeePercent: number;
  termsVersion: string;
  termsText: string;
  toolCards: ToolCard[];
  webBanner: WebBanner;
  updatedAt: string;
}

type Query = Record<string, string | number | undefined>;

function clean(query: Query) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));
}

async function getData<T>(url: string, params?: Query) {
  const res = await apiClient.get<Envelope<T>>(url, { params: params ? clean(params) : undefined });
  return res.data.data;
}

async function paged<T>(url: string, key: string, params: Query): Promise<Paged<T>> {
  const data = await getData<Record<string, unknown>>(url, params);
  return { items: (data[key] as T[]) || [], total: Number(data.total || 0), page: Number(data.page || 1), pages: Math.max(1, Number(data.pages || 1)) };
}

function imageForm(file: File) {
  const form = new FormData();
  form.append('image', file);
  return form;
}

const base = '/store/admin';

export const storeAdminApi = {
  overview: () => getData<Overview>(`${base}/overview`),
  analytics: (days: number) => getData<PlatformAnalytics>(`${base}/analytics`, { days }),

  stores: (q: Query) => paged<StoreRow>(`${base}/stores`, 'stores', q),
  store: (id: string) => getData<StoreDetail>(`${base}/stores/${id}`),
  reviewKyc: (id: string, body: { decision: 'approve' } | { decision: 'reject'; reason: string }) =>
    apiClient.patch<Envelope<StoreRow>>(`${base}/stores/${id}/kyc`, body).then((r) => r.data),
  setStoreStatus: (id: string, body: { action: 'suspend'; reason: string } | { action: 'reinstate' }) =>
    apiClient.patch<Envelope<StoreRow>>(`${base}/stores/${id}/status`, body).then((r) => r.data),

  products: (q: Query) => paged<ProductRow>(`${base}/products`, 'products', q),
  removeProduct: (id: string, reason: string) => apiClient.patch(`${base}/products/${id}/remove`, { reason }),
  restoreProduct: (id: string) => apiClient.patch(`${base}/products/${id}/restore`),

  orders: (q: Query) => paged<OrderRow>(`${base}/orders`, 'orders', q),
  refundOrder: (id: string, reason: string) => apiClient.post(`${base}/orders/${id}/refund`, { reason }),

  lives: (q: Query) => paged<LiveRow>(`${base}/lives`, 'lives', q),
  stopLive: (id: string, reason: string) => apiClient.post(`${base}/lives/${id}/end`, { reason }),

  calls: (q: Query) => paged<CallRow>(`${base}/calls`, 'calls', q),
  endCall: (id: string) => apiClient.post(`${base}/calls/${id}/end`),

  affiliate: (q: Query) => paged<AffiliateRow>(`${base}/affiliate`, 'products', q),
  removeAffiliate: (id: string, reason: string) => apiClient.patch(`${base}/affiliate/${id}/remove`, { reason }),
  restoreAffiliate: (id: string) => apiClient.patch(`${base}/affiliate/${id}/restore`),

  fanbox: (q: Query) => paged<OrderRow>(`${base}/fanbox`, 'fanbox', q),

  settings: () => getData<StoreSettings>(`${base}/settings`),
  updateSettings: (body: Partial<Pick<StoreSettings, 'storeFeePercent' | 'fanboxFeePercent' | 'termsVersion' | 'termsText'>>) =>
    apiClient.patch<Envelope<StoreSettings>>(`${base}/settings`, body).then((r) => r.data.data),
  updateToolCard: (key: ToolKey, body: Partial<Pick<ToolCard, 'title' | 'description' | 'enabled' | 'order'>>) =>
    apiClient.patch<Envelope<ToolCard[]>>(`${base}/tool-cards/${key}`, body).then((r) => r.data.data),
  uploadToolCardImage: (key: ToolKey, file: File) =>
    apiClient.post<Envelope<ToolCard[]>>(`${base}/tool-cards/${key}/image`, imageForm(file)).then((r) => r.data.data),
  updateBanner: (body: Partial<WebBanner>) => apiClient.patch<Envelope<WebBanner>>(`${base}/banner`, body).then((r) => r.data.data),
  uploadBannerImage: (file: File) => apiClient.post<Envelope<WebBanner>>(`${base}/banner/image`, imageForm(file)).then((r) => r.data.data),
};

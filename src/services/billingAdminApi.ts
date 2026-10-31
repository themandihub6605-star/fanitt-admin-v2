// File: src/services/billingAdminApi.ts
import { apiClient } from './apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Admin → Billing & GST (backend: /api/billing/admin/*). Amounts in paise. */
export interface BillingSettings {
  gstEnabled: boolean;
  gstPercent: number;
  gstOnWithdrawalFee: boolean;
  gstOnBrandPayments: boolean;
  creatorMinWithdrawal: number;
  defaultCreatorFeePercent: number;
  invoicePrefix: string;
  businessName: string;
  businessGstin: string;
  businessAddress: string;
  businessEmail: string;
  agreementsEnabled: boolean;
  creatorAgreementText: string;
  brandAgreementText: string;
  agreementVersion: number;
  updatedAt?: string;
}

export interface AdminInvoice {
  _id: string;
  number: string;
  kind: 'brand_payment' | 'withdrawal_fee';
  title: string;
  billedTo: { name: string; email: string; gstin: string };
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  status: 'issued' | 'cancelled';
  razorpayPaymentId: string;
  emailedAt: string | null;
  createdAt: string;
}

export interface InvoiceList {
  invoices: AdminInvoice[];
  total: number;
  page: number;
  pages: number;
  totals: { platformFees: number; gst: number };
}

export const billingAdminApi = {
  getSettings: () => apiClient.get<ApiEnvelope<BillingSettings>>('/billing/admin/settings').then((r) => r.data.data),

  updateSettings: (payload: Partial<BillingSettings>) =>
    apiClient.patch<ApiEnvelope<BillingSettings>>('/billing/admin/settings', payload).then((r) => r.data.data),

  invoices: (params: { page?: number; kind?: string; q?: string }) =>
    apiClient
      .get<ApiEnvelope<InvoiceList>>('/billing/admin/invoices', { params: { ...params, kind: params.kind || undefined, q: params.q || undefined } })
      .then((r) => r.data.data),
};

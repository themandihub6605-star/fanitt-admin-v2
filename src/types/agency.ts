export interface ApiAgency {
  _id: string;
  user: { _id: string; name: string; email: string; avatarUrl?: string };
  agencyName: string;
  ownerName?: string;
  mobile?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  teamSize?: string;
  yearsInBusiness?: number | null;
  specialization?: string;
  documentUrl?: string;
  logoUrl?: string;
  referralCode: string;
  commissionPercent: number;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  totalCommissionEarned: number;
  thisMonthCommission: number;
  createdAt: string;
}

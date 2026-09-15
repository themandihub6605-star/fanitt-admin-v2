export type Role = 'fan' | 'creator' | 'brand' | 'agency' | 'admin';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  roles: Role[];
  walletBalance: number;
  isEmailVerified: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

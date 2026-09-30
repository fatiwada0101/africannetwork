/**
 * African Network Wi-Fi Hotspot & Wallet Platform
 * Global Type Definitions (Phase 5.2 - TypeScript Migration)
 */

// ── Database Table Models ────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: 'customer' | 'reseller' | 'admin';
  referral_code: string | null;
  referred_by: string | null;
  reseller_discount: number;
  tenant_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'wallet_topup'
  | 'voucher_purchase'
  | 'voucher_auto_renew'
  | 'wallet_transfer_sent'
  | 'wallet_transfer_received'
  | 'reseller_bulk_purchase'
  | 'admin_adjustment';

export type PaymentMethod = 'flutterwave' | 'paystack' | 'wallet' | 'cash';
export type PaymentStatus = 'successful' | 'pending' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  tx_ref?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  plan_id: string;
  user_id: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
  expires_at: string | null;
  activated_at: string | null;
  bytes_used?: number;
  bytes_limit?: number;
  auto_renew?: boolean;
  location_id?: string | null;
  tenant_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  speed: string;
  bytes_limit?: number | null;
  devices: number;
  popular?: boolean;
  active: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  tenant_id: string | null;
  created_at: string;
}

export interface Router {
  id: string;
  location_id: string;
  name: string;
  ip_address: string;
  rest_port: number;
  identity: string | null;
  status: 'online' | 'offline' | 'degraded';
  last_heartbeat: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface RoamingHandoff {
  id: string;
  voucher_id: string;
  source_router_id: string | null;
  target_router_id: string;
  user_mac: string | null;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tx_ref?: string | null;
  attachments?: any[];
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResellerCommission {
  id: string;
  reseller_id: string;
  voucher_id: string | null;
  commission_amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  branding: {
    brandName?: string;
    tagline?: string;
    primaryColor?: string;
    themeColor?: string;
    supportPhone?: string;
    supportEmail?: string;
    currency?: string;
    currencySymbol?: string;
  };
  contact_email: string | null;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

// ── API Payloads & Contracts ─────────────────────────────────────────────────

export interface PurchasePayload {
  planId: string;
  userId?: string;
  paymentMethod: PaymentMethod;
  email?: string;
  phone?: string;
  autoRenew?: boolean;
  locationId?: string;
}

export interface WalletTransferPayload {
  senderId: string;
  recipientIdentifier: string; // phone, email, or referral code
  amount: number;
}

export interface ResellerPurchasePayload {
  userId: string;
  planId: string;
  quantity: number;
}

export interface SchedulerRule {
  id: string;
  name: string;
  enabled: boolean;
  discount_percent: number;
  start_hour: number;
  end_hour: number;
  days: number[];
  badge: string;
  speed_boost_mbps?: number;
}

export interface ReconciliationReport {
  reconciled_at: string;
  is_balanced: boolean;
  metrics: {
    total_local_volume: number;
    total_gateway_volume: number;
    total_fees: number;
    net_settlement: number;
    total_matched: number;
    total_discrepancies: number;
  };
  discrepancies: {
    missing_in_gateway: any[];
    missing_locally: any[];
    amount_mismatches: any[];
  };
  matched_sample: any[];
}

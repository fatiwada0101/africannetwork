-- ==============================================================================
-- WiFi Hotspot Management & Super Admin Suite — Supabase Database Schema
-- Complete Turnkey DDL: Tables, Foreign Keys, Indexes, Functions, Triggers,
-- Row Level Security (RLS) Policies, and Default Seed Configuration.
-- 
-- How to use:
-- 1. Create a new project at https://supabase.com
-- 2. Open SQL Editor -> New Query
-- 3. Paste this entire file and click "RUN"
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CORE APPLICATION TABLES
-- ==============================================================================

-- 1.1 Profiles (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'customer', -- 'customer' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 1.2 Customer Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0.00 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- 1.3 Financial Transactions Ledger
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  type TEXT NOT NULL, -- 'wallet_topup', 'quick_buy', 'voucher_purchase'
  amount NUMERIC(12,2) NOT NULL,
  flw_ref TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'successful', 'failed'
  payment_method TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_flw_ref ON public.transactions(flw_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

-- 1.4 Wi-Fi Hotspot Vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  voucher_code TEXT NOT NULL UNIQUE,
  profile_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  is_used BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'used'
  duration TEXT,
  data_limit TEXT,
  expires_at TIMESTAMPTZ,
  is_fallback BOOLEAN DEFAULT FALSE,
  tx_ref TEXT,
  batch_id TEXT,
  serial_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON public.vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON public.vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch ON public.vouchers(batch_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created ON public.vouchers(created_at DESC);

-- 1.5 Internet Plans (Hotspot Packages)
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  speed TEXT,
  price NUMERIC(12,2) NOT NULL,
  duration TEXT NOT NULL,
  popular BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  devices INT DEFAULT 1,
  upload_speed TEXT DEFAULT '12M',
  download_speed TEXT DEFAULT '12M',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON public.plans(active, sort_order);

-- 1.6 User In-App Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);

-- ==============================================================================
-- 2. SUPER ADMIN & ROUTER SYNCHRONIZATION TABLES
-- ==============================================================================

-- 2.1 Central App Settings (MikroTik credentials, branding, payment keys, login templates)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.2 Change History & Audit Trail (Stores snapshots for 1-click rollback)
CREATE TABLE IF NOT EXISTS public.change_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_state JSONB DEFAULT '{}'::jsonb,
  after_state JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  rolled_back BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_change_history_category ON public.change_history(category);
CREATE INDEX IF NOT EXISTS idx_change_history_created ON public.change_history(created_at DESC);

-- 2.3 Pending Router Tasks (Async task queue for polling routers)
CREATE TABLE IF NOT EXISTS public.pending_router_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL DEFAULT 'create_hotspot_user',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_tasks_status ON public.pending_router_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_created ON public.pending_router_tasks(created_at);

-- 2.4 Fallback Offline Voucher Pool (Continuity during router outages)
CREATE TABLE IF NOT EXISTS public.fallback_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_code TEXT NOT NULL UNIQUE,
  plan_id TEXT,
  profile_name TEXT,
  duration TEXT,
  data_limit TEXT,
  price NUMERIC(12,2),
  status TEXT DEFAULT 'available',
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fallback_vouchers_status ON public.fallback_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_fallback_vouchers_plan ON public.fallback_vouchers(plan_id);

-- ==============================================================================
-- 3. STORED PROCEDURES & DATABASE FUNCTIONS
-- ==============================================================================

-- 3.1 Automatic Profile & Wallet Creation on User Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3.2 Race-Condition Protected Atomic Wallet Balance Adjustment
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_operation TEXT DEFAULT 'add'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_operation = 'deduct' THEN
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND balance >= p_amount
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      RETURN -1; -- Insufficient funds or wallet not found
    END IF;
  ELSIF p_operation = 'add' THEN
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      INSERT INTO public.wallets (user_id, balance)
      VALUES (p_user_id, p_amount)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + p_amount,
            updated_at = NOW()
      RETURNING balance INTO v_new_balance;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 3.3 Atomic Fallback Voucher Claim
CREATE OR REPLACE FUNCTION public.claim_fallback_voucher(
  p_profile_name TEXT,
  p_plan_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(voucher_id UUID, voucher_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  SELECT id, fallback_vouchers.voucher_code
  INTO v_id, v_code
  FROM public.fallback_vouchers
  WHERE is_used = false
    AND (status IS NULL OR status = 'available')
    AND (
      (p_plan_id IS NOT NULL AND plan_id IS NOT NULL AND LOWER(TRIM(plan_id)) = LOWER(TRIM(p_plan_id)))
      OR (p_plan_id IS NOT NULL AND LOWER(TRIM(profile_name)) = LOWER(TRIM(p_plan_id)))
      OR (p_profile_name IS NOT NULL AND plan_id IS NOT NULL AND LOWER(TRIM(plan_id)) = LOWER(TRIM(p_profile_name)))
      OR (p_profile_name IS NOT NULL AND LOWER(TRIM(profile_name)) = LOWER(TRIM(p_profile_name)))
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_id IS NOT NULL THEN
    UPDATE public.fallback_vouchers
    SET is_used = true,
        status = 'expired',
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = v_id;

    RETURN QUERY SELECT v_id, v_code;
  END IF;

  RETURN;
END;
$$;

-- 3.4 Automated Voucher Expiry Cleanup
CREATE OR REPLACE FUNCTION public.expire_outdated_vouchers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.fallback_vouchers
  SET status = 'expired',
      is_used = true
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status != 'expired';

  UPDATE public.vouchers
  SET status = 'expired',
      is_used = true
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status != 'expired';
END;
$$;

-- 3.5 Super Admin Real-Time Analytics Procedure
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_total_revenue       NUMERIC := 0;
  v_total_sold          INT := 0;
  v_total_generated     INT := 0;
  v_wallet_liability    NUMERIC := 0;
  v_this_week_revenue   NUMERIC := 0;
  v_last_week_revenue   NUMERIC := 0;
  v_trend_pct           INT := 0;
  v_plan_dist           JSON;
  v_daily_sales         JSON;
  v_recent_vouchers     JSON;
BEGIN
  SELECT 
    COALESCE(SUM(price) FILTER (WHERE user_id IS NOT NULL OR tx_ref IS NOT NULL OR transaction_id IS NOT NULL), 0),
    COUNT(*) FILTER (WHERE user_id IS NOT NULL OR tx_ref IS NOT NULL OR transaction_id IS NOT NULL),
    COUNT(*)
  INTO v_total_revenue, v_total_sold, v_total_generated 
  FROM public.vouchers;

  SELECT COALESCE(SUM(balance), 0) INTO v_wallet_liability FROM public.wallets;

  SELECT COALESCE(SUM(price), 0) INTO v_this_week_revenue 
  FROM public.vouchers 
  WHERE (user_id IS NOT NULL OR tx_ref IS NOT NULL OR transaction_id IS NOT NULL) 
    AND created_at >= NOW() - INTERVAL '7 days';

  SELECT COALESCE(SUM(price), 0) INTO v_last_week_revenue 
  FROM public.vouchers 
  WHERE (user_id IS NOT NULL OR tx_ref IS NOT NULL OR transaction_id IS NOT NULL) 
    AND created_at >= NOW() - INTERVAL '14 days' 
    AND created_at < NOW() - INTERVAL '7 days';

  IF v_last_week_revenue > 0 THEN 
    v_trend_pct := ROUND(((v_this_week_revenue - v_last_week_revenue) / v_last_week_revenue) * 100);
  ELSIF v_this_week_revenue > 0 THEN 
    v_trend_pct := 100;
  ELSE
    v_trend_pct := 0;
  END IF;

  SELECT json_agg(row_to_json(pd)) INTO v_plan_dist 
  FROM (
    SELECT profile_name AS name, COUNT(*) AS count, SUM(price) AS revenue, 
           CASE WHEN SUM(COUNT(*)) OVER() > 0 THEN ROUND((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER()) ELSE 0 END AS percentage 
    FROM public.vouchers 
    WHERE (user_id IS NOT NULL OR tx_ref IS NOT NULL OR transaction_id IS NOT NULL) 
      AND profile_name IS NOT NULL 
    GROUP BY profile_name 
    ORDER BY count DESC
  ) pd;

  SELECT json_agg(row_to_json(ds) ORDER BY ds.date) INTO v_daily_sales 
  FROM (
    SELECT day::DATE AS date, TO_CHAR(day, 'Dy') AS day_label, 
           COALESCE(SUM(v.price), 0) AS revenue, COUNT(v.id) AS count, 
           (day::DATE = CURRENT_DATE) AS is_today 
    FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval) AS day 
    LEFT JOIN public.vouchers v ON v.created_at::DATE = day::DATE 
      AND (v.user_id IS NOT NULL OR v.tx_ref IS NOT NULL OR v.transaction_id IS NOT NULL) 
    GROUP BY day 
    ORDER BY day
  ) ds;

  SELECT json_agg(row_to_json(rv)) INTO v_recent_vouchers 
  FROM (
    SELECT id, voucher_code, profile_name, price, is_used, created_at, user_id 
    FROM public.vouchers 
    ORDER BY created_at DESC 
    LIMIT 10
  ) rv;

  RETURN json_build_object(
    'revenue', v_total_revenue,
    'vouchers', v_total_sold,
    'totalGenerated', v_total_generated,
    'walletLiability', v_wallet_liability,
    'trendPct', v_trend_pct,
    'planDistribution', COALESCE(v_plan_dist, '[]'::json),
    'dailySales', COALESCE(v_daily_sales, '[]'::json),
    'recentVouchers', COALESCE(v_recent_vouchers, '[]'::json)
  );
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_router_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_vouchers ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4.2 Wallets Policies
DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- 4.3 Transactions Policies
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- 4.4 Vouchers Policies
DROP POLICY IF EXISTS "vouchers_select_own" ON public.vouchers;
CREATE POLICY "vouchers_select_own" ON public.vouchers FOR SELECT USING (auth.uid() = user_id);

-- 4.5 Notifications Policies
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 4.6 Plans Policies (Public read for active plans)
DROP POLICY IF EXISTS "plans_select_active" ON public.plans;
CREATE POLICY "plans_select_active" ON public.plans FOR SELECT USING (active = true);

-- 4.7 Server & Admin Service Role Bypass Policies
DROP POLICY IF EXISTS "service_role_all_app_settings" ON public.app_settings;
CREATE POLICY "service_role_all_app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_change_history" ON public.change_history;
CREATE POLICY "service_role_all_change_history" ON public.change_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_pending_tasks" ON public.pending_router_tasks;
CREATE POLICY "service_role_all_pending_tasks" ON public.pending_router_tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_fallback_vouchers" ON public.fallback_vouchers;
CREATE POLICY "service_role_all_fallback_vouchers" ON public.fallback_vouchers FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. DEFAULT SEED DATA
-- ==============================================================================

-- Default Internet Plans
INSERT INTO public.plans (id, name, speed, price, duration, popular, active, sort_order, devices, upload_speed, download_speed)
VALUES
  ('plan-1hr', '1 Hour Fast Pass', '10 Mbps', 100.00, '1h', false, true, 1, 1, '10M', '10M'),
  ('plan-1day', '1 Day Unlimited', '15 Mbps', 300.00, '1d', true, true, 2, 1, '15M', '15M'),
  ('plan-1wk', '7 Days Business Pass', '25 Mbps', 1500.00, '7d', false, true, 3, 2, '20M', '25M'),
  ('plan-1mo', '30 Days Premium Pass', '50 Mbps', 5000.00, '30d', false, true, 4, 3, '30M', '50M')
ON CONFLICT (id) DO NOTHING;

-- Default App Branding & Hotspot Settings
INSERT INTO public.app_settings (key, value)
VALUES
  ('branding', '{"app_name": "African Network", "logo_url": "", "theme": "violet", "app_url": "https://www.africannetwork.com.ng"}'::jsonb),
  ('hotspot_settings', '{"sharing_enabled": false, "default_devices": 1, "default_upload_speed": "12M", "default_download_speed": "12M", "expiry_mode": "elapsed"}'::jsonb),
  ('portal_template', '{"templateId": "midnight-glass", "businessName": "African Network Wi-Fi", "logoUrl": "", "contactFooter": "", "primaryColor": "#7c3aed", "buyUrl": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Server-owned checkout orders and atomic Monnify settlement.
ALTER TABLE public.pending_router_tasks ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
CREATE TABLE IF NOT EXISTS public.monnify_payment_intents (
  reference TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('wallet_topup', 'voucher_purchase')),
  user_id UUID REFERENCES public.profiles(id),
  email TEXT NOT NULL,
  phone TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 10000000),
  plan JSONB,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  is_test BOOLEAN NOT NULL,
  api_key TEXT NOT NULL,
  transaction_ref TEXT UNIQUE,
  transaction_id UUID REFERENCES public.transactions(id),
  voucher_code TEXT UNIQUE,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled')),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  CHECK (purpose <> 'wallet_topup' OR user_id IS NOT NULL),
  CHECK (purpose <> 'voucher_purchase' OR (plan IS NOT NULL AND voucher_code IS NOT NULL))
);
ALTER TABLE public.monnify_payment_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS monnify_service_only ON public.monnify_payment_intents;
CREATE POLICY monnify_service_only ON public.monnify_payment_intents FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.monnify_payment_intents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.monnify_payment_intents TO service_role;

CREATE OR REPLACE FUNCTION public.settle_monnify_payment(p_reference TEXT, p_transaction_ref TEXT, p_lease UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v public.monnify_payment_intents%ROWTYPE;
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  IF NULLIF(p_transaction_ref, '') IS NULL OR p_lease IS NULL THEN RAISE EXCEPTION 'Missing payment reference/lease'; END IF;
  SELECT * INTO v FROM public.monnify_payment_intents WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment order'; END IF;
  IF v.transaction_ref IS NOT NULL AND v.transaction_ref <> p_transaction_ref THEN RAISE EXCEPTION 'Payment transaction mismatch'; END IF;
  -- Canonical provider reference cannot settle another order, user, or purpose.
  UPDATE public.monnify_payment_intents SET transaction_ref = p_transaction_ref WHERE reference = p_reference;
  IF v.status = 'fulfilled' THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v.user_id;
    RETURN jsonb_build_object('duplicate', true, 'fulfilled', true, 'balance', v_balance, 'voucher_code', v.voucher_code, 'is_fallback', v.is_fallback);
  END IF;
  IF v.transaction_id IS NULL THEN
    INSERT INTO public.transactions(user_id, type, amount, status, payment_method, flw_ref, metadata)
    VALUES (v.user_id, v.purpose, v.amount, 'pending', 'monnify', v.reference,
      jsonb_build_object('gateway', 'monnify', 'transaction_reference', p_transaction_ref, 'plan_name', v.plan->>'name'))
    RETURNING id INTO v_transaction_id;
    UPDATE public.monnify_payment_intents SET transaction_id = v_transaction_id, status = 'paid' WHERE reference = p_reference;
  ELSE
    v_transaction_id := v.transaction_id;
  END IF;
  IF v.purpose = 'wallet_topup' THEN
    -- Ledger and balance are committed together; an exception rolls both back.
    INSERT INTO public.wallets(user_id, balance, updated_at) VALUES (v.user_id, v.amount, NOW())
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW()
    RETURNING balance INTO v_balance;
    UPDATE public.transactions SET status = 'successful' WHERE id = v_transaction_id;
    UPDATE public.monnify_payment_intents SET status = 'fulfilled', fulfilled_at = NOW() WHERE reference = p_reference;
    INSERT INTO public.notifications(user_id, title, message, type)
      VALUES (v.user_id, 'Wallet Credited', 'Your Monnify deposit of NGN ' || v.amount || ' has been credited.', 'wallet_credit');
    RETURN jsonb_build_object('balance', v_balance, 'duplicate', false);
  END IF;
  IF v.lease_until > NOW() THEN RETURN jsonb_build_object('claimed', false); END IF;
  UPDATE public.monnify_payment_intents SET lease_token = p_lease, lease_until = NOW() + INTERVAL '2 minutes', last_error = NULL WHERE reference = p_reference;
  RETURN jsonb_build_object('claimed', true, 'voucher_code', v.voucher_code, 'is_fallback', v.is_fallback);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_monnify_fallback(p_reference TEXT, p_lease UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v public.monnify_payment_intents%ROWTYPE; f public.fallback_vouchers%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.monnify_payment_intents WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND OR v.purpose <> 'voucher_purchase' OR v.status <> 'paid' OR v.lease_token IS DISTINCT FROM p_lease THEN RAISE EXCEPTION 'Invalid voucher lease'; END IF;
  IF v.is_fallback THEN RETURN jsonb_build_object('voucher_code', v.voucher_code); END IF;
  SELECT * INTO f FROM public.fallback_vouchers
    WHERE is_used = false AND (status IS NULL OR status = 'available')
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (plan_id = v.plan->>'id' OR (plan_id IS NULL AND profile_name = v.plan->>'name'))
    ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  UPDATE public.fallback_vouchers SET is_used = true, status = 'used', used_at = NOW(), used_by = v.user_id WHERE id = f.id;
  UPDATE public.monnify_payment_intents SET voucher_code = f.voucher_code, is_fallback = true WHERE reference = p_reference;
  RETURN jsonb_build_object('voucher_code', f.voucher_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_monnify_voucher(p_reference TEXT, p_lease UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v public.monnify_payment_intents%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.monnify_payment_intents WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND OR v.purpose <> 'voucher_purchase' OR v.lease_token IS DISTINCT FROM p_lease OR v.status <> 'paid' THEN RAISE EXCEPTION 'Invalid voucher lease'; END IF;
  INSERT INTO public.vouchers(user_id, voucher_code, profile_name, price, transaction_id, tx_ref, duration, is_fallback, auto_renew)
  VALUES (v.user_id, v.voucher_code, v.plan->>'name', v.amount, v.transaction_id, v.reference, v.plan->>'duration', v.is_fallback, v.auto_renew);
  UPDATE public.transactions SET status = 'successful', metadata = metadata || jsonb_build_object('voucher_code', v.voucher_code) WHERE id = v.transaction_id;
  UPDATE public.monnify_payment_intents SET status = 'fulfilled', fulfilled_at = NOW(), lease_until = NULL WHERE reference = p_reference;
  IF v.user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type)
      VALUES (v.user_id, 'Wi-Fi Pass Purchased', 'Your Monnify voucher: ' || v.voucher_code, 'voucher_purchase');
  END IF;
  RETURN jsonb_build_object('voucher_code', v.voucher_code);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_monnify_payment(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_monnify_fallback(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_monnify_voucher(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_monnify_payment(TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_monnify_fallback(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_monnify_voucher(TEXT, UUID) TO service_role;

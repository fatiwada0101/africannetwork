-- ============================================================================
-- Migration: 20260917000004_phase4_business.sql
-- Description: Phase 4 Business Operations + Push Subscriptions & Wallet Transfers
-- ============================================================================

-- 1. Profiles Enhancements (Referral & Reseller System)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reseller_discount NUMERIC(5,2) DEFAULT 0;

-- 2. Referral Rewards Table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_amount NUMERIC(12,2) DEFAULT 50.00,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Reseller Commissions Table
CREATE TABLE IF NOT EXISTS public.reseller_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Customer Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  tx_ref TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Push Subscriptions Table (Web Push - Phase 3.2)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Atomic Wallet-to-Wallet Transfer RPC Function
CREATE OR REPLACE FUNCTION public.transfer_wallet_balance(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_receiver_balance NUMERIC;
BEGIN
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer funds to yourself');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;

  -- Verify sender has enough funds and deduct atomically
  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_sender_id AND balance >= p_amount
  RETURNING balance INTO v_sender_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance for transfer');
  END IF;

  -- Credit receiver wallet (insert if doesn't exist yet)
  INSERT INTO public.wallets (user_id, balance, updated_at)
  VALUES (p_receiver_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = wallets.balance + p_amount, updated_at = now()
  RETURNING balance INTO v_receiver_balance;

  -- Record transactions for both parties
  INSERT INTO public.transactions (user_id, type, amount, status, payment_method, metadata)
  VALUES (
    p_sender_id,
    'wallet_transfer_sent',
    p_amount,
    'successful',
    'wallet',
    jsonb_build_object('recipient_id', p_receiver_id)
  );

  INSERT INTO public.transactions (user_id, type, amount, status, payment_method, metadata)
  VALUES (
    p_receiver_id,
    'wallet_transfer_received',
    p_amount,
    'successful',
    'wallet',
    jsonb_build_object('sender_id', p_sender_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'sender_new_balance', v_sender_balance,
    'receiver_new_balance', v_receiver_balance
  );
END;
$$;

-- 7. RLS Configuration
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "service_role_all_referral_rewards" ON public.referral_rewards;
CREATE POLICY "service_role_all_referral_rewards" ON public.referral_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_reseller_commissions" ON public.reseller_commissions;
CREATE POLICY "service_role_all_reseller_commissions" ON public.reseller_commissions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_support_tickets" ON public.support_tickets;
CREATE POLICY "service_role_all_support_tickets" ON public.support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "service_role_all_push_subscriptions" ON public.push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User policies
DROP POLICY IF EXISTS "users_read_own_referral_rewards" ON public.referral_rewards;
CREATE POLICY "users_read_own_referral_rewards" ON public.referral_rewards FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

DROP POLICY IF EXISTS "users_manage_own_support_tickets" ON public.support_tickets;
CREATE POLICY "users_manage_own_support_tickets" ON public.support_tickets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_manage_own_push_subs" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_push_subs" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- Migration: 20260917000003_phase3_growth.sql
-- Phase 3 Growth: Data Limits, Auto-Renew, and Voucher Gifting / Transfers
-- =========================================================================

-- 1. Enhance Vouchers Table with Data Limits, Auto-Renew & Gifting
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS bytes_limit BIGINT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS renewal_notified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gifted_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gifted_from UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gift_message TEXT;

CREATE INDEX IF NOT EXISTS idx_vouchers_auto_renew ON public.vouchers(auto_renew) WHERE auto_renew = TRUE;
CREATE INDEX IF NOT EXISTS idx_vouchers_gifted_to ON public.vouchers(gifted_to);

-- 2. Voucher Transfers Ledger
CREATE TABLE IF NOT EXISTS public.voucher_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_phone_or_email TEXT,
  gift_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voucher_transfers_code ON public.voucher_transfers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_voucher_transfers_to_user ON public.voucher_transfers(to_user_id);

-- 3. Enable RLS on voucher_transfers
ALTER TABLE public.voucher_transfers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for voucher_transfers
DROP POLICY IF EXISTS "Users can view transfers they sent or received" ON public.voucher_transfers;
CREATE POLICY "Users can view transfers they sent or received"
  ON public.voucher_transfers FOR SELECT
  USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

DROP POLICY IF EXISTS "Admin full access to voucher_transfers" ON public.voucher_transfers;
CREATE POLICY "Admin full access to voucher_transfers"
  ON public.voucher_transfers FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

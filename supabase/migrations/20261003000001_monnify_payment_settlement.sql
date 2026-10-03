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

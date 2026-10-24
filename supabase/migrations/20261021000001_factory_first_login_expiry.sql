-- Factory deadlines are recorded by the router on first successful login.
-- Do not backfill from created_at: generation time is not activation time.
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS expiry_policy TEXT NOT NULL DEFAULT 'created_at';
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_vouchers_due ON public.vouchers(expires_at) WHERE status <> 'expired';

CREATE OR REPLACE FUNCTION public.expire_outdated_vouchers()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.fallback_vouchers SET status = 'expired', is_used = true
    WHERE status <> 'expired' AND (
      expires_at <= NOW() OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '30 days')
    );
  UPDATE public.vouchers SET status = 'expired', is_used = true
    WHERE status <> 'expired' AND (
      expires_at <= NOW()
      OR (expiry_policy <> 'first_login' AND expires_at IS NULL AND created_at < NOW() - INTERVAL '30 days')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_outdated_vouchers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_vouchers() TO service_role;

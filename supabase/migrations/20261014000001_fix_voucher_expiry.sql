-- ==============================================================================
-- Migration: 20261014000001_fix_voucher_expiry.sql
-- Description: Updates expire_outdated_vouchers() to catch legacy vouchers
-- where expires_at was NULL but duration has elapsed.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.expire_outdated_vouchers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Expire fallback vouchers
  UPDATE public.fallback_vouchers
  SET status = 'expired',
      is_used = true
  WHERE (
    (expires_at IS NOT NULL AND expires_at < NOW())
    OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '30 days')
  )
  AND status != 'expired';

  -- 2. Expire active vouchers
  UPDATE public.vouchers
  SET status = 'expired',
      is_used = true
  WHERE status != 'expired'
    AND (
      (expires_at IS NOT NULL AND expires_at < NOW())
      OR (expires_at IS NULL AND is_used = true AND created_at < NOW() - INTERVAL '24 hours')
      OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '30 days')
    );
END;
$$;

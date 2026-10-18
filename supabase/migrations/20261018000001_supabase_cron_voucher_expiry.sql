-- ==============================================================================
-- Migration: 20261018000001_supabase_cron_voucher_expiry.sql
-- Description:
-- 1. Updates expire_outdated_vouchers() with wall-clock bruteforce checks
--    for daily, hourly, and multi-day vouchers.
-- 2. Sets up pg_cron inside Supabase PostgreSQL to run the expiration sweep
--    every 10 minutes, bypassing Vercel Hobby plan cron frequency limits.
-- ==============================================================================

-- 1. Hardened expire_outdated_vouchers function with wall-clock calculation
CREATE OR REPLACE FUNCTION public.expire_outdated_vouchers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A. Expire fallback vouchers
  UPDATE public.fallback_vouchers
  SET status = 'expired',
      is_used = true
  WHERE status != 'expired'
    AND (
      (expires_at IS NOT NULL AND expires_at < NOW())
      OR (created_at < NOW() - INTERVAL '30 days')
    );

  -- B. Expire active vouchers with explicit expires_at in the past
  UPDATE public.vouchers
  SET status = 'expired',
      is_used = true
  WHERE status != 'expired'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- C. Bruteforce wall-clock expiry based on duration string & elapsed time
  -- 1 hour
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%1h%' OR duration ILIKE '%1 hour%' OR profile_name ILIKE '%1h%' OR profile_name ILIKE '%1 hour%')
    AND created_at < NOW() - INTERVAL '1 hour 5 minutes';

  -- 2 hours
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%2h%' OR duration ILIKE '%2 hour%' OR profile_name ILIKE '%2h%' OR profile_name ILIKE '%2 hour%')
    AND created_at < NOW() - INTERVAL '2 hours 5 minutes';

  -- 3 hours
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%3h%' OR duration ILIKE '%3 hour%' OR profile_name ILIKE '%3h%' OR profile_name ILIKE '%3 hour%')
    AND created_at < NOW() - INTERVAL '3 hours 5 minutes';

  -- 6 hours
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%6h%' OR duration ILIKE '%6 hour%' OR profile_name ILIKE '%6h%' OR profile_name ILIKE '%6 hour%')
    AND created_at < NOW() - INTERVAL '6 hours 5 minutes';

  -- 12 hours
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%12h%' OR duration ILIKE '%12 hour%' OR profile_name ILIKE '%12h%' OR profile_name ILIKE '%12 hour%')
    AND created_at < NOW() - INTERVAL '12 hours 5 minutes';

  -- 24 hours / 1 day / daily
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (
      duration ILIKE '%24h%' OR duration ILIKE '%1d%' OR duration ILIKE '%daily%' OR duration ILIKE '%1 day%'
      OR profile_name ILIKE '%24h%' OR profile_name ILIKE '%1d%' OR profile_name ILIKE '%daily%' OR profile_name ILIKE '%1 day%'
    )
    AND created_at < NOW() - INTERVAL '24 hours 5 minutes';

  -- 2 days
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%2d%' OR duration ILIKE '%2 day%' OR profile_name ILIKE '%2d%' OR profile_name ILIKE '%2 day%')
    AND created_at < NOW() - INTERVAL '48 hours 5 minutes';

  -- 3 days
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%3d%' OR duration ILIKE '%3 day%' OR profile_name ILIKE '%3d%' OR profile_name ILIKE '%3 day%')
    AND created_at < NOW() - INTERVAL '72 hours 5 minutes';

  -- 7 days / weekly
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%7d%' OR duration ILIKE '%week%' OR profile_name ILIKE '%7d%' OR profile_name ILIKE '%week%')
    AND created_at < NOW() - INTERVAL '7 days 5 minutes';

  -- 14 days / 2 weeks
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%14d%' OR duration ILIKE '%2w%' OR profile_name ILIKE '%14d%' OR profile_name ILIKE '%2w%')
    AND created_at < NOW() - INTERVAL '14 days 5 minutes';

  -- 30 days / monthly
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND (duration ILIKE '%30d%' OR duration ILIKE '%month%' OR profile_name ILIKE '%30d%' OR profile_name ILIKE '%month%')
    AND created_at < NOW() - INTERVAL '30 days 5 minutes';

  -- Catch-all for legacy vouchers created over 30 days ago
  UPDATE public.vouchers
  SET status = 'expired', is_used = true
  WHERE status != 'expired'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 2. Setup pg_cron inside Supabase (if available) to run every 10 minutes
DO $$
BEGIN
  -- Attempt to enable extensions if permissions allow
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension creation skipped: %', SQLERRM;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension creation skipped: %', SQLERRM;
  END;

  -- If pg_cron is installed, schedule the 10-minute expiry job
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- Unschedule prior job if exists
      PERFORM cron.unschedule('expire-outdated-vouchers-job')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-outdated-vouchers-job');

      -- Schedule job every 10 minutes
      PERFORM cron.schedule(
        'expire-outdated-vouchers-job',
        '*/10 * * * *',
        'SELECT public.expire_outdated_vouchers();'
      );
      RAISE NOTICE 'Successfully scheduled expire-outdated-vouchers-job via pg_cron';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule pg_cron job: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- ==============================================================================
-- Migration: 20261024000001_supabase_cron_router_health.sql
-- Description:
-- 1. Creates check_router_health() database function to manage router status.
--    - For polling routers: marks offline if last_seen_at > 5 minutes ago.
--    - For direct routers: uses pg_net to ping /api/cron/router-health every 5 min.
-- 2. Sets up pg_cron inside Supabase PostgreSQL to run check_router_health()
--    every 5 minutes, completely bypassing Vercel Hobby plan daily cron limits.
-- ==============================================================================

-- 1. Create or replace check_router_health function
CREATE OR REPLACE FUNCTION public.check_router_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A. For polling-mode routers: mark offline if last_seen_at is older than 5 minutes
  UPDATE public.routers
  SET status = 'offline',
      updated_at = NOW()
  WHERE connection_mode = 'polling'
    AND is_active = true
    AND status != 'offline'
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes');

  -- B. Trigger HTTP check to app router-health endpoint via pg_net (if installed)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM net.http_get(
        url := 'https://africannetwork.net/api/cron/router-health?source=supabase_cron',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'User-Agent', 'Supabase-pg_cron/1.0'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_net router health trigger skipped: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- 2. Setup pg_cron inside Supabase to run every 5 minutes
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

  -- If pg_cron is installed, schedule the 5-minute health check job
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- Unschedule prior job if exists
      PERFORM cron.unschedule('check-router-health-job')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-router-health-job');

      -- Schedule job every 5 minutes
      PERFORM cron.schedule(
        'check-router-health-job',
        '*/5 * * * *',
        'SELECT public.check_router_health();'
      );
      RAISE NOTICE 'Successfully scheduled check-router-health-job via pg_cron (every 5 mins)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not schedule pg_cron job: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- =========================================================================
-- Migration: 20260917000002_multi_router_roaming.sql
-- ISP-Grade Multi-Router Roaming, Centralized Accounting & GPS Locations
-- =========================================================================

-- 1. Locations Table (Physical sites with GPS boundaries)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  coverage_radius_meters INT DEFAULT 100 CHECK (coverage_radius_meters > 0),
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_owner ON public.locations(owner_id);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON public.locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);

-- 2. Routers Table (Individual MikroTik hardware devices)
CREATE TABLE IF NOT EXISTS public.routers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  identity TEXT NOT NULL, -- MikroTik /system/identity name (e.g. 'Asuk-R1-HQ')
  hotspot_server_name TEXT DEFAULT 'hotspot1',
  dns_name TEXT DEFAULT 'asuktech.net',
  connection_mode TEXT DEFAULT 'direct' CHECK (connection_mode IN ('direct', 'polling')),
  ip_address TEXT,
  port INT DEFAULT 443,
  username TEXT DEFAULT 'admin',
  password TEXT,
  use_ssl BOOLEAN DEFAULT TRUE,
  polling_secret TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'degraded')),
  model TEXT,
  ros_version TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routers_location ON public.routers(location_id);
CREATE INDEX IF NOT EXISTS idx_routers_identity ON public.routers(identity);
CREATE INDEX IF NOT EXISTS idx_routers_status ON public.routers(status);
CREATE INDEX IF NOT EXISTS idx_routers_polling_secret ON public.routers(polling_secret);

-- 3. Enhance pending_router_tasks to support multi-router targeting
ALTER TABLE public.pending_router_tasks
  ADD COLUMN IF NOT EXISTS router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pending_tasks_router ON public.pending_router_tasks(router_id, status);

-- 4. Enhance Vouchers Table for Central Roaming Ledger
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS roaming_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS origin_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_router_id UUID REFERENCES public.routers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_uptime_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_uptime_seconds INT,
  ADD COLUMN IF NOT EXISTS total_bytes_used BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_mac TEXT;

CREATE INDEX IF NOT EXISTS idx_vouchers_last_router ON public.vouchers(last_router_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_remaining_time ON public.vouchers(remaining_uptime_seconds);
CREATE INDEX IF NOT EXISTS idx_vouchers_current_mac ON public.vouchers(current_mac);

-- 5. Central Roaming Sessions Ledger
CREATE TABLE IF NOT EXISTS public.roaming_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL,
  router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  user_mac TEXT NOT NULL,
  user_ip TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'handed_off', 'expired')),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roaming_voucher_active ON public.roaming_sessions(voucher_code, status);
CREATE INDEX IF NOT EXISTS idx_roaming_router ON public.roaming_sessions(router_id);
CREATE INDEX IF NOT EXISTS idx_roaming_mac ON public.roaming_sessions(user_mac);

-- 6. Seed Default Location & Default Router (Migrating from app_settings if exists)
DO $$
DECLARE
  v_loc_id UUID;
  v_mikrotik_val JSONB;
BEGIN
  -- Check if we already have a location
  IF NOT EXISTS (SELECT 1 FROM public.locations LIMIT 1) THEN
    INSERT INTO public.locations (name, address, latitude, longitude, coverage_radius_meters)
    VALUES ('Main Campus Hub', 'University Main Campus, Lagos', 6.5243793, 3.3792057, 150)
    RETURNING id INTO v_loc_id;

    -- Fetch existing single router settings
    SELECT value INTO v_mikrotik_val FROM public.app_settings WHERE key = 'mikrotik' LIMIT 1;

    INSERT INTO public.routers (
      location_id,
      name,
      identity,
      hotspot_server_name,
      dns_name,
      connection_mode,
      ip_address,
      port,
      username,
      password,
      use_ssl,
      status
    )
    VALUES (
      v_loc_id,
      COALESCE(v_mikrotik_val->>'wifi_ssid', 'Primary Hotspot Gateway'),
      'Asuk-R1-HQ',
      'hotspot1',
      COALESCE(v_mikrotik_val->>'hotspot_url', 'asuktech.net'),
      CASE WHEN (SELECT value->>'mode' FROM public.app_settings WHERE key = 'mikrotik_connection_mode') = 'polling' THEN 'polling' ELSE 'direct' END,
      COALESCE(v_mikrotik_val->>'ip', '192.168.88.1'),
      COALESCE((v_mikrotik_val->>'port')::INT, 443),
      COALESCE(v_mikrotik_val->>'user', 'admin'),
      COALESCE(v_mikrotik_val->>'pass', ''),
      COALESCE((v_mikrotik_val->>'use_ssl')::BOOLEAN, TRUE),
      'online'
    );
  END IF;
END $$;

-- 7. Enable RLS on newly created tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roaming_sessions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- Public can view active locations (for coverage map and branch detection)
CREATE POLICY "Public can view active locations"
  ON public.locations FOR SELECT
  USING (is_active = TRUE);

-- Service role / Admin has full access to locations
CREATE POLICY "Admin full access to locations"
  ON public.locations FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Public can view basic router info (identity, name, dns_name)
CREATE POLICY "Public can view active router public info"
  ON public.routers FOR SELECT
  USING (is_active = TRUE);

-- Service role has full access to routers
CREATE POLICY "Admin full access to routers"
  ON public.routers FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Service role has full access to roaming sessions
CREATE POLICY "Admin full access to roaming sessions"
  ON public.roaming_sessions FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

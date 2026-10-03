-- ============================================================================
-- Migration: 20260917000005_phase5_scale.sql
-- Description: Phase 5 Scale & Enterprise - White-Label Multi-Tenant SaaS
-- ============================================================================

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  branding JSONB DEFAULT '{
    "brandName": "African Network",
    "themeColor": "#3b82f6",
    "primaryColor": "emerald",
    "supportPhone": "+2348000000000",
    "supportEmail": "support@africannetwork.com.ng"
  }'::jsonb,
  contact_email TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'pending'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed primary tenant
INSERT INTO public.tenants (name, slug, custom_domain, contact_email)
VALUES ('African Network Hotspot', 'african-network', 'africannetwork.com.ng', 'admin@africannetwork.com.ng')
ON CONFLICT (slug) DO NOTHING;

-- 2. Add tenant_id to key tables for multi-tenant isolation
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 3. RLS for Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_tenants" ON public.tenants;
CREATE POLICY "service_role_all_tenants" ON public.tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_active_tenants" ON public.tenants;
CREATE POLICY "public_read_active_tenants" ON public.tenants FOR SELECT TO anon, authenticated USING (status = 'active');

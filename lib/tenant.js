/**
 * White-Label Multi-Tenant SaaS Platform Helper (Phase 5.5)
 * Resolves tenant configurations and custom branding per domain/organization.
 */

export const DEFAULT_TENANT = {
  id: 'primary-asuk-tech',
  name: 'African Network Hotspot',
  slug: 'asuk-tech',
  custom_domain: 'asuktech.com',
  branding: {
    brandName: 'African Network',
    tagline: 'High-Speed Secure Wi-Fi Access',
    primaryColor: '#3b82f6',
    themeColor: 'blue',
    supportPhone: '+2348000000000',
    supportEmail: 'support@africannetwork.com',
    currency: 'NGN',
    currencySymbol: '₦'
  },
  status: 'active'
};

/**
 * Extract hostname from request or host string
 */
export function extractHostname(host) {
  if (!host) return 'localhost';
  return host.split(':')[0].toLowerCase();
}

/**
 * Resolve tenant from database or fallback to primary tenant
 */
export async function resolveTenant(supabase, hostOrDomain = '') {
  const hostname = extractHostname(hostOrDomain);

  // If localhost or default, return primary tenant
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('vercel.app')) {
    return DEFAULT_TENANT;
  }

  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .or(`custom_domain.eq.${hostname},slug.eq.${hostname}`)
      .eq('status', 'active')
      .maybeSingle();

    if (!error && tenant) {
      return {
        ...tenant,
        branding: {
          ...DEFAULT_TENANT.branding,
          ...(tenant.branding || {})
        }
      };
    }
  } catch (err) {
    console.warn('Error resolving tenant for host:', hostname, err);
  }

  return DEFAULT_TENANT;
}

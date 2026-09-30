import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { resolveTenant, DEFAULT_TENANT } from '@/lib/tenant';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostParam = searchParams.get('host');
    const hostHeader = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    const hostToResolve = hostParam || hostHeader;

    const supabase = supabaseServer();
    const tenant = await resolveTenant(supabase, hostToResolve);

    return NextResponse.json({
      success: true,
      tenant
    });
  } catch (err) {
    console.error('Error fetching tenant config:', err);
    return NextResponse.json({
      success: true,
      tenant: DEFAULT_TENANT
    });
  }
}

export async function POST(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, slug, custom_domain, branding, contact_email, status } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug for tenant' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('tenants')
      .upsert({
        name,
        slug: slug.toLowerCase().trim(),
        custom_domain: custom_domain ? custom_domain.toLowerCase().trim() : null,
        branding: branding || {},
        contact_email: contact_email || null,
        status: status || 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant saved successfully',
      tenant: data
    });
  } catch (err) {
    console.error('Error saving tenant:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

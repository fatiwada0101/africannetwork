import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const supabase = supabaseServer();
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tenants: tenants || []
    });
  } catch (err) {
    console.error('Error fetching admin tenants:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

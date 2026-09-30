import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const supabase = supabaseServer();
    const { data: resellers, error: rError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, reseller_discount, created_at')
      .in('role', ['reseller', 'admin'])
      .order('created_at', { ascending: false });

    if (rError) {
      return NextResponse.json({ error: rError.message }, { status: 500 });
    }

    const { data: commissions } = await supabase
      .from('reseller_commissions')
      .select('id, reseller_id, commission_amount, status, created_at');

    const totalCommissions = (commissions || []).reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);

    return NextResponse.json({
      success: true,
      resellers: resellers || [],
      commissions: commissions || [],
      stats: {
        total_resellers: (resellers || []).length,
        total_commissions_generated: totalCommissions
      }
    });
  } catch (error) {
    console.error('Error fetching admin resellers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role, reseller_discount } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const updates = {};
    if (role) updates.role = role;
    if (reseller_discount !== undefined) {
      updates.reseller_discount = Math.min(Math.max(Number(reseller_discount) || 0, 0), 80);
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reseller updated successfully',
      profile: data
    });
  } catch (error) {
    console.error('Error updating reseller:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

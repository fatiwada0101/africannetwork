import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing required userId parameter' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, reseller_discount, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 2. Fetch commissions
    const { data: commissions, error: comError } = await supabase
      .from('reseller_commissions')
      .select('id, commission_amount, status, created_at, voucher_id')
      .eq('reseller_id', userId)
      .order('created_at', { ascending: false });

    if (comError) {
      return NextResponse.json({ error: comError.message }, { status: 500 });
    }

    const totalEarned = (commissions || []).reduce((acc, c) => acc + (Number(c.commission_amount) || 0), 0);
    const pendingPayout = (commissions || [])
      .filter(c => c.status === 'pending')
      .reduce((acc, c) => acc + (Number(c.commission_amount) || 0), 0);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        role: profile.role,
        reseller_discount: profile.reseller_discount || 0
      },
      summary: {
        total_commissions_earned: totalEarned,
        pending_payout: pendingPayout,
        total_vouchers_sold: (commissions || []).length
      },
      commissions: commissions || []
    });

  } catch (error) {
    console.error('Error fetching reseller commissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

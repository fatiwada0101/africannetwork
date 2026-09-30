import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUserAuth, userUnauthorizedResponse } from '@/lib/user-auth';

/**
 * POST /api/vouchers/auto-renew
 * Allows user to toggle auto-renewal on their active passes anytime.
 */
export async function POST(request) {
  try {
    const user = await validateUserAuth(request);
    if (!user) {
      return userUnauthorizedResponse('Authentication required to modify auto-renew settings');
    }

    const body = await request.json();
    const { voucher_code, auto_renew } = body;

    if (!voucher_code) {
      return NextResponse.json({ error: 'Voucher code is required' }, { status: 400 });
    }

    const { data: voucher, error: fetchErr } = await supabaseAdmin
      .from('vouchers')
      .select('id, user_id, voucher_code, profile_name, auto_renew')
      .eq('voucher_code', voucher_code.trim())
      .maybeSingle();

    if (fetchErr || !voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    if (voucher.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to modify this pass' }, { status: 403 });
    }

    const newSetting = typeof auto_renew === 'boolean' ? auto_renew : !voucher.auto_renew;

    const { error: updateErr } = await supabaseAdmin
      .from('vouchers')
      .update({ auto_renew: newSetting })
      .eq('id', voucher.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update auto-renew setting' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voucher_code: voucher.voucher_code,
      auto_renew: newSetting,
      message: newSetting
        ? 'Auto-renewal enabled. Your pass will renew automatically using your wallet.'
        : 'Auto-renewal cancelled for this pass.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

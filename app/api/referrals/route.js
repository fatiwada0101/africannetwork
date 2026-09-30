import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUserAuth, userUnauthorizedResponse } from '@/lib/user-auth';

/**
 * Referral / Loyalty Program (Phase 4.4)
 * GET /api/referrals - Get user's referral code, statistics, and rewards
 * POST /api/referrals - Apply a referral code during signup or first purchase
 */

export async function GET(request) {
  try {
    const user = await validateUserAuth(request);
    if (!user) {
      return userUnauthorizedResponse('Authentication required to view referral stats');
    }

    // 1. Fetch user's profile
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_code, referred_by')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Generate referral code if user doesn't have one yet
    let referralCode = profile?.referral_code;
    if (!referralCode) {
      referralCode = 'ASUK' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabaseAdmin
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
    }

    // 3. Fetch rewards earned
    const { data: rewards } = await supabaseAdmin
      .from('referral_rewards')
      .select('*')
      .eq('referrer_id', user.id);

    const totalEarned = (rewards || [])
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

    const totalInvites = (rewards || []).length;

    return NextResponse.json({
      success: true,
      referral_code: referralCode,
      referral_url: `https://asuktech.net/?ref=${referralCode}`,
      total_invites: totalInvites,
      total_earned: totalEarned,
      rewards: rewards || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await validateUserAuth(request);
    if (!user) {
      return userUnauthorizedResponse('Authentication required to apply referral code');
    }

    const body = await request.json();
    const { referral_code } = body;

    if (!referral_code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    const cleanCode = referral_code.trim().toUpperCase();

    // Find referrer
    const { data: referrer } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    if (referrer.id === user.id) {
      return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
    }

    // Check if user was already referred
    const { data: myProfile } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .maybeSingle();

    if (myProfile?.referred_by) {
      return NextResponse.json({ error: 'You have already applied a referral code' }, { status: 400 });
    }

    // Link user to referrer
    await supabaseAdmin
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    // Create pending reward for referrer (₦50)
    await supabaseAdmin.from('referral_rewards').insert({
      referrer_id: referrer.id,
      referee_id: user.id,
      reward_amount: 50.00,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Referral code applied! You and your referrer will earn rewards upon your first Wi-Fi pass purchase.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

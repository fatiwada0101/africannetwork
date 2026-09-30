import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone, businessName, location } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 });
    }

    // 1. Create auth user with Supabase service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone || '',
        business_name: businessName || '',
        location: location || '',
        role: 'reseller'
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Upsert profile with reseller role and 15% starter wholesale discount
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone || null,
        role: 'reseller',
        reseller_discount: 15, // Default 15% wholesale discount
        referral_code: `AGENT_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn('Profile upsert notice:', profileError.message);
    }

    // 3. Ensure wallet exists
    await supabaseAdmin
      .from('wallets')
      .upsert({
        user_id: userId,
        balance: 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      message: 'Reseller account registered successfully! You can now log in to your Agent Portal.',
      userId
    });

  } catch (err) {
    console.error('Error in reseller signup:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

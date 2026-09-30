import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateUserAuth, userUnauthorizedResponse } from '@/lib/user-auth.js';
import { logger } from '@/lib/logger.js';

export async function POST(request) {
  try {
    const authUser = await validateUserAuth(request);
    if (!authUser) {
      return userUnauthorizedResponse('Authentication required to gift or transfer vouchers');
    }

    const body = await request.json().catch(() => ({}));
    const { voucher_code, recipient_phone_or_email, gift_message } = body;

    if (!voucher_code || !recipient_phone_or_email) {
      return NextResponse.json(
        { success: false, error: 'Voucher code and recipient phone or email are required' },
        { status: 400 }
      );
    }

    const cleanCode = voucher_code.trim();
    const cleanRecipient = recipient_phone_or_email.trim().toLowerCase();

    // 1. Verify voucher ownership
    const { data: voucher, error: vErr } = await supabaseAdmin
      .from('vouchers')
      .select('*, plans(*)')
      .eq('voucher_code', cleanCode)
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (vErr || !voucher) {
      return NextResponse.json(
        { success: false, error: 'Active voucher not found or you do not have permission to transfer it' },
        { status: 404 }
      );
    }

    // 2. Check if recipient profile exists in DB
    const { data: recipientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .or(`email.ilike.${cleanRecipient},phone.eq.${cleanRecipient}`)
      .maybeSingle();

    const recipientUserId = recipientProfile?.id || null;

    // 3. Update voucher ownership if recipient exists
    const updatePayload = {
      gifted_from: authUser.id,
      gift_message: gift_message?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (recipientUserId) {
      updatePayload.user_id = recipientUserId;
      updatePayload.gifted_to = recipientUserId;
    }

    await supabaseAdmin
      .from('vouchers')
      .update(updatePayload)
      .eq('id', voucher.id);

    // 4. Record transfer in voucher_transfers
    await supabaseAdmin
      .from('voucher_transfers')
      .insert({
        voucher_id: voucher.id,
        voucher_code: cleanCode,
        from_user_id: authUser.id,
        to_user_id: recipientUserId,
        recipient_phone_or_email: cleanRecipient,
        gift_message: gift_message?.trim() || null,
      });

    // 5. Create notification for recipient if registered
    if (recipientUserId) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: recipientUserId,
          title: '🎁 Wi-Fi Pass Gift Received!',
          message: `${authUser.full_name || 'A friend'} gifted you a ${voucher.profile_name} pass! Voucher code: ${cleanCode}`,
          type: 'success',
        })
        .catch(() => {});
    }

    // 6. Generate shareable claim link
    const claimLink = `https://asuktech.net/login?code=${encodeURIComponent(cleanCode)}`;

    logger.financial('VOUCHER_GIFT_TRANSFERRED', {
      voucher_code: cleanCode,
      from_user: authUser.id,
      to_user: recipientUserId,
      recipient: cleanRecipient,
    });

    return NextResponse.json({
      success: true,
      message: recipientUserId
        ? `Pass transferred successfully to ${recipientProfile.full_name || cleanRecipient}!`
        : `Gift prepared for ${cleanRecipient}. Share the link with them!`,
      transferred_to_registered_user: Boolean(recipientUserId),
      claim_link: claimLink,
      voucher_code: cleanCode,
    });
  } catch (err) {
    logger.error('API /vouchers/gift failed:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

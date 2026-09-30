import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUserAuth, userUnauthorizedResponse } from '@/lib/user-auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/wallet/transfer
 * Atomically transfers funds between two user wallets (Feature 4.6).
 */
export async function POST(request) {
  try {
    const user = await validateUserAuth(request);
    if (!user) {
      return userUnauthorizedResponse('Authentication required to transfer funds');
    }

    const body = await request.json();
    const { recipient_identifier, amount, note } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Transfer amount must be greater than zero' }, { status: 400 });
    }

    if (!recipient_identifier || typeof recipient_identifier !== 'string') {
      return NextResponse.json({ error: 'Recipient email or phone number is required' }, { status: 400 });
    }

    const cleanIdentifier = recipient_identifier.trim().toLowerCase();

    // Find recipient in profiles or auth.users
    const { data: recipientProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone')
      .or(`email.ilike.${cleanIdentifier},phone.eq.${cleanIdentifier}`)
      .maybeSingle();

    let recipientUserId = recipientProfile?.id;

    if (!recipientUserId) {
      // Fallback check auth users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const match = (authUsers?.users || []).find(
        (u) => (u.email && u.email.toLowerCase() === cleanIdentifier) || (u.phone && u.phone === cleanIdentifier)
      );
      if (match) {
        recipientUserId = match.id;
      }
    }

    if (!recipientUserId) {
      return NextResponse.json({
        error: `No registered user found with email or phone "${recipient_identifier}"`,
      }, { status: 404 });
    }

    if (recipientUserId === user.id) {
      return NextResponse.json({ error: 'You cannot transfer wallet balance to yourself' }, { status: 400 });
    }

    // Call atomic RPC
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('transfer_wallet_balance', {
      p_sender_id: user.id,
      p_receiver_id: recipientUserId,
      p_amount: numAmount,
    });

    if (rpcErr) {
      logger.error('RPC transfer error', { error: rpcErr.message, sender: user.id, receiver: recipientUserId });
      return NextResponse.json({ error: 'Database error processing transfer' }, { status: 500 });
    }

    if (!rpcResult || !rpcResult.success) {
      return NextResponse.json({
        error: rpcResult?.error || 'Transfer failed: insufficient funds or invalid transaction',
      }, { status: 400 });
    }

    // Notify recipient
    const senderName = user.email ? user.email.split('@')[0] : 'A user';
    await supabaseAdmin.from('notifications').insert({
      user_id: recipientUserId,
      title: 'Wallet Credit Received! 💸',
      message: `You received ₦${numAmount.toLocaleString()} from ${senderName}.${note ? ` Note: "${note}"` : ''}`,
      type: 'wallet_credit',
    }).catch(() => {});

    // Notify sender
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      title: 'Wallet Transfer Sent',
      message: `You transferred ₦${numAmount.toLocaleString()} to ${cleanIdentifier}.`,
      type: 'wallet_debit',
    }).catch(() => {});

    logger.financial({
      action: 'wallet_transfer',
      amount: numAmount,
      userId: user.id,
      ref: `W2W_${Date.now()}`,
      status: 'successful',
      details: {
        recipient_id: recipientUserId,
        recipient_identifier: cleanIdentifier,
        sender_new_balance: rpcResult.sender_new_balance,
      },
    });

    return NextResponse.json({
      success: true,
      sender_new_balance: rpcResult.sender_new_balance,
      transferred_amount: numAmount,
      recipient: cleanIdentifier,
      message: `₦${numAmount.toLocaleString()} successfully sent to ${cleanIdentifier}`,
    });
  } catch (err) {
    logger.error('Transfer route exception', { error: err.message });
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin, broadcastWalletUpdate } from '@/lib/supabase-server';
import { rateLimitWebhook } from '@/lib/rate-limit';
import { getPaystackConfig, verifyPaystackSignature } from '@/lib/paystack';
import { logger } from '@/lib/logger';

/**
 * Paystack Webhook Handler (Phase 3.6)
 * POST /api/webhook/paystack
 * Handles charge.success events with HMAC-SHA512 validation and idempotency.
 */
export async function POST(request) {
  const rateLimited = rateLimitWebhook(request);
  if (rateLimited) return rateLimited;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    const config = await getPaystackConfig();

    // Verify signature if secret is present
    if (config.secretKey) {
      const isValid = verifyPaystackSignature(rawBody, signature, config.secretKey);
      if (!isValid) {
        console.warn('Paystack webhook signature invalid');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    if (event !== 'charge.success') {
      return NextResponse.json({ status: 'ignored', reason: `Unhandled event: ${event}` });
    }

    const reference = data.reference;
    const amountInNaira = (data.amount || 0) / 100; // Paystack amounts are in Kobo
    const customerEmail = data.customer?.email?.toLowerCase();
    const meta = data.metadata || {};
    const userId = meta.user_id || null;
    const isTopup = meta.type === 'wallet_topup' || (!meta.plan_name && !meta.plan_id);

    // Idempotency check: check if this reference was already processed in transactions
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id, status')
      .eq('flw_ref', reference)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ status: 'success', message: 'Already processed (idempotent)' });
    }

    if (isTopup && userId) {
      // Atomic wallet credit
      const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('adjust_wallet_balance', {
        p_user_id: userId,
        p_amount: amountInNaira,
        p_operation: 'add',
      });

      if (rpcErr) {
        logger.error('Paystack webhook RPC error', { error: rpcErr.message, ref: reference });
        return NextResponse.json({ error: 'Database wallet credit error' }, { status: 500 });
      }

      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        type: 'wallet_topup',
        amount: amountInNaira,
        status: 'successful',
        payment_method: 'paystack',
        flw_ref: reference,
        metadata: { gateway: 'paystack', customer_email: customerEmail },
      });

      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        title: 'Wallet Funded (Paystack) 💳',
        message: `Your wallet was credited with ₦${amountInNaira.toLocaleString()}. New balance: ₦${Number(rpcResult).toLocaleString()}.`,
        type: 'wallet_credit',
      }).catch(() => {});

      broadcastWalletUpdate(userId, Number(rpcResult));

      logger.financial({
        action: 'paystack_topup',
        amount: amountInNaira,
        userId,
        ref: reference,
        status: 'successful',
      });
    }

    return NextResponse.json({ status: 'success', reference });
  } catch (err) {
    console.error('Paystack webhook exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

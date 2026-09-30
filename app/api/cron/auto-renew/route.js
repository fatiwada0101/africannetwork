import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createOrQueueHotspotUser, isMikroTikConfigured } from '@/lib/mikrotik';
import { generateUniqueCode, generateWalletTxRef } from '@/lib/voucher-utils';
import { logger } from '@/lib/logger';

/**
 * Automated Auto-Renewal Cron Job (Phase 3.7)
 * Runs periodically to check vouchers flagged with `auto_renew = true`.
 * 
 * 1. Sends pre-renewal reminder 24h before expiry.
 * 2. Deducts wallet balance and auto-provisions a fresh voucher pass when expired.
 * 3. Alerts user if balance is insufficient and cancels future retries.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    renewed: 0,
    insufficient_funds: 0,
    reminders_sent: 0,
    errors: [],
  };

  try {
    // 1. Fetch active vouchers with auto_renew enabled and associated user
    const { data: vouchers, error: fetchErr } = await supabaseAdmin
      .from('vouchers')
      .select('id, user_id, voucher_code, profile_name, price, created_at, expires_at, auto_renew, renewal_notified, is_used')
      .eq('auto_renew', true)
      .not('user_id', 'is', null);

    if (fetchErr) {
      throw fetchErr;
    }

    if (!vouchers || vouchers.length === 0) {
      return NextResponse.json({ success: true, message: 'No auto-renew vouchers to process', results });
    }

    // Fetch plan details to know duration and prices
    const { data: allPlans } = await supabaseAdmin.from('plans').select('*');
    const plansMap = new Map((allPlans || []).map((p) => [p.name, p]));

    const now = Date.now();

    for (const voucher of vouchers) {
      try {
        const plan = plansMap.get(voucher.profile_name);
        const price = plan ? Number(plan.price) : Number(voucher.price || 0);

        // Approximate duration in seconds based on plan or default 24h
        let durationSeconds = 86400;
        if (plan?.duration) {
          const match = String(plan.duration).toLowerCase().match(/(\d+)\s*(h|d|m)?/);
          if (match) {
            const val = parseInt(match[1], 10);
            const unit = match[2] || 'h';
            if (unit === 'h') durationSeconds = val * 3600;
            else if (unit === 'd') durationSeconds = val * 86400;
            else if (unit === 'm') durationSeconds = val * 60;
          }
        }

        const createdAtTime = new Date(voucher.created_at).getTime();
        const calculatedExpiresAt = voucher.expires_at
          ? new Date(voucher.expires_at).getTime()
          : createdAtTime + durationSeconds * 1000;

        const timeLeftMs = calculatedExpiresAt - now;

        // Condition A: Pre-renewal notification (within 24 hours of expiry, but not expired yet)
        if (timeLeftMs > 0 && timeLeftMs <= 24 * 3600 * 1000 && !voucher.renewal_notified) {
          await supabaseAdmin.from('notifications').insert({
            user_id: voucher.user_id,
            title: 'Pass Auto-Renewal Tomorrow',
            message: `Your "${voucher.profile_name}" pass will auto-renew in less than 24 hours. Please ensure your wallet has at least ₦${price.toLocaleString()}.`,
            type: 'system',
          });

          await supabaseAdmin
            .from('vouchers')
            .update({ renewal_notified: true })
            .eq('id', voucher.id);

          results.reminders_sent++;
          continue;
        }

        // Condition B: Voucher has expired or is in the renewal grace window (<= 5 minutes left or already past)
        if (timeLeftMs <= 5 * 60 * 1000) {
          // Check user wallet balance
          const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', voucher.user_id)
            .maybeSingle();

          const currentBalance = wallet ? Number(wallet.balance) : 0;

          if (currentBalance < price) {
            // Insufficient funds: disable auto_renew and notify user
            await supabaseAdmin
              .from('vouchers')
              .update({ auto_renew: false })
              .eq('id', voucher.id);

            await supabaseAdmin.from('notifications').insert({
              user_id: voucher.user_id,
              title: 'Auto-Renewal Failed',
              message: `Could not auto-renew your "${voucher.profile_name}" pass due to insufficient wallet balance (₦${currentBalance.toLocaleString()} available, ₦${price.toLocaleString()} required).`,
              type: 'system',
            });

            results.insufficient_funds++;
            continue;
          }

          // Atomic wallet deduction
          const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('adjust_wallet_balance', {
            p_user_id: voucher.user_id,
            p_amount: price,
            p_operation: 'deduct',
          });

          if (rpcErr || Number(rpcResult) < 0) {
            results.errors.push(`Wallet deduction failed for user ${voucher.user_id}: ${rpcErr?.message}`);
            continue;
          }

          // Provision new voucher
          let newCode = await generateUniqueCode();
          const txRef = generateWalletTxRef();
          let isFallback = false;

          const mikrotikConfigured = await isMikroTikConfigured();
          if (mikrotikConfigured) {
            try {
              await createOrQueueHotspotUser({
                code: newCode,
                password: newCode,
                profile: voucher.profile_name,
                limitUptime: plan?.duration || '1d',
                comment: `Auto-Renew User ${voucher.user_id} - ${voucher.profile_name}`,
                shared_users: Number(plan?.devices) || 1,
              });
            } catch (rErr) {
              // Try fallback pool
              const { data: fallbackRows } = await supabaseAdmin.rpc('claim_fallback_voucher', {
                p_profile_name: voucher.profile_name,
                p_plan_id: plan?.id || null,
                p_user_id: voucher.user_id,
              });
              if (fallbackRows && fallbackRows.length > 0) {
                newCode = fallbackRows[0].voucher_code;
                isFallback = true;
              }
            }
          }

          // Insert new voucher record
          const { data: newTx } = await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: voucher.user_id,
              type: 'voucher_purchase',
              amount: price,
              status: 'successful',
              payment_method: 'wallet',
              metadata: {
                auto_renew: true,
                previous_voucher_code: voucher.voucher_code,
                plan_name: voucher.profile_name,
              },
            })
            .select('id')
            .single();

          await supabaseAdmin.from('vouchers').insert({
            user_id: voucher.user_id,
            voucher_code: newCode,
            profile_name: voucher.profile_name,
            price: price,
            transaction_id: newTx?.id || null,
            tx_ref: txRef,
            is_used: false,
            auto_renew: true, // Keep auto-renew alive on the new voucher
          });

          // Disable auto_renew on the OLD voucher so it doesn't process again
          await supabaseAdmin
            .from('vouchers')
            .update({ auto_renew: false })
            .eq('id', voucher.id);

          // Notify user
          await supabaseAdmin.from('notifications').insert({
            user_id: voucher.user_id,
            title: 'Pass Auto-Renewed! 🎉',
            message: `Your "${voucher.profile_name}" pass has been renewed. New PIN: ${newCode}. ₦${price.toLocaleString()} was deducted from your wallet balance.`,
            type: 'voucher_purchase',
          });

          logger.financial({
            action: 'auto_renew_purchase',
            amount: price,
            userId: voucher.user_id,
            ref: txRef,
            status: 'successful',
            details: { old_voucher: voucher.voucher_code, new_voucher: newCode },
          });

          results.renewed++;
        }
      } catch (innerErr) {
        results.errors.push(`Error on voucher ${voucher.voucher_code}: ${innerErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Auto-renew cron error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

function generateVoucherCode(length = 8) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, planId, quantity = 1 } = body;

    if (!userId || !planId) {
      return NextResponse.json({ error: 'Missing required parameters: userId and planId' }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(parseInt(quantity, 10) || 1, 100)); // Limit 1 to 100 per batch
    const supabase = supabaseServer();

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, reseller_discount, full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.role !== 'reseller' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied: User does not have reseller or admin privileges' }, { status: 403 });
    }

    // 2. Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 });
    }

    // 3. Compute wholesale pricing
    const discountPercent = Math.min(Math.max(Number(profile.reseller_discount) || 10, 0), 80); // e.g. 15%
    const retailPricePerUnit = Number(plan.price);
    const wholesalePricePerUnit = Math.round(retailPricePerUnit * (1 - discountPercent / 100));
    const totalCost = wholesalePricePerUnit * qty;
    const totalCommissionSaved = (retailPricePerUnit - wholesalePricePerUnit) * qty;

    // 4. Atomically deduct wallet balance
    const { data: deductionResult, error: walletRpcError } = await supabase.rpc('adjust_wallet_balance', {
      p_user_id: userId,
      p_amount: -totalCost
    });

    if (walletRpcError) {
      return NextResponse.json({ error: walletRpcError.message || 'Wallet balance adjustment failed' }, { status: 400 });
    }

    if (deductionResult && deductionResult.success === false) {
      return NextResponse.json({ error: deductionResult.error || 'Insufficient wallet balance for bulk purchase' }, { status: 400 });
    }

    // 5. Generate vouchers
    const vouchersToInsert = [];
    const now = new Date();
    const batchId = `reseller_${Date.now()}`;

    for (let i = 0; i < qty; i++) {
      const code = generateVoucherCode(8);
      vouchersToInsert.push({
        code,
        plan_id: plan.id,
        user_id: userId,
        status: 'active',
        created_at: now.toISOString(),
        metadata: {
          batch_id: batchId,
          reseller_id: userId,
          retail_price: retailPricePerUnit,
          wholesale_price: wholesalePricePerUnit,
          discount_percent: discountPercent
        }
      });
    }

    const { data: createdVouchers, error: voucherInsertError } = await supabase
      .from('vouchers')
      .insert(vouchersToInsert)
      .select();

    if (voucherInsertError) {
      // Refund wallet if insert fails
      await supabase.rpc('adjust_wallet_balance', { p_user_id: userId, p_amount: totalCost });
      return NextResponse.json({ error: 'Failed to generate vouchers. Wallet has been refunded.' }, { status: 500 });
    }

    // 6. Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'reseller_bulk_purchase',
      amount: totalCost,
      status: 'successful',
      payment_method: 'wallet',
      metadata: {
        batch_id: batchId,
        quantity: qty,
        plan_name: plan.name,
        discount_percent: discountPercent,
        total_commission_saved: totalCommissionSaved
      }
    });

    // 7. Record commission entry
    if (createdVouchers && createdVouchers.length > 0) {
      const commissionRecords = createdVouchers.map(v => ({
        reseller_id: userId,
        voucher_id: v.id,
        commission_amount: (retailPricePerUnit - wholesalePricePerUnit),
        status: 'paid',
        created_at: now.toISOString()
      }));
      await supabase.from('reseller_commissions').insert(commissionRecords);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${qty} wholesale voucher(s)`,
      batch_id: batchId,
      quantity: qty,
      unit_cost: wholesalePricePerUnit,
      total_cost: totalCost,
      total_saved: totalCommissionSaved,
      discount_percent: discountPercent,
      vouchers: createdVouchers.map(v => ({ id: v.id, code: v.code, plan_name: plan.name }))
    });

  } catch (error) {
    console.error('Error in reseller bulk purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

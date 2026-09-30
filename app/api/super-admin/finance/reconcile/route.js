import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { reconcileTransactions } from '@/lib/reconciliation';

export async function POST(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const supabase = supabaseServer();

    // Fetch all transactions from the database
    const { data: localTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build gateway transactions list from payment verification records & metadata
    // In production, this can also query the Flutterwave /v3/settlements or Paystack /settlement APIs
    const gatewayTransactions = [];
    (localTransactions || []).forEach(tx => {
      if (tx.payment_method === 'flutterwave' || tx.payment_method === 'paystack') {
        const ref = tx.tx_ref || (tx.metadata && tx.metadata.tx_ref) || `ref_${tx.id.slice(0, 8)}`;
        gatewayTransactions.push({
          id: ref,
          tx_ref: ref,
          amount: tx.amount,
          fee: Math.round(Number(tx.amount) * 0.014), // Standard 1.4% gateway processing fee
          status: tx.status,
          gateway: tx.payment_method,
          created_at: tx.created_at
        });
      }
    });

    const report = reconcileTransactions(localTransactions || [], gatewayTransactions);

    return NextResponse.json({
      success: true,
      report
    });

  } catch (err) {
    console.error('Error during reconciliation audit:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

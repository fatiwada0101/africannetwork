import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth.js';

export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();

    // 1. Concurrently fetch profiles, wallets, transactions, vouchers, and auth users
    const [profilesRes, walletsRes, txRes, vouchersRes, authRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('wallets').select('*'),
      supabaseAdmin.from('transactions').select('user_id, amount, type, status'),
      supabaseAdmin.from('vouchers').select('user_id, id, is_used, status'),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    ]);

    if (profilesRes.error) throw profilesRes.error;

    // 2. Build maps
    const emailMap = {};
    (authRes.data?.users || []).forEach(u => {
      emailMap[u.id] = u.email;
    });

    const walletMap = {};
    (walletsRes.data || []).forEach(w => {
      walletMap[w.user_id] = Number(w.balance) || 0;
    });

    const statsMap = {};
    (txRes.data || []).forEach(t => {
      if (!t.user_id) return;
      if (!statsMap[t.user_id]) statsMap[t.user_id] = { deposits: 0, spent: 0, count: 0 };
      if (t.status === 'successful') {
        statsMap[t.user_id].count++;
        if (t.type === 'wallet_topup') statsMap[t.user_id].deposits += (Number(t.amount) || 0);
        if (t.type === 'voucher_purchase') statsMap[t.user_id].spent += (Number(t.amount) || 0);
      }
    });

    const voucherCountMap = {};
    (vouchersRes.data || []).forEach(v => {
      if (v.user_id) {
        voucherCountMap[v.user_id] = (voucherCountMap[v.user_id] || 0) + 1;
      }
    });

    // 3. Assemble combined user records
    let users = (profilesRes.data || []).map(p => {
      const email = emailMap[p.id] || '—';
      const name = p.full_name || 'Customer';
      const phone = p.phone || '—';
      const walletBalance = walletMap[p.id] || 0;
      const userStats = statsMap[p.id] || { deposits: 0, spent: 0, count: 0 };

      return {
        id: p.id,
        name,
        email,
        phone,
        role: p.role || 'customer',
        wallet_balance: walletBalance,
        total_deposited: userStats.deposits,
        total_spent: userStats.spent,
        transactions_count: userStats.count,
        vouchers_count: voucherCountMap[p.id] || 0,
        created_at: p.created_at,
      };
    });

    // 4. Filter if search parameter provided
    if (search) {
      users = users.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.phone.toLowerCase().includes(search)
      );
    }

    // 5. Compute summary KPI metrics
    const totalUsers = users.length;
    const totalWalletBalance = users.reduce((sum, u) => sum + u.wallet_balance, 0);
    const totalDeposited = users.reduce((sum, u) => sum + u.total_deposited, 0);
    const totalSpent = users.reduce((sum, u) => sum + u.total_spent, 0);

    return NextResponse.json({
      users,
      summary: {
        totalUsers,
        totalWalletBalance,
        totalDeposited,
        totalSpent,
      },
    });
  } catch (error) {
    console.error('Super Admin users fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// POST — Admin manual wallet adjustment for customer support
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { user_id, amount, operation, note } = body;

    if (!user_id || !amount || !operation) {
      return NextResponse.json({ error: 'user_id, amount, and operation (add/subtract) are required' }, { status: 400 });
    }

    const numAmount = Math.abs(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount required' }, { status: 400 });
    }

    // Call atomic wallet adjustment RPC
    const { data: newBalance, error } = await supabaseAdmin.rpc('adjust_wallet_balance', {
      p_user_id: user_id,
      p_amount: numAmount,
      p_operation: operation === 'subtract' ? 'subtract' : 'add',
      p_ref: `ADMIN_ADJ_${Date.now()}`,
      p_desc: note || `Admin manual adjustment (${operation === 'subtract' ? 'Debit' : 'Credit'})`,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      message: `Successfully ${operation === 'subtract' ? 'debited' : 'credited'} ₦${numAmount}. New balance: ₦${newBalance}`,
    });
  } catch (error) {
    console.error('Admin wallet adjustment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to adjust wallet' }, { status: 500 });
  }
}

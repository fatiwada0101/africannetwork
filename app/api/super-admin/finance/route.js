import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth.js';

export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const typeFilter = searchParams.get('type') || 'all'; // 'all' | 'deposit' | 'purchase' | 'transfer'
    const exportAll = searchParams.get('export_all') === 'true';

    // 1. Fetch wallet liability (current total customer balances held)
    const { data: walletData } = await supabaseAdmin
      .from('wallets')
      .select('balance');
    const walletLiability = (walletData || []).reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

    // 2. Build summary query across transactions in the date range
    let summaryQuery = supabaseAdmin
      .from('transactions')
      .select('id, type, amount, status, payment_method, metadata, created_at')
      .eq('status', 'successful');

    if (startDate) {
      summaryQuery = summaryQuery.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      summaryQuery = summaryQuery.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: summaryRows, error: sumErr } = await summaryQuery;
    if (sumErr) throw sumErr;

    const allTx = summaryRows || [];

    // KPI Metrics Calculation
    let totalDeposits = 0;
    let depositCount = 0;
    let totalPurchases = 0;
    let purchaseCount = 0;
    let totalInflow = 0; // Total real cash collected from gateways (deposits + card purchases)

    const planMap = {};
    const dailyMap = {};

    allTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      const day = t.created_at ? t.created_at.split('T')[0] : 'unknown';

      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, count: 0, revenue: 0, deposits: 0, purchases: 0 };
      }
      dailyMap[day].count++;

      if (t.type === 'wallet_topup') {
        totalDeposits += amt;
        depositCount++;
        totalInflow += amt;
        dailyMap[day].deposits += amt;
        dailyMap[day].revenue += amt;
      } else if (t.type === 'voucher_purchase') {
        totalPurchases += amt;
        purchaseCount++;
        dailyMap[day].purchases += amt;
        if (t.payment_method === 'card' || t.payment_method === 'flutterwave' || t.payment_method === 'monnify') {
          totalInflow += amt;
          dailyMap[day].revenue += amt;
        }

        const planName = t.metadata?.plan_name || 'Wi-Fi Pass';
        if (!planMap[planName]) planMap[planName] = { name: planName, count: 0, revenue: 0 };
        planMap[planName].count++;
        planMap[planName].revenue += amt;
      }
    });

    const topPlan = Object.values(planMap).sort((a, b) => b.revenue - a.revenue)[0] || null;
    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    const avgOrderValue = purchaseCount > 0 ? totalPurchases / purchaseCount : 0;

    // 3. Build paginated query for ledger table
    let txQuery = supabaseAdmin
      .from('transactions')
      .select('id, user_id, type, amount, status, payment_method, flw_ref, metadata, created_at, profiles(full_name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (startDate) {
      txQuery = txQuery.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      txQuery = txQuery.lte('created_at', `${endDate}T23:59:59`);
    }

    if (typeFilter === 'deposit') {
      txQuery = txQuery.eq('type', 'wallet_topup');
    } else if (typeFilter === 'purchase') {
      txQuery = txQuery.eq('type', 'voucher_purchase');
    } else if (typeFilter === 'transfer') {
      txQuery = txQuery.eq('type', 'wallet_transfer');
    }

    let pagedTransactions = [];
    let matchingCount = 0;

    if (exportAll) {
      const { data, error } = await txQuery;
      if (error) throw error;
      pagedTransactions = data || [];
      matchingCount = pagedTransactions.length;
    } else {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, count, error } = await txQuery.range(from, to);
      if (error) throw error;
      pagedTransactions = data || [];
      matchingCount = count || 0;
    }

    // Client search filter if provided
    if (search) {
      const s = search.toLowerCase();
      pagedTransactions = pagedTransactions.filter(t => {
        const name = (t.profiles?.full_name || '').toLowerCase();
        const phone = (t.profiles?.phone || '').toLowerCase();
        const ref = (t.flw_ref || '').toLowerCase();
        const code = (t.metadata?.voucher_code || '').toLowerCase();
        const plan = (t.metadata?.plan_name || '').toLowerCase();
        return name.includes(s) || phone.includes(s) || ref.includes(s) || code.includes(s) || plan.includes(s);
      });
    }

    const totalPages = Math.ceil(matchingCount / limit) || 1;

    return NextResponse.json({
      transactions: pagedTransactions.map(t => ({
        id: t.id,
        date: t.created_at,
        type: t.type,
        type_label: t.type === 'wallet_topup' ? 'Deposit' : t.type === 'voucher_purchase' ? 'Pass Purchase' : 'Transfer',
        amount: Number(t.amount) || 0,
        payment_method: t.payment_method || 'card',
        status: t.status || 'successful',
        ref: t.flw_ref || (t.metadata?.ref) || '-',
        customer_name: t.profiles?.full_name || 'Guest / Unregistered',
        customer_phone: t.profiles?.phone || '',
        voucher_code: t.metadata?.voucher_code || '-',
        plan: t.metadata?.plan_name || (t.type === 'wallet_topup' ? 'Wallet Deposit' : '-'),
        duration: t.metadata?.duration || '',
      })),
      pagination: {
        page,
        limit,
        total: matchingCount,
        totalPages,
      },
      summary: {
        totalRevenue: totalInflow || totalDeposits, // Total cash inflow
        totalDeposits,
        depositCount,
        totalPassSales: totalPurchases,
        totalSales: purchaseCount,
        totalTransactions: allTx.length,
        walletLiability,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        topPlan,
      },
      dailyBreakdown,
    });
  } catch (error) {
    console.error('Finance API error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

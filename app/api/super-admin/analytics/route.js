import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const supabase = supabaseServer();

    // 1. Fetch vouchers, transactions, locations, profiles
    const [
      { data: vouchers, error: vErr },
      { data: transactions, error: tErr },
      { data: locations, error: lErr },
      { data: plans, error: pErr },
      { data: profiles, error: prErr }
    ] = await Promise.all([
      supabase.from('vouchers').select('id, plan_id, created_at, status, location_id, user_id'),
      supabase.from('transactions').select('id, amount, status, type, created_at, payment_method'),
      supabase.from('locations').select('id, name, city, state'),
      supabase.from('plans').select('id, name, price'),
      supabase.from('profiles').select('id, created_at, role')
    ]);

    if (vErr || tErr) {
      console.error('Analytics DB fetch error:', vErr || tErr);
    }

    const allVouchers = vouchers || [];
    const allTransactions = transactions || [];
    const allLocations = locations || [];
    const allPlans = plans || [];
    const allProfiles = profiles || [];

    // 2. Compute Total & Successful Revenue
    const successfulTx = allTransactions.filter(t => t.status === 'successful');
    const totalRevenue = successfulTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const arpu = allProfiles.length > 0 ? (totalRevenue / allProfiles.length) : 0;

    // 3. Plan Popularity Breakdown
    const planMap = new Map();
    allPlans.forEach(p => planMap.set(p.id, { name: p.name, price: Number(p.price) || 0, count: 0, revenue: 0 }));
    
    allVouchers.forEach(v => {
      if (planMap.has(v.plan_id)) {
        const item = planMap.get(v.plan_id);
        item.count += 1;
        item.revenue += item.price;
      }
    });
    const planPopularity = Array.from(planMap.values()).sort((a, b) => b.count - a.count);

    // 4. Hourly Purchase Distribution (0 to 23)
    const hourlyDistribution = Array(24).fill(0);
    allVouchers.forEach(v => {
      if (v.created_at) {
        const hour = new Date(v.created_at).getHours();
        hourlyDistribution[hour] += 1;
      }
    });

    // 5. Geographic Revenue & Traffic by Location
    const locationStats = allLocations.map(loc => {
      const locVouchers = allVouchers.filter(v => v.location_id === loc.id);
      const locRevenue = locVouchers.reduce((sum, v) => {
        const plan = allPlans.find(p => p.id === v.plan_id);
        return sum + (plan ? Number(plan.price) || 0 : 0);
      }, 0);

      return {
        id: loc.id,
        name: loc.name,
        city: loc.city || 'Unknown',
        vouchers_sold: locVouchers.length,
        revenue: locRevenue
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 6. User Retention & Cohort Breakdown
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const newUsersLast30 = allProfiles.filter(p => new Date(p.created_at).getTime() >= thirtyDaysAgo).length;
    const newUsersLast7 = allProfiles.filter(p => new Date(p.created_at).getTime() >= sevenDaysAgo).length;

    // Repeat buyers (users with > 1 voucher)
    const userVoucherCounts = new Map();
    allVouchers.forEach(v => {
      if (v.user_id) {
        userVoucherCounts.set(v.user_id, (userVoucherCounts.get(v.user_id) || 0) + 1);
      }
    });
    const repeatBuyers = Array.from(userVoucherCounts.values()).filter(cnt => cnt > 1).length;
    const repeatBuyerRate = allProfiles.length > 0 ? ((repeatBuyers / allProfiles.length) * 100).toFixed(1) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        total_revenue: totalRevenue,
        total_vouchers: allVouchers.length,
        total_users: allProfiles.length,
        arpu: Math.round(arpu),
        new_users_30d: newUsersLast30,
        new_users_7d: newUsersLast7,
        repeat_buyers: repeatBuyers,
        repeat_buyer_rate: Number(repeatBuyerRate)
      },
      plan_popularity: planPopularity,
      hourly_distribution: hourlyDistribution,
      locations: locationStats
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

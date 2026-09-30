import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { DEFAULT_SCHEDULER_RULES, getActiveRules, getWatDate } from '@/lib/scheduler';

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'scheduler_rules')
      .maybeSingle();

    let rules = DEFAULT_SCHEDULER_RULES;
    if (data && data.value) {
      rules = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }

    const activeRules = getActiveRules(rules);
    const watTime = getWatDate();

    return NextResponse.json({
      success: true,
      rules,
      active_rules: activeRules,
      wat_time: watTime.toISOString(),
      wat_hour: watTime.getHours(),
      wat_day: watTime.getDay()
    });
  } catch (error) {
    console.error('Error fetching scheduler rules:', error);
    return NextResponse.json({
      success: true,
      rules: DEFAULT_SCHEDULER_RULES,
      active_rules: getActiveRules(DEFAULT_SCHEDULER_RULES),
      wat_time: new Date().toISOString()
    });
  }
}

export async function PUT(request) {
  const auth = verifyAdminSession(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: 'Invalid payload: rules must be an array' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'scheduler_rules',
        value: rules,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduler rules updated successfully',
      rules,
      active_rules: getActiveRules(rules)
    });
  } catch (error) {
    console.error('Error saving scheduler rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

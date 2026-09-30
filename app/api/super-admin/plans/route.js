import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth';
import { validateBody, createPlanSchema, deletePlanSchema } from '@/lib/schemas';

// GET — fetch plans (active only for public, all plans for admin when requested)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const isAdmin = await validateAdminAuth(request);
    const showAll = url.searchParams.get('all') === 'true' && isAdmin;

    let query = supabaseAdmin
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!showAll) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST — create or update a plan (admin only)
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { data: plan, error: validationError } = await validateBody(createPlanSchema, request);
    if (validationError) return validationError;

    const { error } = await supabaseAdmin
      .from('plans')
      .upsert({
        id: plan.id,
        name: plan.name,
        speed: plan.speed || '',
        price: Number(plan.price),
        duration: plan.duration,
        popular: plan.popular || false,
        active: plan.active !== undefined ? plan.active : true,
        sort_order: plan.sort_order || 0,
        devices: Number(plan.devices) || 1,
        upload_speed: plan.upload_speed || '12M',
        download_speed: plan.download_speed || '12M',
      }, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Plan save error:', error);
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
  }
}

// DELETE — deactivate or remove a plan (admin only)
export async function DELETE(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { data: body, error: validationError } = await validateBody(deletePlanSchema, request);
    if (validationError) return validationError;

    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', body.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Plan delete error:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}


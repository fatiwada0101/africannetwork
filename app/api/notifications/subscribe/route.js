import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUserAuth } from '@/lib/user-auth';

/**
 * Push Notification Subscription Management (Phase 3.2)
 * POST /api/notifications/subscribe - Store browser push subscription
 * DELETE /api/notifications/subscribe - Unsubscribe
 */
export async function POST(request) {
  try {
    const user = await validateUserAuth(request);
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload: endpoint and keys are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: user?.id || null,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        created_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscription_id: data.id,
      message: 'Subscribed to web push notifications successfully',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required to unsubscribe' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

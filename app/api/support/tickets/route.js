import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateUserAuth } from '@/lib/user-auth';
import { validateAdminAuth } from '@/lib/admin-auth';

/**
 * GET /api/support/tickets
 * User retrieves their own tickets; Super-Admin retrieves all tickets.
 */
export async function GET(request) {
  try {
    const admin = await validateAdminAuth(request);
    const user = !admin ? await validateUserAuth(request) : null;

    if (!admin && !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*, profiles:user_id(email, full_name, phone)')
      .order('created_at', { ascending: false });

    if (!admin) {
      query = query.eq('user_id', user.id);
    } else {
      const { searchParams } = new URL(request.url);
      const statusFilter = searchParams.get('status');
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
    }

    const { data: tickets, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tickets: tickets || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/support/tickets
 * Creates a new customer support ticket.
 */
export async function POST(request) {
  try {
    const user = await validateUserAuth(request);
    const body = await request.json();
    const { subject, description, priority = 'medium', tx_ref, guest_email } = body;

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const ticketData = {
      user_id: user?.id || null,
      subject: subject.trim(),
      description: description.trim(),
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      tx_ref: tx_ref?.trim() || null,
      admin_notes: guest_email ? `Guest Contact: ${guest_email}` : null,
      status: 'open',
    };

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert(ticketData)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create confirmation notification if logged in user
    if (user) {
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: 'Support Ticket Created',
        message: `Your ticket "${subject}" has been received. Our team will review it shortly.`,
        type: 'system',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Support ticket submitted successfully. Our team will look into it promptly.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/support/tickets
 * Super-Admin updates ticket status, priority, or admin notes.
 */
export async function PATCH(request) {
  try {
    const admin = await validateAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Super Admin authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { ticket_id, status, priority, admin_notes } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { data: updated, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', ticket_id)
      .select('*, profiles:user_id(email, full_name)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If ticket was resolved or updated, notify user
    if (updated.user_id && (status === 'resolved' || status === 'closed')) {
      await supabaseAdmin.from('notifications').insert({
        user_id: updated.user_id,
        title: `Support Ticket ${status === 'resolved' ? 'Resolved' : 'Updated'}`,
        message: `Your ticket regarding "${updated.subject}" has been marked as ${status}.`,
        type: 'system',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

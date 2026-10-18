import { NextResponse } from 'next/server';
import { rebootRouter } from '@/lib/mikrotik';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth';
import { logChange } from '@/lib/changeHistory';

/**
 * POST /api/mikrotik/reboot
 * Reboots the MikroTik router via RouterOS REST API
 * Body: { router_id?: "uuid" }
 */
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const routerId = body.router_id || null;

    const result = await rebootRouter(routerId);

    // Log the reboot action to change history
    try {
      await logChange({
        category: 'mikrotik',
        action: 'reboot',
        summary: `Initiated MikroTik router restart via REST API${routerId ? ` (router: ${routerId})` : ''}`,
        beforeState: {},
        afterState: { rebooted_at: new Date().toISOString(), router_id: routerId },
      });
    } catch (logErr) {
      console.warn('Could not log router reboot to change history:', logErr.message);
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'MikroTik router is rebooting now.',
    });
  } catch (error) {
    console.error('MikroTik reboot error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reboot router',
      },
      { status: 502 }
    );
  }
}


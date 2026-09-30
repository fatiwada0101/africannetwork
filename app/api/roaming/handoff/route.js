import { NextResponse } from 'next/server.js';
import { executeRoamingHandoff, resolveConnectingRouter } from '@/lib/roaming.js';
import { logger } from '@/lib/logger.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { voucher_code, target_router_id, router_identity, mac, ip } = body;

    if (!voucher_code) {
      return NextResponse.json({ success: false, error: 'voucher_code is required' }, { status: 400 });
    }

    // Resolve router by identity if target_router_id not directly passed
    if (!target_router_id && router_identity) {
      const resolved = await resolveConnectingRouter({ routerIdentity: router_identity });
      if (resolved?.router?.id) {
        target_router_id = resolved.router.id;
      }
    }

    if (!target_router_id) {
      return NextResponse.json({ success: false, error: 'Target router could not be determined' }, { status: 400 });
    }

    const handoffResult = await executeRoamingHandoff({
      voucherCode: voucher_code,
      targetRouterId: target_router_id,
      clientMac: mac,
      clientIp: ip,
    });

    return NextResponse.json({
      success: true,
      message: `Roaming handoff successful for ${voucher_code}`,
      ...handoffResult,
    });
  } catch (err) {
    logger.error('API /roaming/handoff failed:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server.js';
import { checkRoamingStatus, resolveConnectingRouter } from '@/lib/roaming.js';
import { validateUserAuth } from '@/lib/user-auth.js';
import { logger } from '@/lib/logger.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const routerIdentity = searchParams.get('router');
    const clientMac = searchParams.get('mac');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    // 1. Identify user if logged in
    let userId = null;
    const authUser = await validateUserAuth(request).catch(() => null);
    if (authUser?.id) {
      userId = authUser.id;
    }

    // 2. Resolve connecting router
    const resolved = await resolveConnectingRouter({
      routerIdentity,
      lat,
      lon,
    });

    const targetRouterId = resolved?.router?.id || null;

    // 3. Check roaming eligibility & active passes
    const roamingStatus = await checkRoamingStatus({
      userId,
      clientMac,
      targetRouterId,
    });

    return NextResponse.json({
      success: true,
      resolvedRouter: resolved?.router ? {
        id: resolved.router.id,
        name: resolved.router.name,
        identity: resolved.router.identity,
        locationName: resolved.location?.name || 'Unknown Location',
        locationAddress: resolved.location?.address || '',
        distanceMeters: resolved.distanceMeters || null,
        method: resolved.resolutionMethod,
      } : null,
      ...roamingStatus,
    });
  } catch (err) {
    logger.error('API /roaming/check-status failed:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { router, mac, lat, lon, user_id } = body;

    let userId = user_id;
    if (!userId) {
      const authUser = await validateUserAuth(request).catch(() => null);
      if (authUser?.id) userId = authUser.id;
    }

    const resolved = await resolveConnectingRouter({
      routerIdentity: router,
      lat,
      lon,
    });

    const targetRouterId = resolved?.router?.id || null;

    const roamingStatus = await checkRoamingStatus({
      userId,
      clientMac: mac,
      targetRouterId,
    });

    return NextResponse.json({
      success: true,
      resolvedRouter: resolved?.router ? {
        id: resolved.router.id,
        name: resolved.router.name,
        identity: resolved.router.identity,
        locationName: resolved.location?.name || 'Unknown Location',
        locationAddress: resolved.location?.address || '',
        distanceMeters: resolved.distanceMeters || null,
        method: resolved.resolutionMethod,
      } : null,
      ...roamingStatus,
    });
  } catch (err) {
    logger.error('API /roaming/check-status POST failed:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

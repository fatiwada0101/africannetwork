import { NextResponse } from 'next/server.js';
import { validateAdminAuth, adminUnauthorizedResponse } from '@/lib/admin-auth.js';
import { getAllRouters } from '@/lib/mikrotik.js';

/**
 * GET /api/super-admin/routers/list
 * Lightweight endpoint for the global router selector dropdown.
 * Returns only the fields needed for the dropdown (id, name, status, location).
 */
export async function GET(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const routers = await getAllRouters();

    // Map to a lightweight shape for the dropdown
    const items = routers.map(r => ({
      id: r.id,
      name: r.name,
      identity: r.identity,
      status: r.status || 'offline',
      location_id: r.location_id || null,
      location_name: r.locations?.name || null,
      locations: r.locations || (r.location_name ? { name: r.location_name } : null),
      ip_address: r.ip_address,
      port: r.port,
      connection_mode: r.connection_mode,
      last_seen_at: r.last_seen_at,
      model: r.model,
      ros_version: r.ros_version,
    }));

    return NextResponse.json({ success: true, routers: items });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server.js';
import { getHotspotUsers, deleteHotspotUser, updateHotspotUser } from '@/lib/mikrotik.js';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth.js';

// GET — List all hotspot users on the router
export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const routerId = searchParams.get('router_id') || undefined;
    const users = await getHotspotUsers(routerId);
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Hotspot users fetch error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, users: [] },
      { status: 502 }
    );
  }
}

// DELETE — Remove a hotspot user from router (admin only)
export async function DELETE(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();
  try {
    const { user_id, router_id } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    await deleteHotspotUser(user_id, router_id || undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete hotspot user error:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 502 }
    );
  }
}

// PATCH — Update a hotspot user's properties (admin only)
export async function PATCH(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();
  try {
    const { user_id, router_id, ...updateData } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const result = await updateHotspotUser(user_id, updateData, router_id || undefined);
    return NextResponse.json({ success: true, user: result });
  } catch (error) {
    console.error('Update hotspot user error:', error.message);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 502 }
    );
  }
}

import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateAdminAuth, adminUnauthorizedResponse } from '@/lib/admin-auth.js';
import { logger } from '@/lib/logger.js';

export async function GET(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const { data: locations, error } = await supabaseAdmin
      .from('locations')
      .select('*, routers(*)')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, locations: locations || [] });
  } catch (err) {
    logger.error('GET /api/super-admin/locations error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const { name, address, latitude, longitude, coverage_radius_meters, contact_phone } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const { data: newLocation, error } = await supabaseAdmin
      .from('locations')
      .insert({
        name: name.trim(),
        address: address ? address.trim() : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        coverage_radius_meters: parseInt(coverage_radius_meters, 10) || 150,
        contact_phone: contact_phone ? contact_phone.trim() : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Created new hotspot location:', { location_id: newLocation.id, name: newLocation.name });
    return NextResponse.json({ success: true, location: newLocation });
  } catch (err) {
    logger.error('POST /api/super-admin/locations error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const { id, name, address, latitude, longitude, coverage_radius_meters, contact_phone, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Location ID is required' }, { status: 400 });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address?.trim() || null;
    if (latitude !== undefined) updates.latitude = parseFloat(latitude);
    if (longitude !== undefined) updates.longitude = parseFloat(longitude);
    if (coverage_radius_meters !== undefined) updates.coverage_radius_meters = parseInt(coverage_radius_meters, 10);
    if (contact_phone !== undefined) updates.contact_phone = contact_phone?.trim() || null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, location: updated });
  } catch (err) {
    logger.error('PUT /api/super-admin/locations error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Location ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Location deleted successfully' });
  } catch (err) {
    logger.error('DELETE /api/super-admin/locations error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

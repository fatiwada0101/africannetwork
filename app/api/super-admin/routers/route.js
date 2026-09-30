import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateAdminAuth, adminUnauthorizedResponse } from '@/lib/admin-auth.js';
import { sanitizeMikroTikConfig } from '@/lib/mikrotik.js';
import { logger } from '@/lib/logger.js';

export async function GET(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const { data: routers, error } = await supabaseAdmin
      .from('routers')
      .select('*, locations(id, name, address, latitude, longitude)')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, routers: routers || [] });
  } catch (err) {
    logger.error('GET /api/super-admin/routers error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const {
      name,
      identity,
      location_id,
      connection_mode,
      ip_address,
      port,
      username,
      password,
      use_ssl,
      dns_name,
      hotspot_server_name,
    } = body;

    if (!name || !identity) {
      return NextResponse.json(
        { success: false, error: 'Router name and MikroTik identity are required' },
        { status: 400 }
      );
    }

    const sanitized = sanitizeMikroTikConfig({
      ip: ip_address,
      port,
      user: username,
      pass: password,
      use_ssl,
      hotspot_url: dns_name,
    });

    const { data: newRouter, error } = await supabaseAdmin
      .from('routers')
      .insert({
        name: name.trim(),
        identity: identity.trim(),
        location_id: location_id || null,
        connection_mode: connection_mode === 'polling' ? 'polling' : 'direct',
        ip_address: sanitized.ip || null,
        port: parseInt(sanitized.port, 10) || 443,
        username: sanitized.user || 'admin',
        password: sanitized.pass || '',
        use_ssl: sanitized.use_ssl !== false,
        dns_name: sanitized.hotspot_url || 'asuktech.net',
        hotspot_server_name: hotspot_server_name ? hotspot_server_name.trim() : 'hotspot1',
        status: 'online',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Registered new MikroTik router:', { router_id: newRouter.id, identity: newRouter.identity });
    return NextResponse.json({ success: true, router: newRouter });
  } catch (err) {
    logger.error('POST /api/super-admin/routers error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await validateAdminAuth(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Router ID is required' }, { status: 400 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) updates.name = fields.name.trim();
    if (fields.identity !== undefined) updates.identity = fields.identity.trim();
    if (fields.location_id !== undefined) updates.location_id = fields.location_id || null;
    if (fields.connection_mode !== undefined) updates.connection_mode = fields.connection_mode;
    if (fields.ip_address !== undefined) updates.ip_address = fields.ip_address?.trim() || null;
    if (fields.port !== undefined) updates.port = parseInt(fields.port, 10);
    if (fields.username !== undefined) updates.username = fields.username?.trim();
    if (fields.password !== undefined) updates.password = fields.password;
    if (fields.use_ssl !== undefined) updates.use_ssl = Boolean(fields.use_ssl);
    if (fields.dns_name !== undefined) updates.dns_name = fields.dns_name?.trim();
    if (fields.hotspot_server_name !== undefined) updates.hotspot_server_name = fields.hotspot_server_name?.trim();
    if (fields.is_active !== undefined) updates.is_active = Boolean(fields.is_active);

    const { data: updated, error } = await supabaseAdmin
      .from('routers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, router: updated });
  } catch (err) {
    logger.error('PUT /api/super-admin/routers error:', { error: err.message });
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
      return NextResponse.json({ success: false, error: 'Router ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('routers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Router deleted successfully' });
  } catch (err) {
    logger.error('DELETE /api/super-admin/routers error:', { error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

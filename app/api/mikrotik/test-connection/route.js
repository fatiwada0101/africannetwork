import { NextResponse } from 'next/server.js';
import { testConnection, getHotspotProfiles, getMikroTikConfigForRouter, sanitizeMikroTikConfig, diagnoseConnectionError, recordConnectionLog, isPrivateIp } from '@/lib/mikrotik.js';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';

/**
 * GET /api/mikrotik/test-connection?router_id=xxx
 * Tests connection to either the default router (no param) or a specific router by ID.
 */
export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const routerId = searchParams.get('router_id');

  try {
    let result;

    if (routerId) {
      // Test a specific router from the routers table
      result = await testRouterConnection(routerId);
    } else {
      // Legacy: test the default single-router config
      result = await testConnection();
    }

    let profiles = [];
    if (result.connected) {
      try {
        const pList = await getHotspotProfiles(routerId || undefined);
        profiles = Array.isArray(pList) ? pList.map(p => p.name) : [];
      } catch (e) {
        console.warn('Could not fetch profiles during test-connection:', e.message);
      }
    }

    return NextResponse.json({
      ...result,
      profiles: result.profiles || profiles,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      success: false,
      error: error.message,
    });
  }
}

/**
 * Test connection to a specific router from the routers table.
 * Updates router status and last_seen_at on success.
 */
async function testRouterConnection(routerId) {
  const startTime = Date.now();
  const config = await getMikroTikConfigForRouter(routerId);

  const cleanIp = (config.ip || '').replace(/\/+$/, '');
  const target = `${config.protocol}://${cleanIp}:${config.port}`;

  if (!config.isConfigured) {
    const diag = diagnoseConnectionError(new Error('Router not configured'), config, 0);
    return {
      connected: false,
      success: false,
      duration_ms: 0,
      timestamp: new Date().toISOString(),
      target,
      router_id: routerId,
      router_name: config.router_name || null,
      diagnostics: diag,
      error: diag.summary,
      error_code: diag.errorCode,
    };
  }

  const url = `${config.protocol}://${cleanIp}:${config.port}/rest/system/resource`;
  const authStr = Buffer.from(`${config.user}:${config.pass}`).toString('base64');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authStr}`,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (res.status === 401) {
      const err = new Error(`Authentication failed for ${config.user}@${config.ip}`);
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Router returned status ${res.status}: ${text || res.statusText}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const routerInfo = {
      model: data['board-name'] || data.platform || 'MikroTik Router',
      version: data.version || 'RouterOS v7+',
      uptime: data.uptime || 'unknown',
      cpuLoad: data['cpu-load'] !== undefined ? `${data['cpu-load']}%` : 'unknown',
      freeMemory: data['free-memory'] ? `${Math.round(data['free-memory'] / 1024 / 1024)} MB` : 'unknown',
      ip: config.ip,
      port: config.port,
      protocol: config.protocol,
    };

    // Update router record in database with live data
    try {
      await supabaseAdmin
        .from('routers')
        .update({
          status: 'online',
          last_seen_at: new Date().toISOString(),
          model: routerInfo.model,
          ros_version: routerInfo.version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', routerId);
    } catch {}

    await recordConnectionLog({
      connected: true,
      durationMs,
      target,
      router_id: routerId,
      router_name: config.router_name,
      errorCode: 'OK',
      summary: `Connected to ${routerInfo.model} (${routerInfo.version}) in ${durationMs}ms`,
      routerInfo,
    });

    return {
      connected: true,
      success: true,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
      target,
      router_id: routerId,
      router_name: config.router_name || null,
      router: routerInfo,
      diagnostics: {
        errorCode: 'OK',
        summary: `Connected to ${routerInfo.model} (${routerInfo.version})`,
        details: `Router online. Latency: ${durationMs}ms.`,
        remediation: [],
        target,
        durationMs,
        isPrivateIp: isPrivateIp(config.ip),
      },
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const diag = diagnoseConnectionError(err, config, durationMs);

    // Mark router as offline
    try {
      await supabaseAdmin
        .from('routers')
        .update({ status: 'offline', updated_at: new Date().toISOString() })
        .eq('id', routerId);
    } catch {}

    await recordConnectionLog({
      connected: false,
      durationMs,
      target,
      router_id: routerId,
      router_name: config.router_name,
      errorCode: diag.errorCode,
      summary: diag.summary,
    });

    return {
      connected: false,
      success: false,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
      target,
      router_id: routerId,
      router_name: config.router_name || null,
      diagnostics: diag,
      error: diag.summary,
      error_code: diag.errorCode,
      details: diag.details,
      remediation: diag.remediation,
    };
  }
}

import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { checkMikroTikHealth, isMikroTikConfigured } from '@/lib/mikrotik.js';

export async function GET() {
  try {
    // Fetch settings and check router & fallback status concurrently
    const [settingsRes, healthRes, fallbackRes, configuredRes] = await Promise.allSettled([
      supabaseAdmin
        .from('app_settings')
        .select('key, value')
        .in('key', ['flutterwave', 'monnify', 'payment_gateway', 'branding', 'mikrotik']),
      checkMikroTikHealth(2500),
      supabaseAdmin
        .from('fallback_vouchers')
        .select('profile_name, plan_id')
        .eq('is_used', false)
        .or('status.is.null,status.eq.available'),
      isMikroTikConfigured(),
    ]);

    const settings = settingsRes.status === 'fulfilled' && settingsRes.value.data ? settingsRes.value.data : [];
    const mikrotikOnline = healthRes.status === 'fulfilled' ? !!healthRes.value : false;
    const mikrotikConfigured = configuredRes.status === 'fulfilled' ? !!configuredRes.value : false;
    const fallbackRows = fallbackRes.status === 'fulfilled' && fallbackRes.value.data ? fallbackRes.value.data : [];

    const fallbackCounts = {};
    for (const row of fallbackRows) {
      if (row.profile_name) {
        fallbackCounts[row.profile_name] = (fallbackCounts[row.profile_name] || 0) + 1;
      }
      if (row.plan_id) {
        fallbackCounts[row.plan_id] = (fallbackCounts[row.plan_id] || 0) + 1;
      }
    }
    const hasFallbackVouchers = fallbackRows.length > 0;

    let flwPublicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
    let flwEnabled = false;
    let monnifyApiKey = '';
    let monnifyContractCode = '';
    let monnifyEnabled = false;
    let monnifyIsTest = true;
    let activeGateway = 'flutterwave'; // default

    let branding = {
      app_name: 'African Network',
      logo_url: '',
      theme: 'violet',
      app_url: process.env.NEXT_PUBLIC_APP_URL || '',
    };

    let hotspotUrl = '';
    let wifiSsid = 'African Network Wi-Fi';

    if (settings) {
      for (const s of settings) {
        if (s.key === 'flutterwave' && s.value) {
          if (s.value.public_key) flwPublicKey = s.value.public_key;
          flwEnabled = !!s.value.enabled;
        }
        if (s.key === 'monnify' && s.value) {
          if (s.value.api_key) monnifyApiKey = s.value.api_key;
          if (s.value.contract_code) monnifyContractCode = s.value.contract_code;
          monnifyEnabled = !!s.value.enabled;
          monnifyIsTest = s.value.is_test !== false; // default to test mode
        }
        if (s.key === 'payment_gateway' && s.value) {
          activeGateway = s.value.active || 'flutterwave';
        }
        if (s.key === 'branding' && s.value) {
          branding = {
            app_name: s.value.app_name || branding.app_name,
            logo_url: s.value.logo_url || branding.logo_url,
            theme: s.value.theme || branding.theme,
            app_url: s.value.app_url || process.env.NEXT_PUBLIC_APP_URL || '',
          };
        }
        if (s.key === 'mikrotik' && s.value) {
          if (s.value.hotspot_url) hotspotUrl = s.value.hotspot_url.trim();
          if (s.value.wifi_ssid) wifiSsid = s.value.wifi_ssid.trim();
        }
      }
    }

    return NextResponse.json({
      activeGateway,
      flutterwave: {
        publicKey: flwPublicKey,
        enabled: flwEnabled,
      },
      monnify: {
        apiKey: monnifyApiKey,
        contractCode: monnifyContractCode,
        enabled: monnifyEnabled,
        isTest: monnifyIsTest,
      },
      branding,
      mikrotik: {
        configured: mikrotikConfigured,
        online: mikrotikOnline,
        has_fallback_vouchers: hasFallbackVouchers,
        fallback_counts: fallbackCounts,
        hotspot_url: hotspotUrl,
        wifi_ssid: wifiSsid,
      },
    });
  } catch (error) {
    return NextResponse.json({
      activeGateway: 'flutterwave',
      flutterwave: { publicKey: '', enabled: false },
      monnify: { apiKey: '', contractCode: '', enabled: false, isTest: true },
      branding: { app_name: 'African Network', logo_url: '', theme: 'violet' },
      mikrotik: {
        configured: false,
        online: false,
        has_fallback_vouchers: false,
        fallback_counts: {},
        hotspot_url: 'asuktech.net',
        wifi_ssid: 'African Network Wi-Fi',
      },
    });
  }
}

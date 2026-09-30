import { supabaseAdmin } from './supabase-server.js';
import { logger } from './logger.js';

/**
 * SMS Voucher Delivery Service (Feature 2.6)
 * Supports Termii SMS (Nigeria-focused) with automatic phone number formatting
 * and non-blocking asynchronous dispatch.
 */

export async function getSmsSettings() {
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'sms_settings')
      .maybeSingle();

    return {
      enabled: data?.value?.enabled === true,
      provider: data?.value?.provider || 'termii',
      apiKey: process.env.TERMII_API_KEY || data?.value?.api_key || '',
      senderId: data?.value?.sender_id || 'AsukTech',
    };
  } catch {
    return {
      enabled: false,
      provider: 'termii',
      apiKey: process.env.TERMII_API_KEY || '',
      senderId: 'AsukTech',
    };
  }
}

/**
 * Formats a Nigerian local phone (e.g. 08012345678) into international format (2348012345678)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Sends a voucher delivery SMS asynchronously (non-blocking)
 */
export async function sendVoucherSms({ phone, voucherCode, planName, wifiSsid = 'African Network Wi-Fi', duration = '' }) {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || !voucherCode) return { success: false, reason: 'invalid_recipient_or_code' };

  try {
    const settings = await getSmsSettings();
    if (!settings.enabled || !settings.apiKey) {
      // SMS delivery disabled in settings
      return { success: false, reason: 'sms_disabled' };
    }

    const message = `Your ${planName || 'Wi-Fi'} voucher PIN is: ${voucherCode}. Connect to "${wifiSsid}" and enter this PIN to surf.${duration ? ` Valid for ${duration}.` : ''}`;

    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formattedPhone,
        from: settings.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: settings.apiKey,
      }),
    });

    const data = await res.json();
    logger.info('SMS voucher dispatch', {
      phone: formattedPhone,
      voucher: voucherCode,
      status: data.message || 'sent',
    });

    return { success: res.ok, data };
  } catch (err) {
    logger.warn('SMS dispatch failed (non-fatal)', { error: err.message, phone: formattedPhone });
    return { success: false, error: err.message };
  }
}

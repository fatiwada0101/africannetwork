import crypto from 'crypto';
import { supabaseAdmin } from './supabase-server.js';

/**
 * Paystack Integration Helper (Phase 3.6)
 * Handles payment verification and HMAC webhook signature validation.
 */

export async function getPaystackConfig() {
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack')
      .maybeSingle();

    return {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || data?.value?.public_key || '',
      secretKey: process.env.PAYSTACK_SECRET_KEY || data?.value?.secret_key || '',
      enabled: data?.value?.enabled !== false,
    };
  } catch (err) {
    return {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      enabled: false,
    };
  }
}

export function verifyPaystackSignature(rawBody, signature, secretKey) {
  if (!signature || !secretKey) return false;
  try {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  } catch {
    return false;
  }
}

export async function verifyPaystackTransaction(reference) {
  const config = await getPaystackConfig();
  if (!config.secretKey) {
    throw new Error('Paystack secret key is not configured');
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Failed to verify transaction with Paystack');
  }

  return data.data; // { status, amount (kobo), currency, reference, customer, metadata }
}

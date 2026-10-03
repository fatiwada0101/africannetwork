import crypto from 'node:crypto';
import { Agent } from 'undici';
import { supabaseAdmin, broadcastWalletUpdate } from './supabase-server.js';
import { createOrQueueHotspotUser, isMikroTikConfigured } from './mikrotik.js';
import { sendVoucherSms } from './sms.js';

// The legacy router module permits self-signed router certificates globally.
// Payment credentials/results must always use a TLS-verifying dispatcher.
const monnifyDispatcher = new Agent({ connect: { rejectUnauthorized: true } });

export class PaymentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export async function getMonnifyConfig() {
  const { data, error } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'monnify').maybeSingle();
  if (error) throw new PaymentError('Unable to load payment configuration', 503);
  const value = data?.value || {};
  return {
    apiKey: (value.api_key || process.env.MONNIFY_API_KEY || '').trim(),
    secretKey: (value.secret_key || process.env.MONNIFY_SECRET_KEY || '').trim(),
    clientSecret: (value.client_secret || process.env.MONNIFY_CLIENT_SECRET || '').trim(),
    contractCode: (value.contract_code || '').trim(),
    enabled: value.enabled === true, isTest: value.is_test !== false,
  };
}

export function validMonnifySignature(rawBody, signature, secret) {
  if (!secret || !/^[a-f0-9]{128}$/i.test(signature || '')) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export async function queryMonnifyPayment(reference, config) {
  if (!config.apiKey || !config.secretKey) throw new PaymentError('Monnify credentials are missing', 503);
  const base = config.isTest ? 'https://sandbox.monnify.com' : 'https://api.monnify.com';
  const auth = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', cache: 'no-store', dispatcher: monnifyDispatcher, signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64')}` },
  });
  const authData = await auth.json();
  if (!auth.ok || !authData.requestSuccessful || !authData.responseBody?.accessToken) throw new PaymentError('Monnify authentication failed', 502);
  const response = await fetch(`${base}/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(reference)}`, {
    cache: 'no-store', dispatcher: monnifyDispatcher, signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${authData.responseBody.accessToken}` },
  });
  const result = await response.json();
  if (!response.ok || !result.requestSuccessful || !result.responseBody) throw new PaymentError('Unable to verify Monnify payment', 502);
  return result.responseBody;
}

export function validateMonnifyPayment(payment, intent) {
  if (payment.paymentStatus !== 'PAID') throw new PaymentError('Payment is not yet PAID');
  if (payment.paymentReference !== intent.reference || !payment.transactionReference) throw new PaymentError('Payment reference mismatch');
  if ((payment.currencyCode || payment.currency) !== 'NGN') throw new PaymentError('Invalid payment currency');
  const paid = Number(payment.amountPaid);
  if (!Number.isFinite(paid) || Math.round(paid * 100) !== Math.round(Number(intent.amount) * 100)) throw new PaymentError('Payment amount does not match the order');
}

async function rpc(name, args) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw new PaymentError('Payment could not be recorded. Please retry with the same reference.', 503);
  return data;
}

// Callback and signed webhook share the order and atomic settlement operation.
export async function fulfillMonnifyPayment(reference, { purpose, userId, transactionId } = {}) {
  if (!reference || typeof reference !== 'string') throw new PaymentError('Payment reference is required');
  const { data: intent, error } = await supabaseAdmin.from('monnify_payment_intents').select('*').eq('reference', reference).maybeSingle();
  if (error) throw new PaymentError('Payment storage is unavailable. Apply the Monnify migration.', 503);
  if (!intent) throw new PaymentError('Unknown payment order', 404);
  if (purpose && intent.purpose !== purpose) throw new PaymentError('Payment purpose mismatch');
  if (purpose && intent.user_id && intent.user_id !== userId) throw new PaymentError('This payment belongs to another user', 403);
  const config = await getMonnifyConfig();
  if (config.isTest !== intent.is_test || config.apiKey !== intent.api_key) throw new PaymentError('Payment configuration changed. Contact support with your reference.', 503);
  const payment = await queryMonnifyPayment(reference, config);
  validateMonnifyPayment(payment, intent);
  if (transactionId && String(transactionId) !== payment.transactionReference && String(transactionId) !== reference) throw new PaymentError('Transaction reference mismatch');
  const lease = crypto.randomUUID();
  const result = await rpc('settle_monnify_payment', { p_reference: reference, p_transaction_ref: payment.transactionReference, p_lease: lease });
  if (intent.purpose === 'wallet_topup') {
    if (!result.duplicate) await broadcastWalletUpdate(intent.user_id, Number(result.balance), { amount: Number(intent.amount), flw_ref: reference });
    return { success: true, reference, amount: Number(intent.amount), balance: Number(result.balance), duplicate: !!result.duplicate };
  }
  if (result.fulfilled) return { success: true, voucher_code: result.voucher_code, plan: intent.plan.name, price: Number(intent.amount), is_fallback: !!result.is_fallback, idempotent: true };
  if (!result.claimed) throw new PaymentError('Payment is recorded and voucher provisioning is in progress. Retry with the same reference.', 409);
  let code = result.voucher_code;
  let isFallback = !!result.is_fallback;
  let routerResult;
  try {
    if (!isFallback) {
      try {
        if (!(await isMikroTikConfigured())) throw new Error('Router not configured');
        routerResult = await createOrQueueHotspotUser({
          code, password: code, profile: intent.plan.name, limitUptime: intent.plan.duration,
          idempotencyKey: reference,
          comment: `Monnify order ${reference}`, shared_users: intent.plan.devices || 1,
          rate_limit: `${intent.plan.upload_speed || '12M'}/${intent.plan.download_speed || '12M'}`,
          expiry_mode: intent.plan.expiry_mode || 'elapsed', limit_bytes_total: intent.plan.limit_bytes_total,
        });
      } catch (routerError) {
        const fallback = await rpc('claim_monnify_fallback', { p_reference: reference, p_lease: lease });
        if (!fallback?.voucher_code) throw routerError;
        code = fallback.voucher_code;
        isFallback = true;
      }
    }
    await rpc('complete_monnify_voucher', { p_reference: reference, p_lease: lease });
    if (intent.phone) {
      try { await sendVoucherSms({ phone: intent.phone, voucherCode: code, planName: intent.plan.name, duration: intent.plan.duration }); } catch {}
    }
    return { success: true, voucher_code: code, plan: intent.plan.name, price: Number(intent.amount), is_fallback: isFallback, router_id: routerResult?.routerId || null };
  } catch {
    await supabaseAdmin.from('monnify_payment_intents').update({ lease_until: null, last_error: 'Voucher provisioning needs retry' }).eq('reference', reference).eq('lease_token', lease);
    throw new PaymentError('Payment is recorded, but the voucher is pending. Retry with the same reference or contact support.', 503);
  }
}

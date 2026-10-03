import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server.js';
import { validateUserAuth } from '@/lib/user-auth.js';
import { getMonnifyConfig, PaymentError } from '@/lib/monnify.js';

const schema = z.object({
  purpose: z.enum(['wallet_topup', 'voucher_purchase']),
  amount: z.coerce.number().min(100).max(10000000).optional(),
  plan_id: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(), phone: z.string().max(50).optional(), auto_renew: z.boolean().optional(),
});

export async function POST(request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new PaymentError('Invalid checkout details');
    const body = parsed.data;
    const user = await validateUserAuth(request);
    if (request.headers.get('authorization') && !user) throw new PaymentError('Please sign in again', 401);
    if (body.purpose === 'wallet_topup' && !user) throw new PaymentError('Sign in to fund your wallet', 401);
    const email = user?.email || body.email;
    if (!email) throw new PaymentError('A valid customer email is required');
    const config = await getMonnifyConfig();
    const { data: active, error: activeError } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'payment_gateway').maybeSingle();
    if (activeError || active?.value?.active !== 'monnify' || !config.enabled) throw new PaymentError('Monnify checkout is disabled', 503);
    if (!config.apiKey || !config.secretKey || !config.contractCode || (!config.isTest && !config.clientSecret)) throw new PaymentError('Monnify credentials and live webhook secret must be configured', 503);
    if (config.apiKey.startsWith('MK_PROD_') === config.isTest) throw new PaymentError('Monnify API key does not match the selected environment', 503);
    let amount = body.amount;
    let plan = null;
    if (body.purpose === 'voucher_purchase') {
      if (!body.plan_id) throw new PaymentError('Select a plan');
      const { data, error } = await supabaseAdmin.from('plans').select('*').eq('id', body.plan_id).maybeSingle();
      if (error) throw new PaymentError('Unable to load plan', 503);
      if (!data || data.active === false) throw new PaymentError('Plan is unavailable');
      const { data: settings, error: settingsError } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'hotspot_settings').maybeSingle();
      if (settingsError) throw new PaymentError('Unable to load hotspot settings', 503);
      amount = Number(data.price);
      plan = { ...data, expiry_mode: settings?.value?.expiry_mode || 'elapsed' };
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) throw new PaymentError('Invalid checkout amount');
    amount = Math.round(amount * 100) / 100;
    const reference = `MNF_${body.purpose === 'wallet_topup' ? 'TOPUP_' : ''}${crypto.randomUUID()}`;
    const { error } = await supabaseAdmin.from('monnify_payment_intents').insert({
      reference, purpose: body.purpose, user_id: user?.id || null, email, phone: body.phone || null,
      amount, plan, auto_renew: !!user && !!body.auto_renew, is_test: config.isTest, api_key: config.apiKey,
      voucher_code: body.purpose === 'voucher_purchase' ? crypto.randomInt(100000000000, 999999999999).toString() : null,
    });
    if (error) throw new PaymentError('Unable to create payment order. Apply the Monnify migration.', 503);
    return NextResponse.json({ reference, amount, email, apiKey: config.apiKey, contractCode: config.contractCode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : 'Unable to initialize payment' }, { status: error.status || 500 });
  }
}

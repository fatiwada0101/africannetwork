import { NextResponse } from 'next/server';
import { getMonnifyConfig, validMonnifySignature, fulfillMonnifyPayment } from '@/lib/monnify.js';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const config = await getMonnifyConfig();
    const signature = request.headers.get('monnify-signature');
    if (!config.isTest && !config.clientSecret) return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 503 });
    // Monnify omits signatures in sandbox. Such events still require a matching
    // server-owned sandbox intent AND a PAID response from the authenticated API.
    if ((!config.isTest || signature) && !validMonnifySignature(rawBody, signature, config.clientSecret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }
    let event;
    try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (event.eventType !== 'SUCCESSFUL_TRANSACTION') return NextResponse.json({ status: 'ignored' });
    const result = await fulfillMonnifyPayment(event.eventData?.paymentReference, { transactionId: event.eventData?.transactionReference });
    return NextResponse.json({ status: 'success', ...result });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : 'Webhook processing failed' }, { status: error.status || 503 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', service: 'Monnify Webhook' });
}

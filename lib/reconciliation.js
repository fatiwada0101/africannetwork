/**
 * Financial Reconciliation Engine (Phase 5.1)
 * Compares external payment gateway transactions (Flutterwave / Paystack)
 * against local database transactions to detect discrepancies and generate audit reports.
 */

export function reconcileTransactions(localTransactions = [], gatewayTransactions = []) {
  const localMap = new Map();
  const gatewayMap = new Map();

  // Index local transactions by tx_ref / reference / id
  localTransactions.forEach(t => {
    const ref = t.tx_ref || t.reference || (t.metadata && t.metadata.tx_ref) || t.id;
    if (ref) localMap.set(String(ref), t);
  });

  // Index gateway transactions
  gatewayTransactions.forEach(g => {
    const ref = g.tx_ref || g.reference || g.id;
    if (ref) gatewayMap.set(String(ref), g);
  });

  const matched = [];
  const missingInGateway = [];
  const missingLocally = [];
  const amountMismatches = [];

  let totalLocalVolume = 0;
  let totalGatewayVolume = 0;
  let totalFees = 0;

  // 1. Check local transactions against gateway
  localTransactions.forEach(t => {
    const ref = t.tx_ref || t.reference || (t.metadata && t.metadata.tx_ref) || t.id;
    const amount = Number(t.amount) || 0;
    if (t.status === 'successful') totalLocalVolume += amount;

    const gMatch = ref ? gatewayMap.get(String(ref)) : null;

    if (!gMatch) {
      if (t.payment_method !== 'wallet' && t.status === 'successful') {
        missingInGateway.push({
          local_id: t.id,
          reference: ref,
          amount: t.amount,
          date: t.created_at,
          reason: 'Recorded successful locally but not found in gateway records'
        });
      }
    } else {
      const gAmount = Number(gMatch.amount) || 0;
      if (Math.abs(amount - gAmount) > 1) { // 1 Naira tolerance for rounding
        amountMismatches.push({
          reference: ref,
          local_amount: amount,
          gateway_amount: gAmount,
          difference: amount - gAmount
        });
      } else {
        matched.push({
          reference: ref,
          amount: amount,
          gateway: gMatch.gateway || 'flutterwave',
          date: t.created_at
        });
      }
    }
  });

  // 2. Check gateway transactions missing locally
  gatewayTransactions.forEach(g => {
    const ref = g.tx_ref || g.reference || g.id;
    const amount = Number(g.amount) || 0;
    const fee = Number(g.app_fee || g.fee || 0);
    totalGatewayVolume += amount;
    totalFees += fee;

    const lMatch = ref ? localMap.get(String(ref)) : null;
    if (!lMatch && g.status === 'successful') {
      missingLocally.push({
        gateway_reference: ref,
        amount: amount,
        gateway: g.gateway || 'flutterwave',
        customer_email: g.customer?.email || g.customer_email || 'N/A',
        paid_at: g.created_at || g.paid_at,
        reason: 'Payment collected by gateway but no local transaction recorded'
      });
    }
  });

  const netSettlement = totalGatewayVolume - totalFees;
  const isBalanced = missingInGateway.length === 0 && missingLocally.length === 0 && amountMismatches.length === 0;

  return {
    reconciled_at: new Date().toISOString(),
    is_balanced: isBalanced,
    metrics: {
      total_local_volume: totalLocalVolume,
      total_gateway_volume: totalGatewayVolume,
      total_fees: totalFees,
      net_settlement: netSettlement,
      total_matched: matched.length,
      total_discrepancies: missingInGateway.length + missingLocally.length + amountMismatches.length
    },
    discrepancies: {
      missing_in_gateway: missingInGateway,
      missing_locally: missingLocally,
      amount_mismatches: amountMismatches
    },
    matched_sample: matched.slice(0, 20)
  };
}

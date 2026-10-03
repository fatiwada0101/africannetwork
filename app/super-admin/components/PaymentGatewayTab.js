'use client';

export default function PaymentGatewayTab({
  activeGateway,
  setActiveGateway,
  saveActiveGateway,
  flutterwaveForm,
  setFlutterwaveForm,
  saveFlutterwave,
  monnifyForm,
  setMonnifyForm,
  saveMonnify,
  webhookCopied,
  setWebhookCopied,
  showToast,
}) {
  return (
    <div className="sa-tab-body">

      {/* ═══ ACTIVE GATEWAY SELECTOR ═══ */}
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Active Payment Gateway</h3>
            <p className="sa-card-sub">Select the primary payment gateway for customer transactions</p>
          </div>
          <span className="sa-badge sa-badge-green">Active</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {/* Flutterwave Option */}
          <div
            onClick={() => setActiveGateway('flutterwave')}
            style={{
              flex: '1 1 200px',
              padding: '18px 16px',
              borderRadius: '16px',
              border: `2px solid ${activeGateway === 'flutterwave' ? '#F5A623' : 'rgba(255,255,255,0.06)'}`,
              background: activeGateway === 'flutterwave' ? 'rgba(245, 166, 35, 0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🦋</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: activeGateway === 'flutterwave' ? '#F5A623' : 'inherit' }}>
              Flutterwave
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
              Card, Bank Transfer, USSD
            </div>
            {activeGateway === 'flutterwave' && (
              <div style={{
                marginTop: '8px', fontSize: '11px', fontWeight: 700,
                color: '#F5A623', background: 'rgba(245, 166, 35, 0.12)',
                padding: '4px 10px', borderRadius: '8px', display: 'inline-block',
              }}>✓ Active</div>
            )}
          </div>

          {/* Monnify Option */}
          <div
            onClick={() => setActiveGateway('monnify')}
            style={{
              flex: '1 1 200px',
              padding: '18px 16px',
              borderRadius: '16px',
              border: `2px solid ${activeGateway === 'monnify' ? '#0066F5' : 'rgba(255,255,255,0.06)'}`,
              background: activeGateway === 'monnify' ? 'rgba(0, 102, 245, 0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏦</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: activeGateway === 'monnify' ? '#0066F5' : 'inherit' }}>
              Monnify
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
              Bank Transfer, Card, USSD, Phone
            </div>
            {activeGateway === 'monnify' && (
              <div style={{
                marginTop: '8px', fontSize: '11px', fontWeight: 700,
                color: '#0066F5', background: 'rgba(0, 102, 245, 0.12)',
                padding: '4px 10px', borderRadius: '8px', display: 'inline-block',
              }}>✓ Active</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="sa-btn-primary" onClick={saveActiveGateway}>
            Save Active Gateway
          </button>
        </div>
      </div>

      {/* ═══ FLUTTERWAVE CONFIGURATION ═══ */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Flutterwave Integration</h3>
            <p className="sa-card-sub">Enable online card payments and webhook verification</p>
          </div>
          <span className="sa-badge sa-badge-purple">Payments</span>
        </div>

        <div className="sa-form-grid-3">
          <div className="sa-field-box">
            <label>Public Key *</label>
            <input
              value={flutterwaveForm.public_key}
              onChange={e => setFlutterwaveForm({ ...flutterwaveForm, public_key: e.target.value })}
              placeholder="FLWPUBK_TEST-xxx"
            />
          </div>
          <div className="sa-field-box">
            <label>Secret Key *</label>
            <input
              type="password"
              value={flutterwaveForm.secret_key}
              onChange={e => setFlutterwaveForm({ ...flutterwaveForm, secret_key: e.target.value })}
              placeholder="FLWSECK_TEST-xxx"
            />
          </div>
          <div className="sa-field-box">
            <label>Webhook Secret Hash</label>
            <input
              value={flutterwaveForm.webhook_secret}
              onChange={e => setFlutterwaveForm({ ...flutterwaveForm, webhook_secret: e.target.value })}
              placeholder="Your webhook verification hash"
            />
          </div>
        </div>

        <div className="sa-ssl-check-row">
          <label className="sa-checkbox-label">
            <input
              type="checkbox"
              checked={flutterwaveForm.enabled}
              onChange={e => setFlutterwaveForm({ ...flutterwaveForm, enabled: e.target.checked })}
            />
            <span>Enable Live Flutterwave Checkout</span>
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="sa-btn-primary" onClick={saveFlutterwave}>Save Flutterwave Configuration</button>
        </div>
      </div>

      {/* ═══ MONNIFY CONFIGURATION ═══ */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Monnify Integration</h3>
            <p className="sa-card-sub">Accept bank transfers, card, USSD and phone payments via Monnify</p>
          </div>
          <span className="sa-badge sa-badge-blue" style={{ background: 'rgba(0, 102, 245, 0.15)', color: '#0066F5' }}>Monnify</span>
        </div>

        <div className="sa-form-grid-3">
          <div className="sa-field-box">
            <label>API Key *</label>
            <input
              value={monnifyForm.api_key}
              onChange={e => setMonnifyForm({ ...monnifyForm, api_key: e.target.value })}
              placeholder="MK_TEST_xxx or MK_PROD_xxx"
            />
          </div>
          <div className="sa-field-box">
            <label>Secret Key *</label>
            <input
              type="password"
              value={monnifyForm.secret_key}
              onChange={e => setMonnifyForm({ ...monnifyForm, secret_key: e.target.value })}
              placeholder="Your Monnify secret key"
            />
          </div>
          <div className="sa-field-box">
            <label>Contract Code *</label>
            <input
              value={monnifyForm.contract_code}
              onChange={e => setMonnifyForm({ ...monnifyForm, contract_code: e.target.value })}
              placeholder="e.g. 626609763141"
            />
          </div>
        </div>

        <div className="sa-form-grid-3" style={{ marginTop: 12 }}>
          <div className="sa-field-box">
            <label>Client Secret (required for live webhooks)</label>
            <input
              type="password"
              value={monnifyForm.client_secret}
              onChange={e => setMonnifyForm({ ...monnifyForm, client_secret: e.target.value })}
              placeholder="Used to verify webhook HMAC-SHA512 signature"
            />
          </div>
        </div>

        <div className="sa-ssl-check-row" style={{ gap: '16px', flexWrap: 'wrap' }}>
          <label className="sa-checkbox-label">
            <input
              type="checkbox"
              checked={monnifyForm.enabled}
              onChange={e => setMonnifyForm({ ...monnifyForm, enabled: e.target.checked })}
            />
            <span>Enable Monnify Checkout</span>
          </label>
          <label className="sa-checkbox-label">
            <input
              type="checkbox"
              checked={monnifyForm.is_test}
              onChange={e => setMonnifyForm({ ...monnifyForm, is_test: e.target.checked })}
            />
            <span>Sandbox/Test Mode</span>
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="sa-btn-primary" onClick={saveMonnify}>Save Monnify Configuration</button>
        </div>
      </div>

      {/* ═══ WEBHOOK URLS ═══ */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Webhook Configuration</h3>
            <p className="sa-card-sub">Set these URLs in your payment provider dashboard</p>
          </div>
        </div>

        {/* Flutterwave Webhook */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#F5A623' }}>Flutterwave Webhook URL</div>
          <div className="sa-webhook-url-box">
            <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/flutterwave` : '/api/webhook/flutterwave'}</code>
            <button className="sa-webhook-copy-btn" onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(`${window.location.origin}/api/webhook/flutterwave`);
                setWebhookCopied('flw');
                showToast('Flutterwave webhook URL copied!');
                setTimeout(() => setWebhookCopied(false), 2000);
              }
            }}>{webhookCopied === 'flw' ? '✓ Copied' : '📋 Copy'}</button>
          </div>
          <div className="sa-card-sub" style={{ padding: '0 4px', marginTop: 4, fontSize: '11px' }}>
            Paste in Flutterwave Dashboard → Settings → Webhooks
          </div>
        </div>

        {/* Monnify Webhook */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#0066F5' }}>Monnify Webhook URL (Transaction Completion)</div>
          <div className="sa-webhook-url-box">
            <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/monnify` : '/api/webhook/monnify'}</code>
            <button className="sa-webhook-copy-btn" onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(`${window.location.origin}/api/webhook/monnify`);
                setWebhookCopied('mnf');
                showToast('Monnify webhook URL copied!');
                setTimeout(() => setWebhookCopied(false), 2000);
              }
            }}>{webhookCopied === 'mnf' ? '✓ Copied' : '📋 Copy'}</button>
          </div>
          <div className="sa-card-sub" style={{ padding: '0 4px', marginTop: 4, fontSize: '11px' }}>
            Paste in Monnify Dashboard → Developer → Webhook URLs → Transaction Completion. Whitelist IP: <strong>35.242.133.146</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

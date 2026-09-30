'use client';

export default function PaymentGatewayTab({
  flutterwaveForm,
  setFlutterwaveForm,
  saveFlutterwave,
  webhookCopied,
  setWebhookCopied,
  showToast,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
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
          <button className="sa-btn-primary" onClick={saveFlutterwave}>Save Payment Configuration</button>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Webhook Configuration</h3>
            <p className="sa-card-sub">Set this URL in your Flutterwave dashboard under Settings → Webhooks</p>
          </div>
        </div>
        <div className="sa-webhook-url-box">
          <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/flutterwave` : '/api/webhook/flutterwave'}</code>
          <button className="sa-webhook-copy-btn" onClick={() => {
            if (typeof window !== 'undefined') {
              navigator.clipboard.writeText(`${window.location.origin}/api/webhook/flutterwave`);
              setWebhookCopied(true);
              showToast('Webhook URL copied!');
              setTimeout(() => setWebhookCopied(false), 2000);
            }
          }}>{webhookCopied ? '✓ Copied' : '📋 Copy'}</button>
        </div>
        <div className="sa-card-sub" style={{ padding: '0 4px', marginTop: 8 }}>
          <strong>Instructions:</strong> Copy this URL and paste it in Flutterwave Dashboard → Settings → Webhooks → Webhook URL. The webhook verifies payments and auto-credits wallets.
        </div>
      </div>
    </div>
  );
}

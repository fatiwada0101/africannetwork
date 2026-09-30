'use client';

import { useState } from 'react';
import { CheckIcon } from './Icons';

export default function VoucherGiftModal({ isOpen, onClose, voucherCode, planName, onGiftSuccess }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/vouchers/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_code: voucherCode,
          recipient_phone_or_email: recipient,
          gift_message: message,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setResult(data);
      if (onGiftSuccess) onGiftSuccess(data);
    } catch (err) {
      alert('Could not gift pass: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!result?.claim_link) return;
    navigator.clipboard.writeText(result.claim_link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="sa-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎁</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
              Gift This Wi-Fi Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckIcon size={28} />
            </div>

            <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary, #121217)' }}>
              Pass Gifted Successfully!
            </h4>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '0 0 20px', lineHeight: '1.4' }}>
              {result.message}
            </p>

            {result.claim_link && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--primary, #34A853)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🔗</span>
                  <span>{linkCopied ? 'Gift Link Copied!' : 'Copy Direct Gift Link'}</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                background: 'var(--surface-raised, #F3F4F6)',
                border: '1px solid var(--border, #E5E7EB)',
                color: 'var(--text-primary, #121217)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'var(--bg, #F9FAFB)',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: '1px solid var(--border-subtle, #F3F4F6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #9CA3AF)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Selected Pass
                </span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary, #121217)', fontSize: '14px' }}>
                  {planName || 'Wi-Fi Pass'}
                </span>
              </div>
              <code style={{ fontSize: '13px', color: '#34A853', fontWeight: 700 }}>{voucherCode}</code>
            </div>

            <div className="sa-form-group">
              <label>Friend Email or Phone Number *</label>
              <input
                type="text"
                className="sa-input"
                placeholder="e.g., friend@gmail.com or 08012345678"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="sa-form-group">
              <label>Personal Message (Optional)</label>
              <textarea
                className="sa-input"
                rows="2"
                placeholder="e.g., Enjoy fast surfing on me today!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="sa-action-btn sa-btn-outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sa-action-btn sa-btn-primary"
                disabled={loading}
              >
                {loading ? 'Transferring...' : '🎁 Send Gift Pass'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

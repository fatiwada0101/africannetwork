'use client';

import { useState } from 'react';
import { CheckIcon, ArrowUpRightIcon } from './Icons';

export default function WalletTransferModal({ isOpen, onClose, walletBalance, onSuccess }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const hasSufficient = walletBalance >= numAmount && numAmount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasSufficient) {
      setError('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_identifier: recipient.trim(),
          amount: numAmount,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete transfer');
      }

      setSuccessData(data);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setRecipient('');
    setAmount('');
    setNote('');
    setError('');
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="sa-modal-backdrop" onClick={resetAndClose} style={{ zIndex: 9999 }}>
      <div
        className="sa-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>💸</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
              Wallet-to-Wallet Transfer
            </h3>
          </div>
          <button
            onClick={resetAndClose}
            style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        {successData ? (
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

            <h4 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary, #121217)' }}>
              Transfer Complete!
            </h4>

            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', margin: '8px 0' }}>
              ₦{Number(successData.transferred_amount).toLocaleString()}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '0 0 20px', lineHeight: '1.4' }}>
              Sent to <strong>{successData.recipient}</strong>. Your updated balance is{' '}
              <strong>₦{Number(successData.sender_new_balance).toLocaleString()}</strong>.
            </p>

            <button
              onClick={resetAndClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--primary, #7257FF)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'rgba(114, 87, 255, 0.06)',
                padding: '12px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #71717a)', fontWeight: 600 }}>
                Available Balance
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--primary, #7257FF)' }}>
                ₦{Number(walletBalance || 0).toLocaleString()}
              </strong>
            </div>

            {error && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#B91C1C',
                  fontSize: '12px',
                  marginBottom: '14px',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div className="sa-form-group">
              <label>Recipient Email or Phone *</label>
              <input
                type="text"
                className="sa-input"
                placeholder="e.g. friend@gmail.com or 08012345678"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="sa-form-group">
              <label>Amount to Send (₦) *</label>
              <input
                type="number"
                step="100"
                min="100"
                max={walletBalance}
                className="sa-input"
                placeholder="e.g. 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="sa-form-group">
              <label>Transfer Note (Optional)</label>
              <input
                type="text"
                className="sa-input"
                placeholder="e.g. For your Wi-Fi subscription"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="sa-action-btn sa-btn-outline"
                onClick={resetAndClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sa-action-btn sa-btn-primary"
                disabled={loading || !hasSufficient || !recipient.trim()}
              >
                {loading ? 'Sending...' : `Send ₦${numAmount.toLocaleString()}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { DownloadIcon, CheckIcon, PrinterIcon } from './Icons';

export default function VoucherQrModal({ isOpen, onClose, voucherCode, planName, duration, price }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  const cleanCode = (voucherCode || '').trim();
  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login?code=${encodeURIComponent(cleanCode)}`
    : `https://asuktech.net/login?code=${encodeURIComponent(cleanCode)}`;

  useEffect(() => {
    if (isOpen && cleanCode) {
      QRCode.toDataURL(loginUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#121217',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, cleanCode, loginUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>African Network Voucher - ${cleanCode}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px dashed #34A853; border-radius: 16px; padding: 24px; max-width: 320px; margin: 0 auto; }
            h2 { color: #34A853; margin: 0 0 8px; }
            .code { font-family: monospace; font-size: 20px; font-weight: bold; background: #F3F4F6; padding: 8px 16px; border-radius: 8px; display: inline-block; margin: 12px 0; }
            img { width: 200px; height: 200px; }
            p { color: #666; font-size: 13px; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>African Network Wi-Fi Pass</h2>
            <p><strong>${planName || 'High-Speed Pass'}</strong> • ${duration || 'Active'}</p>
            <div class="code">${cleanCode}</div>
            <br />
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}
            <p>Scan with camera to connect instantly</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="sa-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '380px', textAlign: 'center', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
            Voucher QR Pass
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '0 0 16px' }}>
          Scan this QR code with any smartphone camera to connect to the Wi-Fi network instantly.
        </p>

        {/* QR Canvas / Image */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '16px',
            borderRadius: '16px',
            display: 'inline-block',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            marginBottom: '14px',
            border: '1px solid #E5E7EB',
          }}
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Voucher QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Generating QR...
            </div>
          )}
        </div>

        {/* Voucher Code Capsule */}
        <div
          style={{
            background: 'var(--bg, #F9FAFB)',
            padding: '10px 16px',
            borderRadius: '12px',
            fontFamily: 'monospace',
            fontSize: '17px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: 'var(--primary, #34A853)',
            marginBottom: '16px',
            border: '1px solid var(--border-subtle, #F3F4F6)',
          }}
        >
          {cleanCode}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '11px',
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
              gap: '6px',
            }}
          >
            {copied ? <CheckIcon size={15} /> : <span>🔗</span>}
            <span>{copied ? 'Login Link Copied!' : 'Copy Login Link'}</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`asuk-pass-${cleanCode}.png`}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--surface-raised, #F3F4F6)',
                  color: 'var(--text-primary, #121217)',
                  fontWeight: 700,
                  fontSize: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: '1px solid var(--border, #E5E7EB)',
                }}
              >
                <DownloadIcon size={14} /> <span>Save Image</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              style={{
                padding: '10px',
                borderRadius: '12px',
                background: 'var(--surface-raised, #F3F4F6)',
                color: 'var(--text-primary, #121217)',
                fontWeight: 700,
                fontSize: '12px',
                border: '1px solid var(--border, #E5E7EB)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <PrinterIcon size={14} /> <span>Print Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, ArrowUpRightIcon } from './Icons';

export default function ReferralCard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetch('/api/referrals')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setData(d);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user || !data) return null;

  const copyRefLink = () => {
    navigator.clipboard.writeText(data.referral_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(114, 87, 255, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1.5px solid rgba(114, 87, 255, 0.2)',
        borderRadius: '20px',
        padding: '18px 20px',
        margin: '18px 0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎁</span>
          <strong style={{ fontSize: '14px', color: 'var(--text-primary, #121217)' }}>
            Refer Friends, Earn ₦50
          </strong>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', background: '#DCFCE7', padding: '2px 8px', borderRadius: '999px' }}>
          Earn Wallet Bonus
        </span>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary, #71717a)', margin: '0 0 14px', lineHeight: '1.4' }}>
        Invite friends to surf on African Network Wi-Fi. When they make their first purchase, you get ₦50 automatically deposited into your wallet!
      </p>

      {/* Code strip & copy button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '6px 6px 6px 14px',
          border: '1px solid var(--border, #E5E7EB)',
          marginBottom: '12px',
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: 'var(--primary, #34A853)', letterSpacing: '1px' }}>
          {data.referral_code}
        </div>

        <button
          onClick={copyRefLink}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: copied ? '#10B981' : 'var(--primary, #34A853)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <CheckIcon size={14} /> : <span>📋</span>}
          <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Mini Stats */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px', color: 'var(--text-secondary, #71717a)' }}>
        <span>
          Invites: <strong style={{ color: 'var(--text-primary, #121217)' }}>{data.total_invites}</strong>
        </span>
        <span>
          Earned: <strong style={{ color: '#10B981' }}>₦{data.total_earned.toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}

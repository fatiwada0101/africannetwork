'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeftIcon,
  ShieldIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  WifiIcon,
  ArrowUpRightIcon,
  CheckIcon
} from '../../components/Icons';

export default function ResellerSignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    location: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/reseller/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create agent account');
      }

      setSuccess('Agent account registered! Signing you in...');

      // Auto sign in
      try {
        await signIn(form.email.trim(), form.password);
        router.push('/reseller');
      } catch {
        router.push('/auth');
      }

    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ maxWidth: '520px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Topbar */}
      <div className="screen-topbar">
        <Link href="/" className="circle-icon-btn" aria-label="Back">
          <ChevronLeftIcon size={20} color="var(--text-primary, #fff)" />
        </Link>
        <h1 className="screen-title">Agent Registration</h1>
        <div style={{ width: '40px' }} />
      </div>

      {/* Hero Banner */}
      <div style={{
        marginTop: '16px',
        padding: '24px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(16, 185, 129, 0.12))',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <WifiIcon size={28} color="#fff" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
          Become an Authorized Wi-Fi Agent
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: 0, lineHeight: 1.5 }}>
          Purchase Wi-Fi vouchers in bulk at wholesale discounts (up to 20% margin), print physical voucher slips, and earn steady daily income in your community.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px',
          color: '#10b981',
          fontWeight: 600
        }}>
          <span>✓ Wholesale Pricing</span>
          <span>✓ Instant Batch Pins</span>
          <span>✓ Printable Slips</span>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} style={{
        marginTop: '20px',
        padding: '24px',
        borderRadius: '20px',
        background: 'var(--card-bg, #1a1b23)',
        border: '1px solid var(--border-color, #2d3139)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#fff' }}>
          Agent Details
        </h3>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '12px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '12px' }}>
            {success}
          </div>
        )}

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Full Name (Owner / Representative)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Ibrahim Abubakar"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Business or Kiosk / Cyber Cafe Name
          </label>
          <input
            type="text"
            placeholder="e.g. CyberSpeed Hub & Communications"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
            <input
              type="tel"
              required
              placeholder="08012345678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>City / Location</label>
            <input
              type="text"
              placeholder="e.g. Ikeja, Lagos"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
          <input
            type="email"
            required
            placeholder="agent@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Password</label>
          <input
            type="password"
            required
            placeholder="Create a secure password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '13px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? 'Creating Account...' : 'Register as Authorized Agent →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth" style={{ color: '#3b82f6', fontWeight: 600 }}>
            Log in here
          </Link>
        </div>
      </form>
    </div>
  );
}

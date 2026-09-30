'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckIcon } from './Icons';

export default function SupportTicketModal({ isOpen, onClose, initialTxRef = '' }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [txRef, setTxRef] = useState(initialTxRef);
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [myTickets, setMyTickets] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  useEffect(() => {
    if (initialTxRef) {
      setTxRef(initialTxRef);
      if (!subject) setSubject(`Issue with Transaction ${initialTxRef}`);
    }
  }, [initialTxRef, subject]);

  // Fetch ticket history if authenticated
  useEffect(() => {
    if (isOpen && activeTab === 'history' && user) {
      setFetchingHistory(true);
      fetch('/api/support/tickets')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setMyTickets(d.tickets || []);
        })
        .catch(() => {})
        .finally(() => setFetchingHistory(false));
    }
  }, [isOpen, activeTab, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          priority,
          tx_ref: txRef.trim() || undefined,
          guest_email: !user ? guestEmail.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setPriority('medium');
    setTxRef('');
    setGuestEmail('');
    setSubmitted(false);
    setError('');
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'closed': return '#6B7280';
      default: return '#F59E0B'; // open
    }
  };

  return (
    <div className="sa-modal-backdrop" onClick={resetForm} style={{ zIndex: 9999 }}>
      <div
        className="sa-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎧</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
              Customer Helpdesk
            </h3>
          </div>
          <button
            onClick={resetForm}
            style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        {user && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('new'); setSubmitted(false); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'new' ? 'var(--primary, #7257FF)' : 'var(--bg, #F3F4F6)',
                color: activeTab === 'new' ? '#FFFFFF' : 'var(--text-secondary, #71717a)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Submit Ticket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'history' ? 'var(--primary, #7257FF)' : 'var(--bg, #F3F4F6)',
                color: activeTab === 'history' ? '#FFFFFF' : 'var(--text-secondary, #71717a)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              My Tickets
            </button>
          </div>
        )}

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
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

            <h4 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary, #121217)' }}>
              Ticket Submitted!
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '0 0 20px', lineHeight: '1.4' }}>
              We received your request. Our support engineers review inquiries rapidly and update your status in real time.
            </p>

            <button
              onClick={resetForm}
              style={{
                width: '100%',
                padding: '11px',
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
        ) : activeTab === 'history' ? (
          <div>
            {fetchingHistory ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '13px' }}>
                Loading tickets...
              </div>
            ) : myTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '13px' }}>
                No support tickets filed yet.
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg, #F9FAFB)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border, #E5E7EB)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary, #121217)' }}>
                        {t.subject}
                      </strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          color: getStatusColor(t.status),
                          background: `${getStatusColor(t.status)}18`,
                          textTransform: 'capitalize',
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary, #71717a)', margin: '4px 0' }}>
                      {t.description}
                    </p>
                    {t.admin_notes && (
                      <div style={{ fontSize: '11px', color: '#7257FF', marginTop: '6px', fontWeight: 600 }}>
                        💬 Support Response: {t.admin_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            {!user && (
              <div className="sa-form-group">
                <label>Your Email or Phone *</label>
                <input
                  type="text"
                  className="sa-input"
                  placeholder="e.g. user@gmail.com or 08012345678"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="sa-form-group">
              <label>Subject *</label>
              <input
                type="text"
                className="sa-input"
                placeholder="e.g. Payment successful but voucher not generated"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="sa-form-group">
              <label>Transaction Ref / Voucher Code (Optional)</label>
              <input
                type="text"
                className="sa-input"
                placeholder="e.g. FLW_172657... or PIN"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
              />
            </div>

            <div className="sa-form-group">
              <label>Issue Details *</label>
              <textarea
                className="sa-input"
                rows="3"
                placeholder="Please describe what happened..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="sa-action-btn sa-btn-outline"
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sa-action-btn sa-btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

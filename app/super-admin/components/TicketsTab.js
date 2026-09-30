'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshIcon } from '../../components/Icons';

export default function TicketsTab({ authHeaders }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/support/tickets${filter !== 'all' ? `?status=${filter}` : ''}`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, filter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateTicket = async (ticketId, newStatus, customNotes) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          status: newStatus,
          admin_notes: customNotes !== undefined ? customNotes : replyText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      showToast(`Ticket updated to ${newStatus}`);
      setSelectedTicket(null);
      setReplyText('');
      fetchTickets();
    } catch (err) {
      alert('Error updating ticket: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: { bg: '#FEF3C7', text: '#92400E' },
      in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
      resolved: { bg: '#DCFCE7', text: '#166534' },
      closed: { bg: '#F3F4F6', text: '#374151' },
    };
    const c = colors[status] || colors.open;
    return (
      <span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary, #121217)' }}>
            Customer Support Tickets
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: 0 }}>
            Resolve customer inquiries, payment verification requests, and network issues.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sa-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button
            className="sa-action-btn sa-btn-outline"
            onClick={fetchTickets}
            disabled={loading}
            title="Refresh tickets"
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface, #FFFFFF)', borderRadius: '16px', border: '1px solid var(--border, #E5E7EB)' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🎉</span>
          <strong style={{ display: 'block', fontSize: '16px' }}>No Support Tickets</strong>
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>There are currently no tickets matching the selected filter.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tickets.map((t) => (
            <div
              key={t.id}
              style={{
                background: 'var(--surface, #FFFFFF)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid var(--border, #E5E7EB)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary, #121217)' }}>{t.subject}</strong>
                    {getStatusBadge(t.status)}
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      Priority: <strong style={{ textTransform: 'uppercase' }}>{t.priority}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #71717a)' }}>
                    Customer: <strong>{t.profiles?.email || t.admin_notes || 'Guest'}</strong>
                    {t.profiles?.phone ? ` • ${t.profiles.phone}` : ''} • Created: {new Date(t.created_at).toLocaleString()}
                  </div>
                  {t.tx_ref && (
                    <div style={{ fontSize: '12px', color: 'var(--primary, #7257FF)', marginTop: '2px', fontFamily: 'monospace' }}>
                      Ref: {t.tx_ref}
                    </div>
                  )}
                </div>

                <button
                  className="sa-action-btn sa-btn-outline"
                  onClick={() => {
                    setSelectedTicket(t);
                    setReplyText(t.admin_notes || '');
                  }}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Manage / Reply
                </button>
              </div>

              <div style={{ background: 'var(--bg, #F9FAFB)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', color: 'var(--text-primary, #121217)', lineHeight: '1.4' }}>
                {t.description}
              </div>

              {t.admin_notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#166534', background: '#DCFCE7', padding: '8px 12px', borderRadius: '8px' }}>
                  <strong>Admin Response:</strong> {t.admin_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ticket Reply / Manage Modal */}
      {selectedTicket && (
        <div className="sa-modal-backdrop" onClick={() => setSelectedTicket(null)} style={{ zIndex: 9999 }}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                Respond to Ticket
              </h3>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ background: 'var(--bg, #F9FAFB)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Subject</div>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '6px' }}>{selectedTicket.subject}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #71717a)' }}>{selectedTicket.description}</div>
            </div>

            <div className="sa-form-group">
              <label>Admin Reply / Resolution Note</label>
              <textarea
                className="sa-input"
                rows="3"
                placeholder="Write message to user..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="sa-action-btn sa-btn-outline"
                onClick={() => handleUpdateTicket(selectedTicket.id, 'in_progress', replyText)}
                disabled={updating}
              >
                Mark In-Progress
              </button>
              <button
                className="sa-action-btn sa-btn-primary"
                onClick={() => handleUpdateTicket(selectedTicket.id, 'resolved', replyText)}
                disabled={updating}
                style={{ background: '#10B981' }}
              >
                {updating ? 'Saving...' : '✓ Resolve & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

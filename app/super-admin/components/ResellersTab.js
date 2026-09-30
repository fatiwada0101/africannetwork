'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshIcon } from '../../components/Icons';

export default function ResellersTab({ authHeaders }) {
  const [resellers, setResellers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({ total_resellers: 0, total_commissions_generated: 0 });
  const [loading, setLoading] = useState(true);
  const [editingReseller, setEditingReseller] = useState(null);
  const [discountVal, setDiscountVal] = useState(15);
  const [roleVal, setRoleVal] = useState('reseller');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchResellers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/resellers', { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setResellers(data.resellers || []);
        setCommissions(data.commissions || []);
        setStats(data.stats || { total_resellers: 0, total_commissions_generated: 0 });
      }
    } catch (err) {
      console.error('Error fetching resellers:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchResellers();
  }, [fetchResellers]);

  const handleSaveReseller = async () => {
    if (!editingReseller) return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/resellers', {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingReseller.id,
          role: roleVal,
          reseller_discount: Number(discountVal),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      showToast('Reseller updated successfully');
      setEditingReseller(null);
      fetchResellers();
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (val) =>
    '₦' +
    Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && <div className="toast show">{toast}</div>}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Reseller & Agent Network</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage wholesale agent tiers, discounts, bulk allocations, and commissions
          </p>
        </div>
        <button
          onClick={fetchResellers}
          className="refresh-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'var(--card-bg, #1a1b23)',
            border: '1px solid var(--border-color, #2d3139)',
            color: 'var(--text-primary, #fff)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          <RefreshIcon size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered Agents</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', marginTop: '6px' }}>{stats.total_resellers}</div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Commissions Generated</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            {formatMoney(stats.total_commissions_generated)}
          </div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Commission Logs Count</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginTop: '6px' }}>{commissions.length}</div>
        </div>
      </div>

      {/* Resellers List */}
      <div style={{ borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #2d3139)', fontWeight: 600, fontSize: '13px' }}>
          Active Resellers & Agents
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading agents...</div>
        ) : resellers.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No agents registered yet. Customers can be promoted to resellers below or in the Users tab.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color, #2d3139)' }}>
                  <th style={{ padding: '12px 16px' }}>Agent Name</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Wholesale Discount</th>
                  <th style={{ padding: '12px 16px' }}>Joined</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.full_name || 'Unnamed Agent'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{r.email || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: r.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: r.role === 'admin' ? '#3b82f6' : '#10b981',
                      }}>
                        {r.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981' }}>
                      {r.reseller_discount || 0}% OFF
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => {
                          setEditingReseller(r);
                          setDiscountVal(r.reseller_discount || 15);
                          setRoleVal(r.role || 'reseller');
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        Edit Tier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Reseller Modal */}
      {editingReseller && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1b23)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #2d3139)',
            padding: '24px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure Agent Tier</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Set wholesale discount and permissions for {editingReseller.full_name || editingReseller.email}
            </p>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Role</label>
              <select
                value={roleVal}
                onChange={(e) => setRoleVal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color, #2d3139)',
                  color: '#fff',
                  fontSize: '12px'
                }}
              >
                <option value="reseller">Reseller (Wholesale Access)</option>
                <option value="customer">Customer (Standard)</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Wholesale Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="80"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color, #2d3139)',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Agent pays retail price minus {discountVal}% for bulk purchases.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setEditingReseller(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #2d3139)',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReseller}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

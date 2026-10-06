'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshIcon, WalletIcon, UsersIcon } from '../../components/Icons';

export default function UsersTab({ adminHeaders, formatPrice, showToast }) {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalWalletBalance: 0, totalDeposited: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal for wallet adjustment
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustOp, setAdjustOp] = useState('add'); // 'add' | 'subtract'
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await fetch(`/api/super-admin/users${q}`, { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setSummary(data.summary || { totalUsers: 0, totalWalletBalance: 0, totalDeposited: 0, totalSpent: 0 });
      } else {
        showToast('Failed to load customers');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      showToast('Network error loading users');
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, search, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdjustWallet = async (e) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;
    const num = Number(adjustAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          amount: num,
          operation: adjustOp,
          note: adjustNote || `Admin ${adjustOp === 'add' ? 'credit' : 'debit'}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Wallet adjusted successfully!');
        setSelectedUser(null);
        setAdjustAmount('');
        setAdjustNote('');
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to adjust wallet');
      }
    } catch (err) {
      console.error('Adjust wallet error:', err);
      showToast('Network error');
    } finally {
      setAdjusting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="sa-tab-body">
      {/* Top Summary Cards */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card sa-kpi-hero">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Registered Customers</span>
            <div className="sa-kpi-icon-mini"><UsersIcon size={16} color="#7257FF" /></div>
          </div>
          <div className="sa-kpi-value">{summary.totalUsers}</div>
          <div className="sa-kpi-footer">Active platform accounts</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Total Wallet Balance</span>
            <div className="sa-kpi-icon-mini"><WalletIcon size={16} color="#10B981" /></div>
          </div>
          <div className="sa-kpi-value sa-color-green">{formatPrice(summary.totalWalletBalance)}</div>
          <div className="sa-kpi-footer">Customer balances in custody</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Total Deposits</span>
          </div>
          <div className="sa-kpi-value" style={{ color: '#60A5FA' }}>{formatPrice(summary.totalDeposited)}</div>
          <div className="sa-kpi-footer">Lifetime customer wallet funding</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Total Pass Spend</span>
          </div>
          <div className="sa-kpi-value" style={{ color: '#C4B5FD' }}>{formatPrice(summary.totalSpent)}</div>
          <div className="sa-kpi-footer">Spent by users on Wi-Fi passes</div>
        </div>
      </div>

      {/* Main Customers List */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="sa-card-title">Customer Accounts Directory</h3>
            <p className="sa-card-sub">Registered platform users, login emails, and wallet balances</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: '#1A1A24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: '0.85rem',
                minWidth: 260,
              }}
            />
            <button
              className="sa-btn-outline"
              onClick={fetchUsers}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.85rem' }}
            >
              <RefreshIcon size={14} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
            Loading customer accounts...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
            No customer accounts found matching your query.
          </div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Wallet Balance</th>
                  <th>Deposited</th>
                  <th>Spent</th>
                  <th>Activity</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7257FF, #34A853)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          color: '#fff',
                          flexShrink: 0
                        }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{u.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                            Joined {new Date(u.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <a href={`mailto:${u.email}`} style={{ color: '#C4B5FD', textDecoration: 'none', fontSize: '0.85rem' }}>
                        {u.email}
                      </a>
                    </td>

                    <td style={{ fontSize: '0.85rem', color: u.phone !== '—' ? '#fff' : '#8E8E93' }}>
                      {u.phone}
                    </td>

                    <td>
                      <span className="sa-badge" style={{
                        background: u.wallet_balance > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)',
                        color: u.wallet_balance > 0 ? '#10B981' : '#8E8E93',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}>
                        {formatPrice(u.wallet_balance)}
                      </span>
                    </td>

                    <td style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
                      {formatPrice(u.total_deposited)}
                    </td>

                    <td style={{ fontSize: '0.85rem', color: '#C4B5FD', fontWeight: 600 }}>
                      {formatPrice(u.total_spent)}
                    </td>

                    <td style={{ fontSize: '0.8rem', color: '#8E8E93' }}>
                      <div>{u.transactions_count} Tx</div>
                      <div>{u.vouchers_count} Pass{u.vouchers_count === 1 ? '' : 'es'}</div>
                    </td>

                    <td>
                      <span className="sa-badge" style={{
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                        background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'reseller' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(114, 87, 255, 0.15)',
                        color: u.role === 'admin' ? '#EF4444' : u.role === 'reseller' ? '#F59E0B' : '#C4B5FD',
                      }}>
                        {u.role}
                      </span>
                    </td>

                    <td>
                      <button
                        className="sa-btn-pill-small"
                        onClick={() => setSelectedUser(u)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(114, 87, 255, 0.15)', color: '#C4B5FD', border: '1px solid rgba(114, 87, 255, 0.3)' }}
                      >
                        Adjust Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Adjusting Wallet Balance */}
      {selectedUser && (
        <div className="sa-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="sa-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="sa-card-header">
              <div>
                <h3 className="sa-card-title">Adjust Customer Wallet</h3>
                <p className="sa-card-sub">{selectedUser.name} ({selectedUser.email})</p>
              </div>
              <button className="sa-btn-pill-small" onClick={() => setSelectedUser(null)}>✕</button>
            </div>

            <form onSubmit={handleAdjustWallet} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '12px 16px',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: '#8E8E93', fontSize: '0.85rem' }}>Current Balance</span>
                <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>{formatPrice(selectedUser.wallet_balance)}</strong>
              </div>

              <div className="sa-field-box">
                <label>Operation</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    className="sa-btn-outline"
                    onClick={() => setAdjustOp('add')}
                    style={{
                      flex: 1,
                      background: adjustOp === 'add' ? '#10B981' : 'transparent',
                      color: adjustOp === 'add' ? '#fff' : 'inherit',
                      borderColor: adjustOp === 'add' ? '#10B981' : 'rgba(255,255,255,0.12)',
                      padding: '8px 12px',
                    }}
                  >
                    + Credit (Add)
                  </button>
                  <button
                    type="button"
                    className="sa-btn-outline"
                    onClick={() => setAdjustOp('subtract')}
                    style={{
                      flex: 1,
                      background: adjustOp === 'subtract' ? '#EF4444' : 'transparent',
                      color: adjustOp === 'subtract' ? '#fff' : 'inherit',
                      borderColor: adjustOp === 'subtract' ? '#EF4444' : 'rgba(255,255,255,0.12)',
                      padding: '8px 12px',
                    }}
                  >
                    - Debit (Deduct)
                  </button>
                </div>
              </div>

              <div className="sa-field-box">
                <label>Amount (₦) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="1"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  required
                  style={{
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div className="sa-field-box">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Customer support resolution, deposit reconciliation"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  style={{
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="sa-btn-outline"
                  onClick={() => setSelectedUser(null)}
                  disabled={adjusting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={adjusting}
                  style={{
                    background: adjustOp === 'subtract' ? '#EF4444' : '#10B981',
                    borderColor: adjustOp === 'subtract' ? '#EF4444' : '#10B981',
                  }}
                >
                  {adjusting ? 'Processing...' : `Confirm ${adjustOp === 'add' ? 'Credit' : 'Debit'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

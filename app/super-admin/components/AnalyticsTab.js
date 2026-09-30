'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshIcon } from '../../components/Icons';

export default function AnalyticsTab({ authHeaders }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/analytics', { headers: authHeaders });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatMoney = (val) =>
    '₦' +
    Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const exportData = () => {
    if (!data) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `asuk_analytics_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Analytics dataset exported');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading business intelligence & analytics data...
      </div>
    );
  }

  const summary = data?.summary || {};
  const hourly = data?.hourly_distribution || Array(24).fill(0);
  const maxHourly = Math.max(...hourly, 1);
  const plans = data?.plan_popularity || [];
  const locations = data?.locations || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && <div className="toast show">{toast}</div>}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Advanced Business Intelligence</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Cohort retention, geographic multi-router revenue, and hourly demand analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportData}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            📥 Export Report
          </button>
          <button
            onClick={fetchAnalytics}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--card-bg, #1a1b23)',
              border: '1px solid var(--border-color, #2d3139)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <RefreshIcon size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Gross Volume</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {formatMoney(summary.total_revenue)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Across all gateways</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Revenue / User (ARPU)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>
            {formatMoney(summary.arpu)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Lifetime value</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Repeat Customer Rate</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#a855f7', marginTop: '4px' }}>
            {summary.repeat_buyer_rate}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{summary.repeat_buyers} repeat buyers</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>New Signups (30 Days)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            +{summary.new_users_30d}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>+{summary.new_users_7d} this week</div>
        </div>
      </div>

      {/* Hourly Sales Traffic Chart */}
      <div style={{ borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
          Voucher Purchase Velocity by Hour of Day (WAT Peak Analysis)
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '4px', paddingBottom: '20px', position: 'relative' }}>
          {hourly.map((count, hour) => {
            const heightPct = Math.max((count / maxHourly) * 100, 4);
            return (
              <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div
                  title={`${hour}:00 - ${count} vouchers`}
                  style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    background: count > 0 ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    transition: 'height 0.3s ease',
                  }}
                />
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', position: 'absolute', bottom: 0 }}>
                  {hour % 3 === 0 ? `${hour}h` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Locations & Plan Popularity Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Geographic Revenue */}
        <div style={{ borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
            Geographic Revenue Across Multi-Router Branches
          </div>
          {locations.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
              No location data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {locations.map((loc) => {
                const totalLocRev = summary.total_revenue || 1;
                const pct = Math.round((loc.revenue / totalLocRev) * 100);
                return (
                  <div key={loc.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{loc.name} ({loc.city})</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{formatMoney(loc.revenue)}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {loc.vouchers_sold} vouchers sold ({pct}% of network volume)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan Popularity */}
        <div style={{ borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
            Pass Tier Popularity Breakdown
          </div>
          {plans.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
              No plans data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plans.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatMoney(p.price)} / pass</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>{p.count} sold</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatMoney(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

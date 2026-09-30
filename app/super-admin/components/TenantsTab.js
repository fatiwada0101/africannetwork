'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshIcon } from '../../components/Icons';

export default function TenantsTab({ authHeaders }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    contact_email: '',
    brandName: '',
    themeColor: '#3b82f6',
    status: 'active'
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/tenants', { headers: authHeaders }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      } else {
        // Fallback fetch via tenant config
        const fallback = await fetch('/api/tenant/config');
        const d = await fallback.json();
        if (d.tenant) setTenants([d.tenant]);
      }
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      showToast('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/config', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          custom_domain: form.custom_domain || null,
          contact_email: form.contact_email || null,
          status: form.status,
          branding: {
            brandName: form.brandName || form.name,
            themeColor: form.themeColor,
            supportEmail: form.contact_email || 'support@africannetwork.com'
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save tenant');

      showToast('Tenant saved successfully');
      setModalOpen(false);
      fetchTenants();
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && <div className="toast show">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>White-Label Multi-Tenant SaaS</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage branded tenant instances, custom domains, and isolated ISP configurations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setForm({
                name: '',
                slug: '',
                custom_domain: '',
                contact_email: '',
                brandName: '',
                themeColor: '#3b82f6',
                status: 'active'
              });
              setModalOpen(true);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Tenant
          </button>
          <button
            onClick={fetchTenants}
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

      {/* Tenants Table */}
      <div style={{ borderRadius: '12px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #2d3139)', fontWeight: 600, fontSize: '13px' }}>
          Registered SaaS Organizations
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tenants...</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No tenants configured.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color, #2d3139)' }}>
                  <th style={{ padding: '12px 16px' }}>Organization</th>
                  <th style={{ padding: '12px 16px' }}>Slug / Subdomain</th>
                  <th style={{ padding: '12px 16px' }}>Custom Domain</th>
                  <th style={{ padding: '12px 16px' }}>Contact Email</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id || t.slug} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.slug}.africannetwork.com
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px', color: t.custom_domain ? '#3b82f6' : 'var(--text-muted)' }}>
                      {t.custom_domain || 'None (Default)'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t.contact_email || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: t.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.status === 'active' ? '#10b981' : '#ef4444'
                      }}>
                        {t.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      {modalOpen && (
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
          <form onSubmit={handleSaveTenant} style={{
            background: 'var(--card-bg, #1a1b23)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #2d3139)',
            padding: '24px',
            maxWidth: '460px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Provision SaaS Tenant</h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tenant Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Hotspot Services"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Slug (Subdomain)</label>
              <input
                type="text"
                required
                placeholder="e.g. apex"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Custom Domain (Optional)</label>
              <input
                type="text"
                placeholder="e.g. wifi.apexhotspot.com"
                value={form.custom_domain}
                onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Admin / Support Email</label>
              <input
                type="email"
                placeholder="admin@apexhotspot.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color, #2d3139)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 18px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                {saving ? 'Creating...' : 'Provision Tenant'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

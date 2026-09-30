'use client';

import { useState, useEffect } from 'react';
import {
  GlobeIcon,
  PlusIcon,
  CpuIcon,
  CheckIcon,
  TrashIcon,
  EditPencilIcon,
  RefreshIcon,
  SearchIcon,
  ExternalLinkIcon,
  ZapIcon,
} from '../../components/Icons';

export default function LocationsTab({ adminHeaders, showToast }) {
  const [locations, setLocations] = useState([]);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingRouter, setEditingRouter] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Form states
  const [locForm, setLocForm] = useState({
    name: '',
    address: '',
    latitude: '6.5243793',
    longitude: '3.3792057',
    coverage_radius_meters: 150,
  });

  const [routerForm, setRouterForm] = useState({
    name: '',
    identity: '',
    location_id: '',
    connection_mode: 'direct',
    ip_address: '',
    port: 443,
    username: 'admin',
    password: '',
    use_ssl: true,
    dns_name: 'asuktech.net',
    hotspot_server_name: 'hotspot1',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, routerRes] = await Promise.all([
        fetch('/api/super-admin/locations', { headers: adminHeaders() }),
        fetch('/api/super-admin/routers', { headers: adminHeaders() }),
      ]);

      const [locData, routerData] = await Promise.all([locRes.json(), routerRes.json()]);

      if (locData.success) setLocations(locData.locations || []);
      if (routerData.success) setRouters(routerData.routers || []);
    } catch (err) {
      showToast?.('Error loading locations: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      showToast?.('Geolocation is not supported by your browser', 'error');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGpsDetecting(false);
        showToast?.('GPS coordinates detected successfully!', 'success');
      },
      (err) => {
        setGpsDetecting(false);
        showToast?.('Could not get GPS: ' + err.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingLocation);
      const url = '/api/super-admin/locations';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { id: editingLocation.id, ...locForm } : locForm;

      const res = await fetch(url, {
        method,
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast?.(isEdit ? 'Location updated!' : 'Location created!', 'success');
      setShowLocationModal(false);
      setEditingLocation(null);
      fetchData();
    } catch (err) {
      showToast?.('Failed saving location: ' + err.message, 'error');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to delete this location? Associated routers will be unlinked.')) return;
    try {
      const res = await fetch(`/api/super-admin/locations?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast?.('Location deleted', 'success');
      fetchData();
    } catch (err) {
      showToast?.('Failed deleting location: ' + err.message, 'error');
    }
  };

  const handleSaveRouter = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingRouter);
      const url = '/api/super-admin/routers';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { id: editingRouter.id, ...routerForm } : routerForm;

      const res = await fetch(url, {
        method,
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast?.(isEdit ? 'Router updated!' : 'Router registered!', 'success');
      setShowRouterModal(false);
      setEditingRouter(null);
      fetchData();
    } catch (err) {
      showToast?.('Failed saving router: ' + err.message, 'error');
    }
  };

  const handleDeleteRouter = async (id) => {
    if (!confirm('Are you sure you want to remove this router?')) return;
    try {
      const res = await fetch(`/api/super-admin/routers?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast?.('Router removed', 'success');
      fetchData();
    } catch (err) {
      showToast?.('Failed removing router: ' + err.message, 'error');
    }
  };

  const onlineRoutersCount = routers.filter((r) => r.status === 'online').length;

  return (
    <div className="sa-tab-body">
      {/* KPI Cards Header */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <span className="sa-kpi-label">Active Locations</span>
          <span className="sa-kpi-val">{locations.length}</span>
          <span className="sa-kpi-sub">Geofenced Hotspot Sites</span>
        </div>
        <div className="sa-kpi-card">
          <span className="sa-kpi-label">MikroTik Router Fleet</span>
          <span className="sa-kpi-val">{routers.length}</span>
          <span className="sa-kpi-sub">{onlineRoutersCount} Online / Connected</span>
        </div>
        <div className="sa-kpi-card sa-kpi-hero">
          <span className="sa-kpi-label">Smart Roaming Status</span>
          <span className="sa-kpi-val" style={{ color: '#10B981', fontSize: '20px' }}>
            Active &amp; Unified
          </span>
          <span className="sa-kpi-sub">Cross-Location Vouchers Enabled</span>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
            Hotspot Locations &amp; Coverage Areas
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '4px 0 0' }}>
            Users can purchase passes at any branch and roam across all locations seamlessly.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sa-action-btn sa-btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshIcon size={15} /> <span>Refresh</span>
          </button>
          <button
            className="sa-action-btn sa-btn-outline"
            onClick={() => {
              setEditingRouter(null);
              setRouterForm({
                name: '',
                identity: '',
                location_id: locations[0]?.id || '',
                connection_mode: 'direct',
                ip_address: '',
                port: 443,
                username: 'admin',
                password: '',
                use_ssl: true,
                dns_name: 'asuktech.net',
                hotspot_server_name: 'hotspot1',
              });
              setShowRouterModal(true);
            }}
          >
            <CpuIcon size={15} /> <span>Add Router</span>
          </button>
          <button
            className="sa-action-btn sa-btn-primary"
            onClick={() => {
              setEditingLocation(null);
              setLocForm({
                name: '',
                address: '',
                latitude: '6.5243793',
                longitude: '3.3792057',
                coverage_radius_meters: 150,
              });
              setShowLocationModal(true);
            }}
          >
            <PlusIcon size={15} /> <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Locations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {locations.map((loc) => {
          const locRouters = routers.filter((r) => r.location_id === loc.id);
          const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

          return (
            <div
              key={loc.id}
              style={{
                background: 'var(--surface, #FFFFFF)',
                border: '1px solid var(--border, #E5E7EB)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #121217)' }}>
                    📍 {loc.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: loc.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: loc.is_active ? '#10B981' : '#EF4444',
                    }}
                  >
                    {loc.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)', margin: '8px 0 12px' }}>
                  {loc.address || 'No street address provided'}
                </p>

                {/* GPS Coordinates & Map Link */}
                <div
                  style={{
                    background: 'var(--bg, #F9FAFB)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    border: '1px solid var(--border-subtle, #F3F4F6)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted, #9CA3AF)', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      GPS Coordinates &amp; Geofence
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary, #121217)' }}>
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)} ({loc.coverage_radius_meters}m radius)
                    </span>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#7257FF', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
                  >
                    Map <ExternalLinkIcon size={12} />
                  </a>
                </div>

                {/* Associated Routers */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #9CA3AF)', display: 'block', marginBottom: '6px' }}>
                    Connected MikroTik Routers ({locRouters.length})
                  </span>
                  {locRouters.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#F59E0B', fontStyle: 'italic' }}>
                      ⚠️ No routers assigned to this location yet
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {locRouters.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--surface-raised, #FAFAFA)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            border: '1px solid var(--border-subtle, #F3F4F6)',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text-primary, #121217)' }}>
                            ⚡ {r.name} <code style={{ fontSize: '11px', color: '#7257FF' }}>({r.identity})</code>
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: r.status === 'online' ? '#DCFCE7' : '#FEE2E2',
                              color: r.status === 'online' ? '#166534' : '#991B1B',
                            }}
                          >
                            {r.status?.toUpperCase()} ({r.connection_mode})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border, #F3F4F6)' }}>
                <button
                  className="sa-btn-icon"
                  title="Edit Location"
                  onClick={() => {
                    setEditingLocation(loc);
                    setLocForm({
                      name: loc.name,
                      address: loc.address || '',
                      latitude: String(loc.latitude),
                      longitude: String(loc.longitude),
                      coverage_radius_meters: loc.coverage_radius_meters || 150,
                    });
                    setShowLocationModal(true);
                  }}
                >
                  <EditPencilIcon size={14} />
                </button>
                <button
                  className="sa-btn-icon sa-btn-danger"
                  title="Delete Location"
                  onClick={() => handleDeleteLocation(loc.id)}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Router Fleet Inventory Table */}
      <div style={{ background: 'var(--surface, #FFFFFF)', border: '1px solid var(--border, #E5E7EB)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary, #121217)' }}>
          MikroTik Fleet Inventory
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sa-table">
            <thead>
              <tr>
                <th>Router Name</th>
                <th>Identity Tag</th>
                <th>Location</th>
                <th>Mode</th>
                <th>IP / Host</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>
                    No routers configured yet.
                  </td>
                </tr>
              ) : (
                routers.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>
                      <code>{r.identity}</code>
                    </td>
                    <td>{r.locations?.name || 'Unassigned'}</td>
                    <td>
                      <span className="sa-badge">{r.connection_mode}</span>
                    </td>
                    <td>{r.connection_mode === 'direct' ? `${r.ip_address}:${r.port}` : 'Polling Agent'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: r.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: r.status === 'online' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="sa-btn-icon"
                          title="Edit Router"
                          onClick={() => {
                            setEditingRouter(r);
                            setRouterForm({
                              name: r.name,
                              identity: r.identity,
                              location_id: r.location_id || '',
                              connection_mode: r.connection_mode || 'direct',
                              ip_address: r.ip_address || '',
                              port: r.port || 443,
                              username: r.username || 'admin',
                              password: r.password || '',
                              use_ssl: Boolean(r.use_ssl),
                              dns_name: r.dns_name || 'asuktech.net',
                              hotspot_server_name: r.hotspot_server_name || 'hotspot1',
                            });
                            setShowRouterModal(true);
                          }}
                        >
                          <EditPencilIcon size={14} />
                        </button>
                        <button
                          className="sa-btn-icon sa-btn-danger"
                          title="Remove Router"
                          onClick={() => handleDeleteRouter(r.id)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="sa-modal-backdrop">
          <div className="sa-modal" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>
              {editingLocation ? 'Edit Hotspot Location' : 'Add New Hotspot Location'}
            </h3>
            <form onSubmit={handleSaveLocation}>
              <div className="sa-form-group">
                <label>Location Name *</label>
                <input
                  type="text"
                  className="sa-input"
                  placeholder="e.g., Campus Library Branch"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="sa-form-group">
                <label>Physical Address</label>
                <input
                  type="text"
                  className="sa-input"
                  placeholder="e.g., 24 University Way, Lagos"
                  value={locForm.address}
                  onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label>Latitude *</label>
                  <input
                    type="text"
                    className="sa-input"
                    value={locForm.latitude}
                    onChange={(e) => setLocForm({ ...locForm, latitude: e.target.value })}
                    required
                  />
                </div>
                <div className="sa-form-group">
                  <label>Longitude *</label>
                  <input
                    type="text"
                    className="sa-input"
                    value={locForm.longitude}
                    onChange={(e) => setLocForm({ ...locForm, longitude: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className="sa-action-btn sa-btn-outline"
                  onClick={handleUseCurrentGps}
                  disabled={gpsDetecting}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ZapIcon size={14} color="#7257FF" />
                  <span>{gpsDetecting ? 'Detecting GPS...' : '📍 Use My Device Current GPS'}</span>
                </button>
              </div>

              <div className="sa-form-group">
                <label>Coverage Radius: {locForm.coverage_radius_meters} meters</label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={locForm.coverage_radius_meters}
                  onChange={(e) => setLocForm({ ...locForm, coverage_radius_meters: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="sa-action-btn sa-btn-outline"
                  onClick={() => setShowLocationModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sa-action-btn sa-btn-primary">
                  {editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Router Modal */}
      {showRouterModal && (
        <div className="sa-modal-backdrop">
          <div className="sa-modal" style={{ maxWidth: '560px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px' }}>
              {editingRouter ? 'Edit MikroTik Router' : 'Register New MikroTik Router'}
            </h3>
            <form onSubmit={handleSaveRouter}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label>Router Name *</label>
                  <input
                    type="text"
                    className="sa-input"
                    placeholder="e.g., Library Gateway"
                    value={routerForm.name}
                    onChange={(e) => setRouterForm({ ...routerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="sa-form-group">
                  <label>MikroTik Identity *</label>
                  <input
                    type="text"
                    className="sa-input"
                    placeholder="e.g., AN-R2-Lib"
                    value={routerForm.identity}
                    onChange={(e) => setRouterForm({ ...routerForm, identity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="sa-form-group">
                <label>Assigned Location</label>
                <select
                  className="sa-input"
                  value={routerForm.location_id}
                  onChange={(e) => setRouterForm({ ...routerForm, location_id: e.target.value })}
                >
                  <option value="">-- Unassigned --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sa-form-group">
                <label>Connection Mode</label>
                <select
                  className="sa-input"
                  value={routerForm.connection_mode}
                  onChange={(e) => setRouterForm({ ...routerForm, connection_mode: e.target.value })}
                >
                  <option value="direct">Direct REST API (Public IP / DDNS)</option>
                  <option value="polling">Polling Agent (Behind NAT / 4G Modem)</option>
                </select>
              </div>

              {routerForm.connection_mode === 'direct' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div className="sa-form-group">
                      <label>IP Address / Host</label>
                      <input
                        type="text"
                        className="sa-input"
                        placeholder="192.168.88.1 or mynetname.net"
                        value={routerForm.ip_address}
                        onChange={(e) => setRouterForm({ ...routerForm, ip_address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="sa-form-group">
                      <label>Port</label>
                      <input
                        type="number"
                        className="sa-input"
                        value={routerForm.port}
                        onChange={(e) => setRouterForm({ ...routerForm, port: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="sa-form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        className="sa-input"
                        value={routerForm.username}
                        onChange={(e) => setRouterForm({ ...routerForm, username: e.target.value })}
                      />
                    </div>
                    <div className="sa-form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        className="sa-input"
                        value={routerForm.password}
                        onChange={(e) => setRouterForm({ ...routerForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--bg, #F9FAFB)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                  ℹ️ <strong>Polling Mode:</strong> Router will pull provisioning tasks via the <code>asuk-poll-agent</code> RouterOS script. No port-forwarding needed!
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="sa-action-btn sa-btn-outline"
                  onClick={() => setShowRouterModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sa-action-btn sa-btn-primary">
                  {editingRouter ? 'Save Router' : 'Register Router'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

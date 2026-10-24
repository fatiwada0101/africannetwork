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

function formatLastSeen(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Never';
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'Just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LocationsTab({
  adminHeaders,
  showToast,
  selectedRouterId = '',
  onSelectRouter = () => {},
  handleTestMikrotik = () => {},
  onRouterChange = () => {},
}) {
  const [locations, setLocations] = useState([]);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingRouterId, setTestingRouterId] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingRouter, setEditingRouter] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [docPresets, setDocPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [importedPresetNotice, setImportedPresetNotice] = useState('');

  // ── Auto-read ONLY finished & verified presets (avoids clutter from unfinished drafts) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const list = [];
      // Set of already registered router ports and names in the fleet
      const deployedPorts = new Set(routers.map(r => Number(r.port)));
      const deployedNames = new Set(routers.map(r => (r.name || '').toLowerCase().trim()));

      // 1. Only include explicitly completed & saved presets
      const savedRaw = localStorage.getItem('an_router_deployment_presets');
      if (savedRaw) {
        const arr = JSON.parse(savedRaw);
        if (Array.isArray(arr)) {
          arr.forEach(p => {
            // Must be marked completed and not already registered in fleet
            const portNum = Number(p.vpsPort);
            const nameLower = (p.name || '').toLowerCase().trim();
            if (p.isCompleted && !deployedPorts.has(portNum) && !deployedNames.has(nameLower)) {
              list.push({
                id: p.id || p.name,
                name: p.name,
                rawName: p.name,
                vpnIp: p.vpnIp,
                vpsPort: p.vpsPort,
                password: p.password,
              });
            }
          });
        }
      }

      // 2. Check if user explicitly clicked "Auto-Fill & Open Locations & Fleet" from Phase 5
      const autoOpen = localStorage.getItem('an_auto_open_add_router');
      const selectedRaw = localStorage.getItem('an_selected_import_router');
      if (selectedRaw) {
        try {
          const p = JSON.parse(selectedRaw);
          if (p && p.isCompleted && !deployedPorts.has(Number(p.vpsPort))) {
            const existingIdx = list.findIndex(item => item.id === p.id || item.rawName === p.name);
            if (existingIdx === -1) {
              list.unshift({
                id: p.id || 'selected_import',
                name: `${p.name} (Ready for Deployment)`,
                rawName: p.name,
                vpnIp: p.vpnIp,
                vpsPort: p.vpsPort,
                password: p.password,
              });
            }
          }
        } catch (e) {}
      }

      setDocPresets(list);

      // Handle auto-open when user explicitly clicked Fast Register in Phase 5
      if (autoOpen === 'true') {
        localStorage.removeItem('an_auto_open_add_router');
        if (selectedRaw) {
          const p = JSON.parse(selectedRaw);
          setEditingRouter(null);
          setRouterForm(prev => ({
            ...prev,
            name: p.name || 'Branch Router 3',
            identity: p.name || 'Branch Router 3',
            connection_mode: 'direct',
            ip_address: '187.7.22.89',
            port: Number(p.vpsPort) || 8731,
            username: 'api-user',
            password: p.password || 'AfricanNet2026!',
            use_ssl: true,
          }));
          setSelectedPresetId(p.id || 'selected_import');
          setImportedPresetNotice(`✓ Auto-filled credentials for ${p.name} (Port ${p.vpsPort})`);
          setShowRouterModal(true);
        }
      }
    } catch (e) {
      console.warn('Error reading router presets:', e);
    }
  }, [showRouterModal, routers]);

  const handleApplyPreset = (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const found = docPresets.find(item => item.id === presetId);
    if (found) {
      setRouterForm(prev => ({
        ...prev,
        name: found.rawName || found.name,
        identity: found.rawName || found.name,
        connection_mode: 'direct',
        ip_address: '187.7.22.89',
        port: Number(found.vpsPort) || 8731,
        username: 'api-user',
        password: found.password || 'AfricanNet2026!',
        use_ssl: true,
      }));
      setImportedPresetNotice(`✓ Auto-filled credentials for ${found.rawName || found.name} (Port ${found.vpsPort}, User: api-user)`);
      showToast?.(`✓ Applied preset for ${found.rawName || found.name}`, 'success');
    }
  };

  const handleTestSingleRouter = async (router) => {
    setTestingRouterId(router.id);
    try {
      const res = await fetch(`/api/mikrotik/test-connection?router_id=${encodeURIComponent(router.id)}`, {
        headers: adminHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.connected) {
        showToast?.(`✅ ${router.name} connected! Model: ${data.router?.model || 'MikroTik'}, RouterOS: ${data.router?.version || 'v7+'}`, 'success');
      } else {
        showToast?.(`⚠️ ${router.name} offline: ${data.error || 'Connection failed'}`, 'error');
      }
      fetchData();
    } catch (err) {
      showToast?.(`Network error testing ${router.name}: ${err.message}`, 'error');
    } finally {
      setTestingRouterId(null);
    }
  };

  const handleDownloadRouterScript = (router) => {
    const url = `/api/mikrotik/polling/script?router_id=${encodeURIComponent(router.id)}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `asuk_agent_${router.identity || router.name}.rsc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.(`📥 Downloaded RouterOS script for ${router.name}`, 'success');
  };

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
      onRouterChange?.();
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
      onRouterChange?.();
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
      // Clean up deployed preset from localStorage so it never clutters again
      if (!isEdit && typeof window !== 'undefined') {
        try {
          localStorage.removeItem('an_selected_import_router');
          const savedRaw = localStorage.getItem('an_router_deployment_presets');
          if (savedRaw) {
            const arr = JSON.parse(savedRaw);
            if (Array.isArray(arr)) {
              const filtered = arr.filter(p => p.name !== routerForm.name && Number(p.vpsPort) !== Number(routerForm.port));
              localStorage.setItem('an_router_deployment_presets', JSON.stringify(filtered));
            }
          }
        } catch (e) {}
      }
      setShowRouterModal(false);
      setEditingRouter(null);
      fetchData();
      onRouterChange?.();
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
      onRouterChange?.();
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
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            Hotspot Locations &amp; Coverage Areas
          </h2>
          <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '4px 0 0' }}>
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
                background: '#18181B',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                color: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    📍 {loc.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: loc.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: loc.is_active ? '#10B981' : '#EF4444',
                      border: loc.is_active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {loc.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '8px 0 12px' }}>
                  {loc.address || 'No street address provided'}
                </p>

                {/* GPS Coordinates & Map Link */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <span style={{ color: '#71717A', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                      GPS Coordinates &amp; Geofence
                    </span>
                    <span style={{ fontWeight: 600, color: '#E4E4E7' }}>
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)} ({loc.coverage_radius_meters}m radius)
                    </span>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#34A853', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
                  >
                    Map <ExternalLinkIcon size={12} />
                  </a>
                </div>

                {/* Associated Routers */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
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
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                            ⚡ {r.name} <code style={{ fontSize: '11px', color: '#4ADE80', background: 'rgba(52, 168, 83, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>({r.identity})</code>
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: r.status === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: r.status === 'online' ? '#10B981' : '#EF4444',
                              border: r.status === 'online' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  className="sa-btn-icon"
                  title="Edit Location"
                  style={{ color: '#E4E4E7', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
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
                  style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
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
      <div style={{ background: '#18181B', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              MikroTik Fleet Inventory
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#A1A1AA' }}>
              Manage routers across your network. Click <strong style={{ color: '#34A853' }}>⚡ Test</strong> to check REST API responsiveness or <strong style={{ color: '#60A5FA' }}>🎯 Target</strong> to select for operations.
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', color: '#E4E4E7', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            {routers.length} {routers.length === 1 ? 'Router' : 'Routers'} Registered
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Router Name</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Identity Tag</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Location</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Mode</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>IP / Host</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em' }}>Last Seen</th>
                <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF', fontSize: '13px' }}>
                    No routers configured yet. Click "+ Add Router" above to register your first MikroTik device.
                  </td>
                </tr>
              ) : (
                routers.map((r) => {
                  const isTarget = r.id === selectedRouterId;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        background: isTarget ? 'rgba(52, 168, 83, 0.06)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#FFFFFF', fontSize: '13.5px', fontWeight: 700 }}>{r.name}</strong>
                          {isTarget && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: 'rgba(52, 168, 83, 0.2)',
                                color: '#34A853',
                                border: '1px solid rgba(52, 168, 83, 0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Active Target
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <code
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#60A5FA',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                          }}
                        >
                          {r.identity}
                        </code>
                      </td>
                      <td style={{ padding: '14px', color: '#E4E4E7', verticalAlign: 'middle', fontWeight: 500 }}>
                        {r.locations?.name || <span style={{ color: '#71717A' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: r.connection_mode === 'direct' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: r.connection_mode === 'direct' ? '#60A5FA' : '#FBBF24',
                            border: r.connection_mode === 'direct' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {r.connection_mode === 'direct' ? 'Direct REST' : 'Polling'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span style={{ color: '#93C5FD', fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 600 }}>
                          {r.connection_mode === 'direct' ? `${r.ip_address}:${r.port}` : <span style={{ color: '#9CA3AF' }}>Polling Agent</span>}
                        </span>
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: r.status === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: r.status === 'online' ? '#10B981' : '#EF4444',
                            border: r.status === 'online' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {r.status === 'online' ? '● Online' : '○ Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '12px', color: r.last_seen_at ? '#D4D4D8' : '#71717A' }}>
                          {formatLastSeen(r.last_seen_at)}
                        </span>
                      </td>
                      <td style={{ padding: '14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="sa-btn-pill-small"
                            style={{
                              background: isTarget ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                              color: isTarget ? '#4ADE80' : '#FFFFFF',
                              borderColor: isTarget ? '#34A853' : 'rgba(255, 255, 255, 0.2)',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            onClick={() => onSelectRouter(r.id)}
                            title="Set this router as active configuration target"
                          >
                            {isTarget ? '✓ Target' : '🎯 Target'}
                          </button>

                          <button
                            className="sa-btn-pill-small"
                            onClick={() => handleTestSingleRouter(r)}
                            disabled={testingRouterId === r.id}
                            style={{
                              background: 'rgba(52, 168, 83, 0.15)',
                              color: '#4ADE80',
                              borderColor: 'rgba(52, 168, 83, 0.35)',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Test REST API or polling responsiveness"
                          >
                            {testingRouterId === r.id ? 'Testing...' : '⚡ Test'}
                          </button>

                          <button
                            className="sa-btn-pill-small"
                            onClick={() => handleDownloadRouterScript(r)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60A5FA',
                              borderColor: 'rgba(59, 130, 246, 0.35)',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Download customized RouterOS script (.rsc) for this router"
                          >
                            📥 .rsc
                          </button>

                          <button
                            className="sa-btn-icon"
                            title="Edit Router"
                            style={{ color: '#E4E4E7', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
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
                            style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                            onClick={() => handleDeleteRouter(r.id)}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#18181B',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
              color: '#FFFFFF',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(52, 168, 83, 0.15)', color: '#34A853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlobeIcon size={20} color="#34A853" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    {editingLocation ? 'Edit Hotspot Location' : 'Add New Hotspot Location'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                    Define geofenced coverage areas for multi-router roaming
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#9CA3AF',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                  Location Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Campus Library Branch"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: '#0F0F12',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    padding: '10px 14px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g., 24 University Way, Lagos"
                  value={locForm.address}
                  onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0F0F12',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    padding: '10px 14px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                    Latitude *
                  </label>
                  <input
                    type="text"
                    value={locForm.latitude}
                    onChange={(e) => setLocForm({ ...locForm, latitude: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: '#0F0F12',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                    Longitude *
                  </label>
                  <input
                    type="text"
                    value={locForm.longitude}
                    onChange={(e) => setLocForm({ ...locForm, longitude: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: '#0F0F12',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={gpsDetecting}
                  style={{
                    width: '100%',
                    background: 'rgba(52, 168, 83, 0.12)',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                    color: '#4ADE80',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <ZapIcon size={14} color="#34A853" />
                  <span>{gpsDetecting ? 'Detecting GPS...' : '📍 Use My Device Current GPS'}</span>
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#D4D4D8' }}>Coverage Radius</label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#34A853' }}>{locForm.coverage_radius_meters} meters</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={locForm.coverage_radius_meters}
                  onChange={(e) => setLocForm({ ...locForm, coverage_radius_meters: e.target.value })}
                  style={{ width: '100%', accentColor: '#34A853', cursor: 'pointer', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[75, 150, 300, 500, 1000].map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setLocForm({ ...locForm, coverage_radius_meters: radius })}
                      style={{
                        background: Number(locForm.coverage_radius_meters) === radius ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: Number(locForm.coverage_radius_meters) === radius ? '1px solid #34A853' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: Number(locForm.coverage_radius_meters) === radius ? '#4ADE80' : '#A1A1AA',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {radius === 1000 ? '1 km' : `${radius}m`} {radius === 150 ? '★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#E4E4E7',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#34A853',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)',
                  }}
                >
                  {editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Router Modal */}
      {showRouterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#18181B',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '580px',
              width: '100%',
              boxShadow: '0 25px 65px rgba(0, 0, 0, 0.7)',
              color: '#FFFFFF',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52, 168, 83, 0.15)', color: '#34A853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CpuIcon size={22} color="#34A853" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    {editingRouter ? 'Edit MikroTik Router' : 'Register New MikroTik Router'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
                    Connect via Direct REST API (IP + password) or automated Polling Agent
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRouterModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#9CA3AF',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRouter}>
              {/* ── Quick Import from Setup Docs Preset (Only shown when verified presets exist) ── */}
              {!editingRouter && docPresets.length > 0 && (
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚡ Quick Import from Setup Docs Preset
                    </strong>
                    <button
                      type="button"
                      onClick={() => setDocPresets([])}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="Hide Quick Import"
                    >
                      ✕ Dismiss
                    </button>
                  </div>

                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F0F12',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Choose a finished router preset to auto-fill --</option>
                    {docPresets.map(p => (
                      <option key={p.id} value={p.id}>
                        📌 {p.name} — Port {p.vpsPort} (WireGuard IP: {p.vpnIp})
                      </option>
                    ))}
                  </select>

                  {importedPresetNotice && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓</span> {importedPresetNotice}
                    </div>
                  )}
                </div>
              )}

              {/* Row 1: Router Name & Identity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                    Router Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Campus Gateway"
                    value={routerForm.name}
                    onChange={(e) => setRouterForm({ ...routerForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: '#0F0F12',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                    MikroTik Identity Tag *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AN-R2-HQ"
                    value={routerForm.identity}
                    onChange={(e) => setRouterForm({ ...routerForm, identity: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: '#0F0F12',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Assigned Location */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                  Assigned Location / Branch
                </label>
                <select
                  value={routerForm.location_id}
                  onChange={(e) => setRouterForm({ ...routerForm, location_id: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0F0F12',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    padding: '10px 14px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="" style={{ background: '#18181B', color: '#9CA3AF' }}>-- Unassigned (Standalone Router) --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id} style={{ background: '#18181B', color: '#FFFFFF' }}>
                      📍 {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Visual Connection Mode Selector */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '8px' }}>
                  Connection Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setRouterForm({ ...routerForm, connection_mode: 'direct' })}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: routerForm.connection_mode === 'direct' ? '2px solid #34A853' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: routerForm.connection_mode === 'direct' ? 'rgba(52, 168, 83, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: routerForm.connection_mode === 'direct' ? '#4ADE80' : '#FFFFFF' }}>
                        Direct REST API
                      </strong>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(52, 168, 83, 0.2)', color: '#34A853', textTransform: 'uppercase' }}>
                        Recommended
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', lineHeight: 1.4 }}>
                      Public IP, VPS, or DDNS. Instant control just like Mikroticket.
                    </p>
                  </div>

                  <div
                    onClick={() => setRouterForm({ ...routerForm, connection_mode: 'polling' })}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: routerForm.connection_mode === 'polling' ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: routerForm.connection_mode === 'polling' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: routerForm.connection_mode === 'polling' ? '#FBBF24' : '#FFFFFF' }}>
                        Polling Agent
                      </strong>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', textTransform: 'uppercase' }}>
                        NAT / 4G
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', lineHeight: 1.4 }}>
                      Behind NAT or 4G modem. Router pulls tasks via script.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Mode Fields */}
              {routerForm.connection_mode === 'direct' ? (
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        IP Address / Hostname *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 187.7.22.89 or router.dyndns.org"
                        value={routerForm.ip_address}
                        onChange={(e) => setRouterForm({ ...routerForm, ip_address: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        REST Port
                      </label>
                      <input
                        type="number"
                        placeholder="443"
                        value={routerForm.port}
                        onChange={(e) => setRouterForm({ ...routerForm, port: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        Admin Username *
                      </label>
                      <input
                        type="text"
                        placeholder="admin"
                        value={routerForm.username}
                        onChange={(e) => setRouterForm({ ...routerForm, username: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        Admin Password
                      </label>
                      <input
                        type="password"
                        placeholder="Router password"
                        value={routerForm.password}
                        onChange={(e) => setRouterForm({ ...routerForm, password: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        Hotspot DNS Name
                      </label>
                      <input
                        type="text"
                        placeholder="asuktech.net"
                        value={routerForm.dns_name}
                        onChange={(e) => setRouterForm({ ...routerForm, dns_name: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4D4D8', marginBottom: '6px' }}>
                        Hotspot Server Name
                      </label>
                      <input
                        type="text"
                        placeholder="hotspot1"
                        value={routerForm.hotspot_server_name}
                        onChange={(e) => setRouterForm({ ...routerForm, hotspot_server_name: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0F0F12',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      id="router-ssl-toggle"
                      checked={routerForm.use_ssl}
                      onChange={(e) => setRouterForm({ ...routerForm, use_ssl: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#34A853', cursor: 'pointer' }}
                    />
                    <label htmlFor="router-ssl-toggle" style={{ fontSize: '12.5px', color: '#D4D4D8', cursor: 'pointer', userSelect: 'none' }}>
                      Use HTTPS / SSL encryption (Recommended on RouterOS v7)
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '14px 16px', borderRadius: '12px', marginBottom: '18px', fontSize: '13px', color: '#FDE68A', lineHeight: 1.5 }}>
                  ℹ️ <strong>Polling Agent Mode:</strong> The router connects outbound to your cloud app via a lightweight background script. No public IP, dynamic DNS, or port forwarding required. After registering, click <strong>📥 .rsc</strong> to download the installation script.
                </div>
              )}

              {/* Form Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => setShowRouterModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#E4E4E7',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#34A853',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)',
                  }}
                >
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

'use client';

import { useState } from 'react';
import WindowsProgressBar from '../../components/WindowsProgressBar';
import MikroTikSetupGuide from '../../components/MikroTikSetupGuide';
import MikroTikDiagnosticsAndLogs from '../../components/MikroTikDiagnosticsAndLogs';

export default function MikroTikConfigTab({
  mikrotikForm = {},
  setMikrotikForm = () => {},
  saveMikrotik = () => {},
  handleTestMikrotik = () => {},
  testLoading = false,
  testResult = null,
  setTestResult = () => {},
  hotspotSettings = {},
  setHotspotSettings = () => {},
  pollingConfig = {},
  syncingHotspot = false,
  handleSyncHotspot = () => {},
  syncHotspot = () => {},
  adminHeaders = () => ({}),
  showToast = () => {},
  handleRestartMikrotik = () => {},
  rebootLoading = false,
  handleRestoreDefaults = () => {},
  restoreLoading = false,
  restoreResult = null,
  handleRunAutoSetup = () => {},
  handleCancelAutoSetup = () => {},
  autoSetupLoading = false,
  autoSetupProgress = {},
  setAutoSetupProgress = () => {},
  autoSetupResult = null,
  portalConfig = {},
  brandingForm = {},
  portalPushProgress = {},
  setPortalPushProgress = () => {},
  handlePushLoginPageWithProgress = () => {},
  portalPushing = false,
  selectedRouterId = '',
  setSelectedRouterId = () => {},
  routersList = [],
}) {
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [clockSyncLoading, setClockSyncLoading] = useState(false);
  const [expiryCleanupLoading, setExpiryCleanupLoading] = useState(false);
  const [copiedWatchdog, setCopiedWatchdog] = useState(false);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  const activeRouter = routersList.find(r => r.id === selectedRouterId) || routersList[0] || null;
  const activeSecret = activeRouter?.polling_secret || 'YOUR_ROUTER_SECRET';
  const activeRouterName = activeRouter?.name || mikrotikForm.wifi_ssid || 'African Network Router';
  const appHostname = typeof window !== 'undefined' ? window.location.host : 'africannetwork.net';
  const appProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

  const watchdogScript = `# =======================================================
# African Network - Power Cut Auto-Recovery & Watchdog
# For: ${activeRouterName}
# Paste into MikroTik WinBox -> Terminal
# =======================================================

# 1. Enable MikroTik Cloud DDNS and Cloud Time Sync (works through any NAT)
/ip cloud set ddns-enabled=yes update-time=yes

# 2. Configure robust SNTP with public IPs (works even if DNS is slow after power boot)
:do { /system ntp client set enabled=yes servers=216.239.35.0,1.1.1.1 } on-error={
  /system ntp client set enabled=yes primary-ntp=216.239.35.0 secondary-ntp=1.1.1.1
}

# 3. Ensure WireGuard tunnel has persistent keepalive
:do {
  /interface wireguard peers set [find endpoint-port=51820] persistent-keepalive=25s
} on-error={}

# 4. Remove previous watchdog if present
:do { /system scheduler remove [find name="an-power-watchdog"] } on-error={}
:do { /system script remove [find name="an-watchdog-script"] } on-error={}

# 5. Create Auto-Recovery Watchdog Script
/system script add name="an-watchdog-script" policy=read,write,test source={
  :local vpsIp "10.10.10.1"
  :local pingCount [/ping $vpsIp count=2]
  :if ($pingCount = 0) do={
    :log warning "Watchdog: WireGuard unreachable after power reboot. Cycling interface..."
    :do {
      /interface wireguard disable [find name="wg-vps"]
      :delay 2s
      /interface wireguard enable [find name="wg-vps"]
    } on-error={}
    :do { /ip cloud force-update } on-error={}
  }
  :do {
    /tool fetch url="${appProtocol}//${appHostname}/api/mikrotik/heartbeat?secret=${activeSecret}" mode=https check-certificate=no keep-result=no
  } on-error={}
}

# 6. Schedule Watchdog to run on router boot & every 60s
/system scheduler add name="an-power-watchdog" start-time=startup interval=60s on-event="/system script run an-watchdog-script" policy=read,write,test

:log info "African Network: Auto-Recovery Watchdog installed successfully!"
:put "SUCCESS: Watchdog installed! ${activeRouterName} will auto-reconnect after any power cut."`;

  const handleCopyWatchdog = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(watchdogScript);
      setCopiedWatchdog(true);
      showToast('📋 Auto-recovery script copied! Paste it into WinBox -> Terminal.');
      setTimeout(() => setCopiedWatchdog(false), 3000);
    }
  };

  const handleForceHealthCheck = async () => {
    setHealthCheckLoading(true);
    try {
      const res = await fetch('/api/cron/router-health', {
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Health check complete: ${data.online} online, ${data.offline} offline`);
        handleTestMikrotik(true, selectedRouterId);
      } else {
        showToast(`Health check error: ${data.error || 'Failed'}`);
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`);
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const handleSyncClock = async () => {
    setClockSyncLoading(true);
    try {
      const res = await fetch('/api/mikrotik/sync-clock', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          time_zone: 'Africa/Lagos',
          router_id: selectedRouterId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Router clock synchronized!', 'success');
      } else {
        showToast(data.error || 'Failed to sync clock', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setClockSyncLoading(false);
    }
  };

  const handleRunExpiryCleanup = async () => {
    setExpiryCleanupLoading(true);
    try {
      const res = await fetch('/api/cron/expire-vouchers', {
        method: 'POST',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Expiry run complete: ${data.vouchers_expired_in_db || 0} vouchers expired, ${data.router_sessions_kicked || 0} sessions kicked, ${data.router_users_deleted || 0} router users deleted`,
          'success'
        );
      } else {
        showToast(data.error || 'Failed to run expiry cleanup', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setExpiryCleanupLoading(false);
    }
  };

  return (
          <div className="sa-tab-body">

            {/* ── Router Target Context Banner ── */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08), rgba(59, 130, 246, 0.06))',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>📡</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Active Configuration Target:
                    <span style={{ color: selectedRouterId ? '#34A853' : '#A1A1AA' }}>
                      {selectedRouterId
                        ? (routersList.find(r => r.id === selectedRouterId)?.name || 'Custom Router')
                        : 'Default / Primary Router (app_settings)'}
                    </span>
                    <span className={`sa-badge ${testResult?.connected ? 'sa-badge-success' : 'sa-badge-danger'}`} style={{ fontSize: '11px' }}>
                      {testResult?.connected ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                    {selectedRouterId
                      ? `Targeting ${routersList.find(r => r.id === selectedRouterId)?.ip_address || mikrotikForm.ip}:${routersList.find(r => r.id === selectedRouterId)?.port || mikrotikForm.port} • Auto Setup, Portal Push & Clock Sync execute on this router.`
                      : 'All actions default to the primary environment router. Choose a specific router from the fleet to manage it.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={selectedRouterId}
                  onChange={e => setSelectedRouterId(e.target.value)}
                  style={{
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(52, 168, 83, 0.4)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="">🌐 Default / Primary Router</option>
                  {routersList.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.status === 'online' ? '🟢' : '🔴'} {r.name} {r.locations?.name ? `(${r.locations.name})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="sa-btn-pill-small"
                  onClick={() => handleTestMikrotik(false, selectedRouterId || null)}
                  disabled={testLoading}
                  style={{ background: 'rgba(52, 168, 83, 0.15)', color: '#34A853', borderColor: 'rgba(52, 168, 83, 0.4)' }}
                >
                  {testLoading ? 'Testing...' : '⚡ Test Target'}
                </button>
              </div>
            </div>

            {/* ── Section 1: Router Connection ── */}
            <div className="sa-glass-card">
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'🔌'} Router Connection</h3>
                  <p className="sa-card-sub">MikroTik RouterOS REST API connection settings</p>
                </div>
                <span className={`sa-badge ${testResult?.connected ? 'sa-badge-success' : 'sa-badge-danger'}`}>
                  {testResult?.connected ? '● Connected' : '○ Offline'}
                </span>
              </div>
              <div className="sa-form-grid-2">
                <div className="sa-field-box"><label>Router IP / Hostname *</label><input value={mikrotikForm.ip} onChange={e => setMikrotikForm({ ...mikrotikForm, ip: e.target.value })} placeholder="187.7.22.89" /></div>
                <div className="sa-field-box"><label>REST API Port *</label><input value={mikrotikForm.port} onChange={e => setMikrotikForm({ ...mikrotikForm, port: e.target.value })} placeholder="8443" /></div>
                <div className="sa-field-box"><label>API Username *</label><input value={mikrotikForm.user} onChange={e => setMikrotikForm({ ...mikrotikForm, user: e.target.value })} placeholder="admin" /></div>
                <div className="sa-field-box"><label>API Password</label><input type="password" value={mikrotikForm.pass} onChange={e => setMikrotikForm({ ...mikrotikForm, pass: e.target.value })} placeholder="********" /></div>
              </div>
              <div className="sa-ssl-check-row">
                <label className="sa-checkbox-label">
                  <input type="checkbox" checked={mikrotikForm.use_ssl} onChange={e => setMikrotikForm({ ...mikrotikForm, use_ssl: e.target.checked })} />
                  <span>Use SSL / HTTPS (self-signed router certificates supported)</span>
                </label>
              </div>
              <div className="sa-button-row" style={{ gap: 10 }}>
                <button className="sa-btn-primary" onClick={saveMikrotik}>Save Configuration</button>
                <button className="sa-btn-outline" onClick={() => handleTestMikrotik(false)} disabled={testLoading}>
                  {testLoading ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  onClick={() => setShowRebootModal(true)}
                  disabled={rebootLoading || testLoading}
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.45)',
                    color: '#EF4444',
                    background: 'rgba(239, 68, 68, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                  title="Reboot MikroTik router hardware via REST API"
                >
                  <span style={{ fontSize: '14px' }}>🔄</span>
                  <span>{rebootLoading ? 'Restarting...' : 'Restart Router'}</span>
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  onClick={() => setShowRestoreModal(true)}
                  disabled={restoreLoading || rebootLoading || testLoading}
                  style={{
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                  title="Safely restore MikroTik default login page and clean hotspot configuration"
                >
                  <span style={{ fontSize: '14px' }}>🛡️</span>
                  <span>{restoreLoading ? 'Restoring...' : 'Safe Restore Defaults'}</span>
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  onClick={handleSyncClock}
                  disabled={clockSyncLoading || testLoading}
                  style={{
                    borderColor: 'rgba(59, 130, 246, 0.45)',
                    color: '#60A5FA',
                    background: 'rgba(59, 130, 246, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                  title="Synchronize MikroTik router clock with NTP and Cloud Time"
                >
                  <span style={{ fontSize: '14px' }}>🕒</span>
                  <span>{clockSyncLoading ? 'Syncing...' : 'Sync Clock & NTP'}</span>
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  onClick={handleRunExpiryCleanup}
                  disabled={expiryCleanupLoading || testLoading}
                  style={{
                    borderColor: 'rgba(168, 85, 247, 0.45)',
                    color: '#C084FC',
                    background: 'rgba(168, 85, 247, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                  title="Force immediate enforcement: Kick expired sessions and delete expired users from MikroTik router"
                >
                  <span style={{ fontSize: '14px' }}>⚡</span>
                  <span>{expiryCleanupLoading ? 'Cleaning...' : 'Enforce Voucher Expiry'}</span>
                </button>
              </div>

              {/* Reboot Confirmation Modal */}
              {showRebootModal && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '20px',
                }}>
                  <div style={{
                    background: '#18181B',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 20,
                    padding: '26px',
                    maxWidth: 440,
                    width: '100%',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                      }}>
                        ⚠️
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                          Restart MikroTik Router?
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#A1A1AA' }}>
                          Reboots RouterOS hardware via REST API
                        </p>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: '12.5px',
                      color: '#FCA5A5',
                      lineHeight: 1.5,
                      marginBottom: 20,
                    }}>
                      <strong>Notice:</strong> All active Wi-Fi sessions and internet traffic through this router will be momentarily disconnected for <strong>30–60 seconds</strong> while the hardware reboots.
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="sa-btn-outline"
                        onClick={() => setShowRebootModal(false)}
                        disabled={rebootLoading}
                        style={{ padding: '10px 18px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="sa-btn-primary"
                        onClick={handleRestartMikrotik}
                        disabled={rebootLoading}
                        style={{
                          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          border: 'none',
                          padding: '10px 20px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: rebootLoading ? 'wait' : 'pointer',
                        }}
                      >
                        {rebootLoading ? 'Restarting...' : 'Yes, Restart Router Now'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Safe Restore Defaults Confirmation Modal */}
              {showRestoreModal && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0, 0, 0, 0.82)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '20px',
                }}>
                  <div style={{
                    background: '#18181B',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    borderRadius: 20,
                    padding: '26px',
                    maxWidth: 520,
                    width: '100%',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#F59E0B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                      }}>
                        🛡️
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                          Safe Restore Hotspot Defaults?
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#A1A1AA' }}>
                          Restores factory login page & clean hotspot without touching Cloud Access
                        </p>
                      </div>
                    </div>

                    {/* 100% Protected Guarantee */}
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: '12px',
                      color: '#86EFAC',
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, color: '#4ADE80' }}>
                        <span>🔒</span> 100% Protected & Preserved (Zero Risk):
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li><strong>All Vouchers & Customer Accounts</strong> (Never deleted; active vouchers stay 100% valid)</li>
                        <li><strong>/ip cloud</strong> (DDNS & Back To Home Cloud VPN Tunnel)</li>
                        <li><strong>REST API & WWW-SSL ports</strong> (Remote management stays online)</li>
                        <li><strong>Router users & passwords</strong> (Admin credentials untouched)</li>
                        <li><strong>WAN IP address & Default routes</strong> (Internet connection stays active)</li>
                      </ul>
                    </div>

                    {/* What Gets Reverted */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: '12px',
                      color: '#FCD34D',
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B' }}>
                        <span>⚙️</span> What Will Be Reverted to Factory Clean:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>Hotspot Login Page → Clean MikroTik factory default <code>login.html</code></li>
                        <li>Hotspot Server Profile → Standard <code>hotspot</code> directory & CHAP/PAP</li>
                        <li>Walled Garden → Cleans custom payment & banking domain rules</li>
                        <li>Fasttrack Filter → Cleans portal bypass rules</li>
                      </ul>
                    </div>

                    {/* Reversible Notice */}
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: '11.5px',
                      color: '#93C5FD',
                      lineHeight: 1.4,
                      marginBottom: 20,
                    }}>
                      🔄 <strong>Reversible Anytime:</strong> You can click <strong>"Auto-Setup Router"</strong> at any time to re-apply all customized branding, payment gateways, and walled garden domains!
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="sa-btn-outline"
                        onClick={() => setShowRestoreModal(false)}
                        disabled={restoreLoading}
                        style={{ padding: '10px 18px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="sa-btn-primary"
                        onClick={handleRestoreDefaults}
                        disabled={restoreLoading}
                        style={{
                          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                          border: 'none',
                          color: '#000',
                          padding: '10px 20px',
                          fontSize: '13px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: restoreLoading ? 'wait' : 'pointer',
                        }}
                      >
                        {restoreLoading ? 'Restoring Defaults...' : 'Yes, Safe Restore Defaults'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 1.5: Power-Cut Auto-Recovery & Watchdog ── */}
            <div
              className="sa-glass-card"
              style={{
                marginTop: 24,
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(20, 20, 28, 0.8) 100%)',
              }}
            >
              <div className="sa-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <h3 className="sa-card-title" style={{ margin: 0 }}>
                      Power-Cut Auto-Recovery &amp; Watchdog
                    </h3>
                    <span
                      className={`sa-badge ${testResult?.connected ? 'sa-badge-success' : 'sa-badge-warn'}`}
                      style={{ fontSize: 11 }}
                    >
                      {testResult?.connected ? '● Router Connected' : '○ Showing Offline (Awaiting Reconnect)'}
                    </span>
                  </div>
                  <p className="sa-card-sub" style={{ marginTop: 6 }}>
                    Permanent fix for when power cuts off and comes back on. Automatically syncs router clock on boot,
                    maintains the WireGuard tunnel, and pings the cloud server immediately.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="sa-btn-outline"
                    onClick={handleForceHealthCheck}
                    disabled={healthCheckLoading}
                    style={{
                      borderColor: 'rgba(52, 168, 83, 0.4)',
                      color: '#4ADE80',
                      background: 'rgba(52, 168, 83, 0.06)',
                      fontSize: 12,
                      padding: '7px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Pings all active routers now and updates database statuses"
                  >
                    <span>🔄</span>
                    <span>{healthCheckLoading ? 'Checking Fleet...' : 'Force Fleet Health Check'}</span>
                  </button>
                  <button
                    type="button"
                    className="sa-btn-primary"
                    onClick={handleCopyWatchdog}
                    style={{
                      background: copiedWatchdog
                        ? 'linear-gradient(135deg, #10B981, #059669)'
                        : 'linear-gradient(135deg, #F59E0B, #D97706)',
                      color: '#000',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '7px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{copiedWatchdog ? '✅' : '📋'}</span>
                    <span>{copiedWatchdog ? 'Copied to Clipboard!' : 'Copy Watchdog Script'}</span>
                  </button>
                </div>
              </div>

              {/* Root Cause Diagnosis */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 12,
                  }}
                >
                  <strong style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>🕒</span> System Clock Reset (1970 Trap)
                  </strong>
                  <p style={{ margin: 0, color: '#A1A1AA', lineHeight: 1.45 }}>
                    MikroTik routers (like hAP ax²) have no battery RTC. On power loss, the clock resets to 1970.
                    WireGuard drops handshakes as replay attacks until the clock reaches current year.
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 12,
                  }}
                >
                  <strong style={{ color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>🌐</span> WireGuard NAT Keepalive
                  </strong>
                  <p style={{ margin: 0, color: '#A1A1AA', lineHeight: 1.45 }}>
                    If the ISP modem boots slower than the router, the WireGuard UDP tunnel stalls.
                    This watchdog cycles the tunnel and enforces a 25s keepalive to keep VPS ports mapped.
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 12,
                  }}
                >
                  <strong style={{ color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>📡</span> Instant Boot Heartbeat
                  </strong>
                  <p style={{ margin: 0, color: '#A1A1AA', lineHeight: 1.45 }}>
                    Immediately after booting, the router calls <code>/api/mikrotik/heartbeat</code>. The cloud server
                    instantly marks it online and auto-detects any dynamic IP changes from the ISP.
                  </p>
                </div>
              </div>

              {/* Generated RouterOS Script Box */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#D4D4D8' }}>
                    WinBox Terminal Script for <span style={{ color: '#F59E0B' }}>{activeRouterName}</span>:
                  </span>
                  <span style={{ fontSize: 11, color: '#71717A' }}>
                    Open WinBox → Click &quot;Terminal&quot; → Right-click &amp; Paste
                  </span>
                </div>
                <pre
                  style={{
                    background: '#0D0D12',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    color: '#A7F3D0',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    maxHeight: 220,
                    margin: 0,
                  }}
                >
                  {watchdogScript}
                </pre>
              </div>
            </div>

            {/* ── Section 2: 1-Click Auto Setup ── */}
            <div className="sa-glass-card" style={{ marginTop: 24, border: '1.5px solid rgba(34,197,94,0.3)' }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'⚡'} 1-Click Auto Setup</h3>
                  <p className="sa-card-sub">
                    Fill in the fields below and click the button — it will save, connect, and configure your router automatically.
                    <span style={{ display: 'block', marginTop: 4, color: '#60A5FA', fontSize: '11.5px' }}>
                      🔄 Seamless Reversibility: If you ever safe-restore defaults, running 1-Click Auto Setup at any time will cleanly re-apply all custom portals, packages, and payment rules.
                    </span>
                  </p>
                </div>
                {autoSetupResult && (
                  <span className={`sa-badge ${autoSetupResult.all_ok ? 'sa-badge-success' : 'sa-badge-purple'}`}>
                    {autoSetupResult.all_ok ? 'All Configured' : 'Needs Attention'}
                  </span>
                )}
              </div>

              {/* WiFi + Hotspot Settings */}
              <div className="sa-form-grid-2" style={{ marginBottom: 16 }}>
                <div className="sa-field-box">
                  <label>Hotspot Portal Domain *</label>
                  <input value={mikrotikForm.hotspot_url || ''} onChange={e => setMikrotikForm({ ...mikrotikForm, hotspot_url: e.target.value })} placeholder="asuktech.net" />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Captive portal redirect domain (sets dns-name on router)</span>
                </div>
                <div className="sa-field-box">
                  <label>Wi-Fi SSID (Broadcast Name) *</label>
                  <input value={mikrotikForm.wifi_ssid || ''} onChange={e => setMikrotikForm({ ...mikrotikForm, wifi_ssid: e.target.value })} placeholder="African Network Wi-Fi" />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Sets SSID on all WiFi interfaces on the router</span>
                </div>
                <div className="sa-field-box">
                  <label>Default Upload Speed</label>
                  <input value={hotspotSettings.default_upload_speed} onChange={e => setHotspotSettings({ ...hotspotSettings, default_upload_speed: e.target.value })} placeholder="12M" />
                </div>
                <div className="sa-field-box">
                  <label>Default Download Speed</label>
                  <input value={hotspotSettings.default_download_speed} onChange={e => setHotspotSettings({ ...hotspotSettings, default_download_speed: e.target.value })} placeholder="12M" />
                </div>
              </div>

              <div className="sa-form-grid-2" style={{ marginBottom: 16 }}>
                <div className="sa-field-box">
                  <label>Multi-Device Sharing</label>
                  <div className="sa-ssl-check-row">
                    <label className="sa-checkbox-label">
                      <input type="checkbox" checked={hotspotSettings.sharing_enabled}
                        onChange={e => setHotspotSettings({ ...hotspotSettings, sharing_enabled: e.target.checked })} />
                      <span>{hotspotSettings.sharing_enabled ? 'ON — plans use their own device count' : 'OFF — 1 device per voucher'}</span>
                    </label>
                  </div>
                </div>
                <div className="sa-field-box">
                  <label>Default Devices Per Voucher</label>
                  <input type="number" min="1" max="10" value={hotspotSettings.default_devices}
                    onChange={e => setHotspotSettings({ ...hotspotSettings, default_devices: Number(e.target.value) || 1 })} />
                </div>
              </div>

              {/* Voucher Expiry Mode */}
              <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(114, 87, 255, 0.06)', borderRadius: 12, border: '1px solid rgba(114, 87, 255, 0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: '13px' }}>Voucher Expiry Mode</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#888' }}>Legacy purchase settings. Voucher Factory always counts continuously from first login.</p>
                  </div>
                  <span className={`sa-badge ${hotspotSettings.expiry_mode === 'elapsed' ? 'sa-badge-purple' : 'sa-badge-success'}`}>
                    {hotspotSettings.expiry_mode === 'elapsed' ? 'Elapsed' : 'Paused'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div
                    onClick={() => setHotspotSettings({ ...hotspotSettings, expiry_mode: 'elapsed' })}
                    style={{
                      flex: 1, minWidth: 180, padding: 12, borderRadius: 10, cursor: 'pointer',
                      background: hotspotSettings.expiry_mode === 'elapsed' ? 'rgba(114, 87, 255, 0.12)' : 'rgba(0,0,0,0.03)',
                      border: hotspotSettings.expiry_mode === 'elapsed' ? '2px solid #34A853' : '1.5px solid rgba(0,0,0,0.12)',
                    }}
                  >
                    <strong style={{ fontSize: '12px' }}>Elapsed Time</strong>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#888' }}>Timer runs non-stop from first login. 1hr voucher = 1 real hour.</p>
                  </div>
                  <div
                    onClick={() => setHotspotSettings({ ...hotspotSettings, expiry_mode: 'paused' })}
                    style={{
                      flex: 1, minWidth: 180, padding: 12, borderRadius: 10, cursor: 'pointer',
                      background: hotspotSettings.expiry_mode === 'paused' ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                      border: hotspotSettings.expiry_mode === 'paused' ? '2px solid #22c55e' : '1.5px solid rgba(0,0,0,0.12)',
                    }}
                  >
                    <strong style={{ fontSize: '12px' }}>Paused Time</strong>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#888' }}>Timer pauses when offline. More generous for customers.</p>
                  </div>
                </div>
              </div>

              {/* Windows-style Progress Bar for Auto Setup */}
              {autoSetupProgress.active && (
                <div style={{ marginBottom: 16 }}>
                  <WindowsProgressBar
                    percent={autoSetupProgress.percent}
                    title={autoSetupProgress.title}
                    subtitle={autoSetupProgress.subtitle}
                    status={autoSetupProgress.status}
                    itemCount={autoSetupProgress.itemCount}
                    elapsedText={autoSetupProgress.elapsedText}
                    canRetry={autoSetupProgress.canRetry}
                    onRetry={handleRunAutoSetup}
                    onCancel={handleCancelAutoSetup}
                    onDismiss={() => setAutoSetupProgress(prev => ({ ...prev, active: false }))}
                  />
                </div>
              )}

              {/* THE 1-CLICK BUTTON */}
              <button
                className="sa-btn-primary"
                disabled={autoSetupLoading}
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  padding: '14px 32px', fontSize: '16px', fontWeight: 800,
                  width: '100%', borderRadius: 14, letterSpacing: '0.3px',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}
                onClick={handleRunAutoSetup}
              >
                {autoSetupLoading ? '⚡ Configuring Router...' : '⚡ Auto Setup Router (1-Click)'}
              </button>

              {/* Setup Results Checklist */}
              {autoSetupResult?.results && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: 8, color: '#888' }}>Setup Results</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {autoSetupResult.results.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                        background: r.status === 'ok' ? 'rgba(34,197,94,0.06)' : r.status === 'warn' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                        borderRadius: 8, border: `1px solid ${r.status === 'ok' ? 'rgba(34,197,94,0.2)' : r.status === 'warn' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>
                          {r.status === 'ok' ? String.fromCodePoint(0x2705) : r.status === 'warn' ? String.fromCodePoint(0x26A0) : r.status === 'skip' ? String.fromCodePoint(0x23ED) : String.fromCodePoint(0x2139)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{r.step}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{r.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 2.5: Router Captive Portal (login.html) ── */}
            <div className="sa-glass-card" style={{ marginTop: 24, border: '1.5px solid rgba(114, 87, 255, 0.3)' }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">📄 Hotspot Login Page & Voucher Buy Link</h3>
                  <p className="sa-card-sub">Self-contained dark-mode captive portal served by MikroTik on port 80 (HTTP) with zero SSL warnings</p>
                </div>
                <span className="sa-badge sa-badge-purple">hotspot/login.html</span>
              </div>

              <div style={{
                background: 'rgba(114, 87, 255, 0.06)',
                border: '1px solid rgba(114, 87, 255, 0.2)',
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛒</span>
                    <strong style={{ fontSize: 13, color: '#FFFFFF' }}>Embedded Buy Voucher URL</strong>
                  </div>
                  <span className="sa-badge sa-badge-success" style={{ fontSize: 10 }}>Walled Garden Active</span>
                </div>
                <code style={{
                  display: 'block',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#C4B5FD',
                  wordBreak: 'break-all',
                }}>
                  {portalConfig.buyUrl || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : 'https://www.africannetwork.com/packages')}?mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only-esc)&link-orig=$(link-orig-esc)
                </code>
                <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#888' }}>
                  When connected to Wi-Fi without a voucher, clicking this button takes users directly to <strong>{portalConfig.buyUrl || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : 'www.africannetwork.com/packages')}</strong> to purchase a plan, after which they are automatically authenticated.
                </p>
              </div>

              {/* Windows-style Progress Bar for Portal Push */}
              {portalPushProgress.active && (
                <div style={{ marginBottom: 16 }}>
                  <WindowsProgressBar
                    percent={portalPushProgress.percent}
                    title={portalPushProgress.title}
                    subtitle={portalPushProgress.subtitle}
                    status={portalPushProgress.status}
                    itemCount={portalPushProgress.itemCount}
                    elapsedText={portalPushProgress.elapsedText}
                    canRetry={portalPushProgress.canRetry}
                    onRetry={handlePushLoginPageWithProgress}
                    onDismiss={() => setPortalPushProgress(prev => ({ ...prev, active: false }))}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="sa-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #34A853 0%, #5438DC 100%)',
                  }}
                  onClick={handlePushLoginPageWithProgress}
                  disabled={portalPushing}
                >
                  <span>⚡</span>
                  {portalPushing ? 'Pushing to Router...' : 'Push Login Page to Router (Instant)'}
                </button>

                <a
                  href="/api/mikrotik/push-login-page?download=true"
                  download="login.html"
                  className="sa-btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '10px 18px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <span>📥</span> Download login.html
                </a>

                <a
                  href="/api/mikrotik/push-login-page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sa-btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '10px 18px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <span>👁️</span> Preview Template
                </a>
              </div>
            </div>

            {/* ── Section 3: Advanced (Collapsed) ── */}
            <div className="sa-glass-card" style={{ marginTop: 24 }}>
              <div
                className="sa-card-header"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              >
                <div>
                  <h3 className="sa-card-title">Advanced Settings</h3>
                  <p className="sa-card-sub">Manual WinBox guide, diagnostics, connection logs</p>
                </div>
                <span style={{ fontSize: 18, color: '#888', transition: 'transform 0.2s', transform: showAdvancedConfig ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
              </div>
              {showAdvancedConfig && (
                <div style={{ paddingTop: 8 }}>
                  {/* WinBox Setup Guide Toggle */}
                  <button
                    className="sa-btn-outline"
                    onClick={() => setShowTutorial(!showTutorial)}
                    style={{ fontWeight: 600, width: '100%', justifyContent: 'center', marginBottom: 12 }}
                  >
                    {showTutorial ? 'Hide WinBox Guide' : 'Show WinBox Setup Guide'}
                  </button>
                  {showTutorial && (
                    <MikroTikSetupGuide
                      mikrotikForm={mikrotikForm}
                      onSyncRouter={handleSyncHotspot}
                      isSyncing={syncingHotspot}
                    />
                  )}

                  {/* Diagnostics Component */}
                  <MikroTikDiagnosticsAndLogs
                    testResult={testResult}
                    testLoading={testLoading}
                    onTest={() => handleTestMikrotik(false)}
                    adminHeaders={adminHeaders}
                    showToast={showToast}
                  />

                  {/* Connection Mode Info */}
                  <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <strong style={{ fontSize: '13px' }}>Connection Mode</strong>
                    <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
                      Current: <strong>{pollingConfig.enabled ? 'Polling (Router-Initiated)' : 'Direct (API via VPS Tunnel)'}</strong>
                    </p>
                    <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0' }}>
                      Direct mode is recommended when using a VPS tunnel. Polling mode is for setups without a VPS.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

  );
}

'use client';

export default function NetworkHealthTab({
  networkData,
  fetchNetworkHealth,
  networkLoading,
  formatBytes,
}) {
  return (
    <div className="sa-tab-body">
      {/* System Health Sensors */}
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">System Health Sensors</h3>
            <p className="sa-card-sub">Hardware telemetry from <code>/system/health</code></p>
          </div>
          <button className="sa-btn-pill-small" onClick={fetchNetworkHealth} disabled={networkLoading}>
            {networkLoading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
        {networkData.health.length === 0 ? (
          <div className="sa-empty-state-mini">No health data available. Router may not support health sensors or is offline.</div>
        ) : (
          <div className="sa-health-grid">
            {networkData.health.map((h, i) => (
              <div key={i} className="sa-health-item">
                <span className="sa-health-label">{h.name || h.type || `Sensor ${i+1}`}</span>
                <span className="sa-health-val">{h.value !== undefined ? h.value : JSON.stringify(h)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Interfaces */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Network Interfaces</h3>
            <p className="sa-card-sub">All interfaces with traffic statistics</p>
          </div>
          <span className="sa-badge">{networkData.interfaces.length} Interfaces</span>
        </div>
        {networkData.interfaces.length === 0 ? (
          <div className="sa-empty-state-mini">No interface data available.</div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead><tr><th>NAME</th><th>TYPE</th><th>STATUS</th><th>TX (OUT)</th><th>RX (IN)</th><th>MAC</th></tr></thead>
              <tbody>
                {networkData.interfaces.map(iface => (
                  <tr key={iface['.id'] || iface.name}>
                    <td className="sa-font-bold">{iface.name}</td>
                    <td>{iface.type || '—'}</td>
                    <td>
                      <span className={`sa-badge ${iface.running === 'true' || iface.running === true ? 'sa-badge-success' : 'sa-badge-danger'}`}>
                        {iface.running === 'true' || iface.running === true ? '● Up' : '○ Down'}
                      </span>
                    </td>
                    <td>{formatBytes(iface['tx-byte'])}</td>
                    <td>{formatBytes(iface['rx-byte'])}</td>
                    <td><code className="sa-mac-code">{iface['mac-address'] || '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DHCP Leases */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">DHCP Leases</h3>
            <p className="sa-card-sub">Active IP address assignments</p>
          </div>
          <span className="sa-badge">{networkData.leases.length} Leases</span>
        </div>
        {networkData.leases.length === 0 ? (
          <div className="sa-empty-state-mini">No DHCP leases found.</div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead><tr><th>IP ADDRESS</th><th>MAC ADDRESS</th><th>HOSTNAME</th><th>STATUS</th><th>SERVER</th></tr></thead>
              <tbody>
                {networkData.leases.map(l => (
                  <tr key={l['.id']}>
                    <td className="sa-font-bold">{l.address}</td>
                    <td><code className="sa-mac-code">{l['mac-address']}</code></td>
                    <td>{l['host-name'] || '—'}</td>
                    <td>
                      <span className={`sa-badge ${l.status === 'bound' ? 'sa-badge-success' : 'sa-badge-warn'}`}>
                        {l.status || 'unknown'}
                      </span>
                    </td>
                    <td className="sa-color-muted">{l.server || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Logs */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">System Logs</h3>
            <p className="sa-card-sub">Recent 50 log entries from RouterOS</p>
          </div>
          <span className="sa-badge">{networkData.logs.length} Entries</span>
        </div>
        {networkData.logs.length === 0 ? (
          <div className="sa-empty-state-mini">No log data available.</div>
        ) : (
          <div className="sa-log-viewer">
            {networkData.logs.map((log, i) => (
              <div key={i} className={`sa-log-entry ${(log.topics || '').includes('error') ? 'sa-log-error' : (log.topics || '').includes('warning') ? 'sa-log-warn' : ''}`}>
                <span className="sa-log-time">{log.time || ''}</span>
                <span className="sa-log-topics">{log.topics || ''}</span>
                <span className="sa-log-message">{log.message || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

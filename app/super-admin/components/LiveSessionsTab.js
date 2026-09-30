'use client';

export default function LiveSessionsTab({
  sessions,
  formatBytes,
  kickUser,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Active Hotspot Sessions</h3>
            <p className="sa-card-sub">Real-time devices on the router</p>
          </div>
          <span className="sa-badge sa-badge-purple">{sessions.length} Online</span>
        </div>
        {sessions.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">📶</div>
            <h4>No Active Sessions</h4>
            <p>Sessions appear when users enter voucher PINs on the captive portal.</p>
          </div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead><tr><th>USERNAME</th><th>IP</th><th>MAC</th><th>UPTIME</th><th>DATA</th><th>ACTION</th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s['.id'] || s.user}>
                    <td className="sa-font-bold"><span className="sa-user-dot" />{s.user}</td>
                    <td>{s.address}</td>
                    <td><code className="sa-mac-code">{s['mac-address']}</code></td>
                    <td>{s.uptime}</td>
                    <td>{formatBytes(s['bytes-in'])} / {formatBytes(s['bytes-out'])}</td>
                    <td><button className="sa-action-btn-danger" onClick={() => kickUser(s['.id'], s.user)}>Disconnect</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

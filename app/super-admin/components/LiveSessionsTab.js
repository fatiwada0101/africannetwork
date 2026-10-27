'use client';

export default function LiveSessionsTab({
  sessions,
  formatBytes,
  kickUser,
  kickAllUsers,
  kickAllLoading = false,
  selectedRouterId,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Active Hotspot Sessions</h3>
            <p className="sa-card-sub">Real-time devices on the router</p>
          </div>
          <div className="sa-header-actions">
            {sessions.length > 0 && (
              <button
                className="sa-action-btn-danger"
                onClick={kickAllUsers}
                disabled={kickAllLoading}
                title="Purge all sessions, cookies, and unauthorized users. Forces everyone to use a valid voucher."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
                  color: '#F87171',
                  cursor: kickAllLoading ? 'not-allowed' : 'pointer',
                  opacity: kickAllLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {kickAllLoading ? (
                  <>
                    <span className="sa-loading-spinner" style={{ width: 14, height: 14 }} />
                    Purging...
                  </>
                ) : (
                  <>
                    🔌 Purge All Free Users ({sessions.length})
                  </>
                )}
              </button>
            )}
            <span className="sa-badge sa-badge-purple">{sessions.length} Online</span>
          </div>
        </div>

        {/* Warning banner when sessions exist */}
        {sessions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <span style={{ fontSize: 20, marginTop: 2 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F87171', marginBottom: 4 }}>
                {sessions.length} user{sessions.length !== 1 ? 's' : ''} currently connected
              </div>
              <div style={{ fontSize: 12, color: '#D1D5DB', lineHeight: 1.5 }}>
                <strong>&quot;Purge All Free Users&quot;</strong> will do 3 things:
              </div>
              <ul style={{ fontSize: 12, color: '#D1D5DB', margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
                <li><strong>Clear cookies</strong> — removes MAC auto-login so users can&apos;t reconnect silently</li>
                <li><strong>Kick all sessions</strong> — disconnects everyone immediately</li>
                <li><strong>Remove unauthorized users</strong> — deletes hotspot users from the router that don&apos;t have a valid voucher in your database</li>
              </ul>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                After purging, <strong>only users with a valid unused voucher PIN</strong> will be able to reconnect.
              </div>
            </div>
          </div>
        )}

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

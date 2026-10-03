'use client';

import { TicketIcon, UsersIcon } from '../../components/Icons';

export default function DashboardTab({
  stats = { dailySales: [], planDistribution: [], recentVouchers: [] },
  formatPrice = (p) => `₦${p}`,
  routerUsers = [],
  maxDayRevenue = 100,
  plans = [],
  setActiveTab = () => {},
  sessions = [],
  formatBytes = (b) => `${b} B`,
  kickUser = () => {},
  handleTestMikrotik = () => {},
  testLoading = false,
  testResult = null,
  mikrotikForm = {},
  flutterwaveForm = {},
  copyCode = () => {},
  copiedPin = '',
}) {
  return (
          <div className="sa-tab-body">
            <div className="sa-kpi-grid">
              <div className="sa-kpi-card sa-kpi-hero">
                <div className="sa-kpi-top">
                  <span className="sa-kpi-label">Total Revenue</span>
                  {stats.trendPct !== undefined && (
                    <span className={`sa-kpi-badge-trend ${stats.trendPct < 0 ? 'negative' : ''}`}>
                      {stats.trendPct >= 0 ? '+' : ''}{stats.trendPct}%
                    </span>
                  )}
                </div>
                <div className="sa-kpi-value">{formatPrice(stats.revenue)}</div>
                <div className="sa-kpi-footer">From provisioned Wi-Fi vouchers</div>
              </div>
              <div className="sa-kpi-card">
                <div className="sa-kpi-top">
                  <span className="sa-kpi-label">Vouchers Sold</span>
                  <div className="sa-kpi-icon-mini"><TicketIcon size={16} color="#34A853" /></div>
                </div>
                <div className="sa-kpi-value">{stats.vouchers}</div>
                <div className="sa-kpi-footer">{stats.totalGenerated || stats.vouchers} total generated</div>
              </div>
              <div className="sa-kpi-card">
                <div className="sa-kpi-top">
                  <span className="sa-kpi-label">Active Users</span>
                  <span className="sa-live-pulse-indicator"><span className="sa-live-pulse-dot" />LIVE</span>
                </div>
                <div className="sa-kpi-value sa-color-green">{stats.activeSessions}</div>
                <div className="sa-kpi-footer">MikroTik hotspot sessions</div>
              </div>
              <div className="sa-kpi-card">
                <div className="sa-kpi-top">
                  <span className="sa-kpi-label">Router Users</span>
                  <div className="sa-kpi-icon-mini"><UsersIcon size={16} color="#141417" /></div>
                </div>
                <div className="sa-kpi-value">{routerUsers.length}</div>
                <div className="sa-kpi-footer">Provisioned on router</div>
              </div>
            </div>

            {/* Revenue Chart + Distribution */}
            <div className="sa-analytics-row-2">
              <div className="sa-glass-card sa-chart-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">7-Day Sales Velocity</h3>
                    <p className="sa-card-sub">Daily hotspot voucher revenue</p>
                  </div>
                  <span className="sa-badge sa-badge-purple">Weekly</span>
                </div>
                <div className="sa-velocity-bars-container">
                  {stats.dailySales.map(d => {
                    const pct = Math.max(12, Math.round((d.revenue / maxDayRevenue) * 100));
                    return (
                      <div key={d.date} className="sa-velocity-bar-col">
                        <div className="sa-velocity-bar-track">
                          <div className={`sa-velocity-bar-fill ${d.isToday ? 'today' : ''}`}
                            style={{ height: `${pct}%` }}
                            title={`${d.day}: ${formatPrice(d.revenue)} (${d.count} vouchers)`}>
                            <span className="sa-bar-tooltip">{formatPrice(d.revenue)}</span>
                          </div>
                        </div>
                        <span className={`sa-velocity-bar-label ${d.isToday ? 'active' : ''}`}>{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sa-glass-card sa-distribution-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Package Distribution</h3>
                    <p className="sa-card-sub">Market share of each pass</p>
                  </div>
                  <span className="sa-badge">{stats.planDistribution.length} Pkgs</span>
                </div>
                <div className="sa-distribution-list">
                  {stats.planDistribution.length === 0 ? (
                    <div className="sa-empty-state-mini">No sales yet</div>
                  ) : stats.planDistribution.map((item, idx) => (
                    <div key={item.name} className="sa-dist-row">
                      <div className="sa-dist-meta">
                        <span className="sa-dist-name">{item.name}</span>
                        <span className="sa-dist-count">{item.count} sold ({item.percentage}%) • {formatPrice(item.revenue)}</span>
                      </div>
                      <div className="sa-dist-track">
                        <div className="sa-dist-fill" style={{ width: `${item.percentage}%`, background: ['#34A853','#10B981','#FFB84C','#3B82F6','#EC4899'][idx % 5] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Router Health + Services */}
            <div className="sa-analytics-row-2">
              <div className="sa-glass-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Router Hardware Health</h3>
                    <p className="sa-card-sub">Live RouterOS telemetry</p>
                  </div>
                  <button className="sa-btn-pill-small" onClick={() => handleTestMikrotik(false)} disabled={testLoading}>
                    {testLoading ? 'Checking...' : '⚡ Test'}
                  </button>
                </div>
                {testResult?.connected ? (
                  <div className="sa-health-grid">
                    <div className="sa-health-item">
                      <span className="sa-health-label">Model</span>
                      <span className="sa-health-val">{testResult.router?.model || 'MikroTik'}</span>
                    </div>
                    <div className="sa-health-item">
                      <span className="sa-health-label">RouterOS</span>
                      <span className="sa-health-val">{testResult.router?.version || 'v7+'}</span>
                    </div>
                    <div className="sa-health-item">
                      <span className="sa-health-label">Uptime</span>
                      <span className="sa-health-val">{testResult.router?.uptime || 'Active'}</span>
                    </div>
                    <div className="sa-health-item">
                      <span className="sa-health-label">CPU</span>
                      <span className="sa-health-val">{testResult.router?.cpuLoad || 'Optimal'}</span>
                    </div>
                    <div className="sa-health-item sa-health-wide">
                      <span className="sa-health-label">Free Memory</span>
                      <span className="sa-health-val">{testResult.router?.freeMemory || 'Optimal'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="sa-health-offline-banner">
                    <div className="sa-offline-icon">⚠️</div>
                    <div>
                      <strong>Router unreachable at {mikrotikForm.ip}:{mikrotikForm.port}</strong>
                      <p>Check power, Ethernet, and REST API service.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sa-glass-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Infrastructure Services</h3>
                    <p className="sa-card-sub">Core subsystems</p>
                  </div>
                  <span className="sa-badge sa-badge-success">Operational</span>
                </div>
                <div className="sa-services-list">
                  <div className="sa-service-row">
                    <div className="sa-service-info"><strong>Supabase</strong><span>Auth, Wallets, Vouchers</span></div>
                    <span className="sa-badge sa-badge-success">● Active</span>
                  </div>
                  <div className="sa-service-row">
                    <div className="sa-service-info"><strong>MikroTik REST</strong><span>{mikrotikForm.ip}:{mikrotikForm.port}</span></div>
                    <span className={`sa-badge ${testResult?.connected ? 'sa-badge-success' : 'sa-badge-danger'}`}>
                      {testResult?.connected ? '● Connected' : '○ Offline'}
                    </span>
                  </div>
                  <div className="sa-service-row">
                    <div className="sa-service-info"><strong>Flutterwave</strong><span>Payment processing</span></div>
                    <span className={`sa-badge ${flutterwaveForm.enabled ? 'sa-badge-success' : 'sa-badge-warn'}`}>
                      {flutterwaveForm.enabled ? '● Enabled' : '○ Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Vouchers */}
            <div className="sa-glass-card" style={{ marginTop: 24 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">Recent Vouchers</h3>
                  <p className="sa-card-sub">Latest issued PINs</p>
                </div>
                <span className="sa-badge">{stats.recentVouchers.length} Recent</span>
              </div>
              {stats.recentVouchers.length === 0 ? (
                <div className="sa-empty-state">No vouchers purchased yet.</div>
              ) : (
                <div className="sa-table-responsive">
                  <table className="sa-modern-table">
                    <thead><tr><th>PIN</th><th>PACKAGE</th><th>AMOUNT</th><th>ISSUED</th><th>STATUS</th></tr></thead>
                    <tbody>
                      {stats.recentVouchers.map(v => (
                        <tr key={v.id}>
                          <td>
                            <div className="sa-pin-chip" onClick={() => copyCode(v.voucher_code)} title="Copy">
                              <code>{v.voucher_code}</code>
                              <span className="sa-copy-icon">{copiedPin === v.voucher_code ? '✓' : '📋'}</span>
                            </div>
                          </td>
                          <td className="sa-font-bold">{v.profile_name || 'Standard'}</td>
                          <td>{formatPrice(v.price)}</td>
                          <td className="sa-color-muted">{v.created_at ? new Date(v.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}</td>
                          <td><span className="sa-badge sa-badge-success">Active</span></td>
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

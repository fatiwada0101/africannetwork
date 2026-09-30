'use client';

import { EditPencilIcon, TrashIcon } from '../../components/Icons';

export default function HotspotProfilesTab({
  editingProfile,
  setEditingProfile,
  profileForm,
  setProfileForm,
  handleSaveProfile,
  fetchRouterProfiles,
  profilesLoading,
  routerProfiles,
  startEditProfile,
  handleDeleteProfile,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">{editingProfile ? 'Edit Hotspot Profile' : 'Create Hotspot Profile'}</h3>
            <p className="sa-card-sub">User profiles control bandwidth, sessions, and timeouts on the router</p>
          </div>
          {editingProfile && (
            <button className="sa-btn-pill-small" onClick={() => {
              setEditingProfile(null);
              setProfileForm({ name: '', 'rate-limit': '', 'shared-users': '1', 'session-timeout': '', 'idle-timeout': '', 'keepalive-timeout': '' });
            }}>Cancel Edit</button>
          )}
        </div>

        <div className="sa-form-grid-3">
          <div className="sa-field-box">
            <label>Profile Name *</label>
            <input
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="e.g. premium-1mbps"
              disabled={!!editingProfile}
            />
          </div>
          <div className="sa-field-box">
            <label>Rate Limit (Upload/Download)</label>
            <input
              value={profileForm['rate-limit']}
              onChange={e => setProfileForm({ ...profileForm, 'rate-limit': e.target.value })}
              placeholder="e.g. 1M/5M or 512K/2M"
            />
          </div>
          <div className="sa-field-box">
            <label>Shared Users</label>
            <input
              type="number"
              min="1"
              value={profileForm['shared-users']}
              onChange={e => setProfileForm({ ...profileForm, 'shared-users': e.target.value })}
              placeholder="1"
            />
          </div>
          <div className="sa-field-box">
            <label>Session Timeout</label>
            <input
              value={profileForm['session-timeout']}
              onChange={e => setProfileForm({ ...profileForm, 'session-timeout': e.target.value })}
              placeholder="e.g. 1h, 8h, 1d"
            />
          </div>
          <div className="sa-field-box">
            <label>Idle Timeout</label>
            <input
              value={profileForm['idle-timeout']}
              onChange={e => setProfileForm({ ...profileForm, 'idle-timeout': e.target.value })}
              placeholder="e.g. 5m, 30m"
            />
          </div>
          <div className="sa-field-box">
            <label>Keepalive Timeout</label>
            <input
              value={profileForm['keepalive-timeout']}
              onChange={e => setProfileForm({ ...profileForm, 'keepalive-timeout': e.target.value })}
              placeholder="e.g. 2m"
            />
          </div>
        </div>

        <div className="sa-plan-form-footer">
          <button className="sa-btn-primary" onClick={handleSaveProfile}>
            {editingProfile ? 'Update Profile on Router' : 'Create Profile on Router'}
          </button>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Router User Profiles</h3>
            <p className="sa-card-sub">Profiles configured on MikroTik hotspot server</p>
          </div>
          <div className="sa-header-actions">
            <button className="sa-btn-pill-small" onClick={fetchRouterProfiles} disabled={profilesLoading}>
              {profilesLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
            <span className="sa-badge">{routerProfiles.length} Profiles</span>
          </div>
        </div>

        {profilesLoading ? (
          <div className="sa-empty-state"><div className="sa-loading-spinner" />Loading profiles...</div>
        ) : routerProfiles.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">⚙️</div>
            <h4>No Profiles Found</h4>
            <p>Create a profile above to define bandwidth and session rules.</p>
          </div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead><tr><th>PROFILE NAME</th><th>RATE LIMIT</th><th>SHARED USERS</th><th>SESSION TIMEOUT</th><th>IDLE TIMEOUT</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {routerProfiles.map(p => (
                  <tr key={p['.id']}>
                    <td className="sa-font-bold">{p.name}</td>
                    <td><code className="sa-mac-code">{p['rate-limit'] || 'Unlimited'}</code></td>
                    <td>{p['shared-users'] || '1'}</td>
                    <td>{p['session-timeout'] || 'None'}</td>
                    <td>{p['idle-timeout'] || 'None'}</td>
                    <td>
                      <div className="sa-actions-flex">
                        <button className="sa-btn-action-edit" onClick={() => startEditProfile(p)} title="Edit">
                          <EditPencilIcon size={16} color="#141417" />
                        </button>
                        {p.name !== 'default' && (
                          <button className="sa-btn-action-delete" onClick={() => handleDeleteProfile(p['.id'], p.name)} title="Delete">
                            <TrashIcon size={16} color="#EF4444" />
                          </button>
                        )}
                      </div>
                    </td>
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

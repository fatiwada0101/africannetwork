'use client';

import { SearchIcon, EditPencilIcon, TrashIcon } from '../../components/Icons';

export default function RouterUsersTab({
  routerUsers,
  routerUsersLoading,
  fetchRouterUsers,
  userSearch,
  setUserSearch,
  editingUser,
  setEditingUser,
  userEditForm,
  setUserEditForm,
  handleUpdateRouterUser,
  handleDeleteRouterUser,
  filteredUsers,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">MikroTik Hotspot Users</h3>
            <p className="sa-card-sub">All voucher users provisioned on the router</p>
          </div>
          <div className="sa-header-actions">
            <button className="sa-btn-pill-small" onClick={fetchRouterUsers} disabled={routerUsersLoading}>
              {routerUsersLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
            <span className="sa-badge sa-badge-purple">{routerUsers.length} Users</span>
          </div>
        </div>

        {/* Search */}
        <div className="sa-search-bar">
          <SearchIcon size={16} color="#8E8E93" />
          <input
            placeholder="Search by name, profile, or comment..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
        </div>

        {/* Edit modal */}
        {editingUser && (
          <div className="sa-inline-edit-panel">
            <h4>Edit User: {routerUsers.find(u => u['.id'] === editingUser)?.name}</h4>
            <div className="sa-form-grid-2">
              <div className="sa-field-box">
                <label>Limit Uptime</label>
                <input
                  value={userEditForm['limit-uptime']}
                  onChange={e => setUserEditForm({ ...userEditForm, 'limit-uptime': e.target.value })}
                  placeholder="e.g. 1h, 1d, 7d"
                />
              </div>
              <div className="sa-field-box">
                <label>Profile</label>
                <input
                  value={userEditForm.profile}
                  onChange={e => setUserEditForm({ ...userEditForm, profile: e.target.value })}
                  placeholder="default"
                />
              </div>
            </div>
            <div className="sa-button-row">
              <button className="sa-btn-primary" onClick={handleUpdateRouterUser}>Save Changes</button>
              <button className="sa-btn-outline" onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
          </div>
        )}

        {routerUsersLoading ? (
          <div className="sa-empty-state"><div className="sa-loading-spinner" />Loading router users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">👤</div>
            <h4>No Users Found</h4>
            <p>{userSearch ? 'No matches for your search.' : 'No hotspot users on the router.'}</p>
          </div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-modern-table">
              <thead><tr><th>USERNAME</th><th>PROFILE</th><th>UPTIME LIMIT</th><th>COMMENT</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u['.id']}>
                    <td className="sa-font-bold">{u.name}</td>
                    <td><span className="sa-profile-pill">{u.profile || 'default'}</span></td>
                    <td>{u['limit-uptime'] || 'Unlimited'}</td>
                    <td className="sa-color-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.comment || '—'}</td>
                    <td>
                      <div className="sa-actions-flex">
                        <button className="sa-btn-action-edit" title="Edit" onClick={() => {
                          setEditingUser(u['.id']);
                          setUserEditForm({ 'limit-uptime': u['limit-uptime'] || '', profile: u.profile || '' });
                        }}>
                          <EditPencilIcon size={16} color="#141417" />
                        </button>
                        <button className="sa-btn-action-delete" title="Delete" onClick={() => handleDeleteRouterUser(u['.id'], u.name)}>
                          <TrashIcon size={16} color="#EF4444" />
                        </button>
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

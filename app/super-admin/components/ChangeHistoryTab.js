'use client';

import { RefreshIcon, ClockIcon } from '../../components/Icons';

export default function ChangeHistoryTab({
  fetchChangeHistory,
  historyLoading,
  historyFilter,
  setHistoryFilter,
  changeHistory,
  expandedHistoryId,
  setExpandedHistoryId,
  handleRollback,
  historyRollbacking,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">System Change History & Rollback</h3>
            <p className="sa-card-sub">
              Track all router configurations, walled garden rules, login templates, branding, and payment changes. One-click rollback restores previous states instantly.
            </p>
          </div>
          <button
            className="sa-btn-secondary"
            onClick={() => fetchChangeHistory()}
            disabled={historyLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshIcon style={{ width: 14, height: 14, animation: historyLoading ? 'spin 1s linear infinite' : 'none' }} />
            {historyLoading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="sa-history-filter-bar">
          {[
            { id: 'all', label: 'All Changes', icon: '📋' },
            { id: 'walled-garden', label: 'Walled Garden', icon: '🌐' },
            { id: 'login-design', label: 'Login Design', icon: '🎨' },
            { id: 'mikrotik-config', label: 'MikroTik Config', icon: '⚡' },
            { id: 'branding', label: 'Branding', icon: '✨' },
            { id: 'payment-gateway', label: 'Payment Gateway', icon: '💳' },
          ].map(filter => (
            <button
              key={filter.id}
              className={`sa-history-pill ${historyFilter === filter.id ? 'active' : ''}`}
              onClick={() => {
                setHistoryFilter(filter.id);
                fetchChangeHistory(filter.id);
              }}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Timeline Container */}
        {historyLoading && changeHistory.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#71717a' }}>
            <RefreshIcon style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            <p>Loading audit history...</p>
          </div>
        ) : changeHistory.length === 0 ? (
          <div className="sa-history-empty">
            <div className="sa-history-empty-icon">📜</div>
            <h4>No Change History Recorded Yet</h4>
            <p>
              Whenever you update MikroTik settings, add or remove walled garden domains, customize login templates, or update payment credentials, every action and previous state snapshot will be logged here with instant rollback capability.
            </p>
          </div>
        ) : (
          <div className="sa-history-timeline">
            {changeHistory.map((entry) => {
              const isExpanded = expandedHistoryId === entry.id;
              const isRolledBack = entry.rolled_back;
              const isRollbackAction = entry.action === 'rollback';

              const hasConfigBefore = entry.before_state && typeof entry.before_state === 'object' && Object.keys(entry.before_state).length > 0;
              const hasWgTarget = entry.category === 'walled-garden' && (
                (entry.action === 'add' && !!(entry.metadata?.dst_host || entry.after_state?.dst_host || entry.before_state?.dst_host)) ||
                (entry.action === 'remove' && !!(entry.metadata?.dst_host || entry.before_state?.dst_host)) ||
                (entry.action === 'bulk-add' && Array.isArray(entry.metadata?.domains) && entry.metadata.domains.length > 0)
              );
              const canRollback = !isRolledBack && !isRollbackAction && (
                ['mikrotik-config', 'branding', 'payment-gateway', 'login-design'].includes(entry.category)
                  ? hasConfigBefore
                  : hasWgTarget
              );

              // Safe Date formatting
              const entryDate = entry.created_at ? new Date(entry.created_at) : null;
              const formattedDate = (entryDate && !isNaN(entryDate.getTime()))
                ? entryDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recently';

              // Category badge class & label
              const catClass = `sa-history-cat-${entry.category || 'mikrotik-config'}`;
              const catLabel = {
                'walled-garden': 'Walled Garden',
                'login-design': 'Login Design',
                'mikrotik-config': 'MikroTik Config',
                'branding': 'Branding',
                'payment-gateway': 'Payment Gateway',
              }[entry.category] || entry.category;

              // Action badge class & label
              const actClass = `sa-history-act-${entry.action || 'update'}`;
              const actLabel = {
                add: '➕ Add',
                remove: '🗑️ Remove',
                update: '✏️ Update',
                push: '🚀 Push',
                rollback: '🔄 Rollback',
                'auto-setup': '⚡ Auto Setup',
                'bulk-add': '📦 Bulk Add',
              }[entry.action] || entry.action;

              return (
                <div
                  key={entry.id}
                  className={`sa-history-entry ${isRolledBack ? 'is-rolled-back' : ''}`}
                >
                  <div className="sa-history-entry-top">
                    <div className="sa-history-meta-left">
                      <span className={`sa-history-cat-badge ${catClass}`}>
                        {catLabel}
                      </span>
                      <span className={`sa-history-act-badge ${actClass}`}>
                        {actLabel}
                      </span>
                      {isRolledBack && (
                        <span className="sa-badge sa-badge-warn" style={{ fontSize: 10, padding: '2px 8px' }}>
                          Rolled Back
                        </span>
                      )}
                      {isRollbackAction && (
                        <span className="sa-badge sa-badge-info" style={{ fontSize: 10, padding: '2px 8px' }}>
                          Restoration
                        </span>
                      )}
                    </div>
                    <span className="sa-history-time">
                      <ClockIcon style={{ width: 12, height: 12 }} />
                      {formattedDate}
                    </span>
                  </div>

                  <div className="sa-history-summary">
                    {entry.summary}
                  </div>

                  <div className="sa-history-actions-row">
                    <button
                      className="sa-history-btn-diff"
                      onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                    >
                      <span>{isExpanded ? '▲ Hide State & Diff' : '▼ View State & Diff'}</span>
                    </button>

                    {canRollback && (
                      <button
                        className="sa-history-btn-rollback"
                        onClick={() => handleRollback(entry)}
                        disabled={historyRollbacking === entry.id}
                      >
                        <span>{historyRollbacking === entry.id ? '⏳ Rolling back...' : '↩️ Rollback to Previous State'}</span>
                      </button>
                    )}
                  </div>

                  {/* Expandable Before / After State Diff Box */}
                  {isExpanded && (
                    <div className="sa-history-diff-box">
                      <div className="sa-history-diff-grid">
                        <div>
                          <div className="sa-history-diff-col-title" style={{ color: '#f87171' }}>
                            ◀ State Before (Restored on Rollback)
                          </div>
                          <pre className="sa-history-diff-pre">
                            {entry.before_state && typeof entry.before_state === 'object' && Object.keys(entry.before_state).length > 0
                              ? JSON.stringify(entry.before_state, null, 2)
                              : '// No previous state (initial creation or addition)'}
                          </pre>
                        </div>
                        <div>
                          <div className="sa-history-diff-col-title" style={{ color: '#4ade80' }}>
                            ▶ State After Change
                          </div>
                          <pre className="sa-history-diff-pre">
                            {entry.after_state && typeof entry.after_state === 'object' && Object.keys(entry.after_state).length > 0
                              ? JSON.stringify(entry.after_state, null, 2)
                              : JSON.stringify(entry.metadata || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                      {entry.metadata && typeof entry.metadata === 'object' && Object.keys(entry.metadata).length > 0 && (
                        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                          <span style={{ fontSize: 10, textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700 }}>
                            Metadata Context:
                          </span>
                          <pre className="sa-history-diff-pre" style={{ marginTop: 4, maxHeight: 120 }}>
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

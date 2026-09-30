'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function FallbackVouchersTab({ adminHeaders, showToast, plans }) {
  const [data, setData] = useState({
    vouchers: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    summary: [],
    stats: { total: 0, available: 0, used: 0, expired: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(null);
  const [pruning, setPruning] = useState(false);
  const mutexRef = useRef(false); // prevents double-click race on generate/batch/manual

  // Form states
  const [inputMode, setInputMode] = useState('auto'); // 'auto' | 'manual'
  const [selectedPlan, setSelectedPlan] = useState('');
  const [customPlan, setCustomPlan] = useState('');
  const [duration, setDuration] = useState('24h');
  const [autoQuantity, setAutoQuantity] = useState(10);
  const [voucherCodes, setVoucherCodes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Customizable Default Router Settings (Defaults: 1 device sharing, 12M upload, 12M download)
  const [customDevices, setCustomDevices] = useState(1);
  const [customUpload, setCustomUpload] = useState('12M');
  const [customDownload, setCustomDownload] = useState('12M');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter & Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch paginated data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterPlan && filterPlan !== 'all') params.append('profile_name', filterPlan);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/super-admin/fallback-vouchers?${params.toString()}`, {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('Failed to load fallback vouchers');
      }
    } catch {
      showToast('Network error loading fallback vouchers');
    }
    setLoading(false);
  }, [page, limit, filterPlan, filterStatus, searchQuery, adminHeaders, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set default plan when plans load
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0].name);
      setDuration(plans[0].duration || '24h');
      setCustomDevices(plans[0].devices || 1);
      setCustomUpload(plans[0].upload_speed || '12M');
      setCustomDownload(plans[0].download_speed || '12M');
    }
  }, [plans, selectedPlan]);

  const handlePlanChange = (planIdentifier) => {
    setSelectedPlan(planIdentifier);
    const found = plans?.find(p => p.name === planIdentifier || p.id === planIdentifier);
    if (found?.duration) setDuration(found.duration);
    if (found?.devices) setCustomDevices(found.devices);
    if (found?.upload_speed) setCustomUpload(found.upload_speed);
    if (found?.download_speed) setCustomDownload(found.download_speed);
  };

  // 1-Click Auto-Generate directly on MikroTik Router with Strict Plan Binding
  const handleAutoGenerate = async (planToGen, countToGen) => {
    if (mutexRef.current) return; // prevent double-click
    const target = planToGen || (selectedPlan === '__custom__' ? customPlan.trim() : selectedPlan);
    const qty = countToGen || autoQuantity || 10;

    if (!target) {
      showToast('Please select or enter a plan name');
      return;
    }

    const planObj = plans?.find(p => p.name === target || p.id === target);
    const targetPlanId = planObj?.id || target;
    const targetProfileName = planObj?.name || target;
    const dur = planObj?.duration || duration || '24h';

    mutexRef.current = true;
    setGenerating(true);
    setGeneratingPlan(target);
    try {
      const res = await fetch('/api/super-admin/fallback-vouchers', {
        method: 'POST',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'auto_generate',
          plan_id: targetPlanId,
          profile_name: targetProfileName,
          duration: dur,
          quantity: qty,
          devices: customDevices,
          upload_speed: customUpload,
          download_speed: customDownload,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(`⚡ Generated & seeded ${json.added} vouchers for "${targetProfileName}" on MikroTik (Sharing: ${customDevices}, ${customUpload}/${customDownload})!`);
        fetchData();
      } else {
        showToast(`❌ ${json.error || 'Failed to auto-generate vouchers'}`);
      }
    } catch {
      showToast('Network error while auto-generating vouchers');
    }
    setGenerating(false);
    setGeneratingPlan(null);
    mutexRef.current = false;
  };

  // Batch replenish all low-stock plans (< 5 available) with 10 vouchers each
  const handleReplenishAllLowStock = async () => {
    if (mutexRef.current) return; // prevent double-click
    const lowPlans = (data.summary || []).filter(s => s.available < 5);
    if (lowPlans.length === 0) {
      showToast('All plan pools are already well stocked!');
      return;
    }
    mutexRef.current = true;
    setGenerating(true);
    let totalAdded = 0;
    for (const p of lowPlans) {
      setGeneratingPlan(p.profile_name);
      try {
        const res = await fetch('/api/super-admin/fallback-vouchers', {
          method: 'POST',
          headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'auto_generate',
            plan_id: p.plan_id || p.profile_name,
            profile_name: p.profile_name,
            duration: p.duration || '24h',
            quantity: 10,
            devices: customDevices,
            upload_speed: customUpload,
            download_speed: customDownload,
          }),
        });
        if (res.ok) {
          const j = await res.json();
          totalAdded += (j.added || 0);
        }
      } catch (e) {
        console.error('Batch replenish error for', p.profile_name, e);
      }
    }
    setGenerating(false);
    setGeneratingPlan(null);
    mutexRef.current = false;
    showToast(`⚡ Batch replenished ${totalAdded} vouchers across ${lowPlans.length} low-stock plans!`);
    fetchData();
  };

  // Manual Bulk Paste
  const handleManualAddVouchers = async (e) => {
    e?.preventDefault();
    if (mutexRef.current) return; // prevent double-click
    const finalPlan = selectedPlan === '__custom__' ? customPlan.trim() : selectedPlan;
    if (!finalPlan) {
      showToast('Please select or enter a plan name');
      return;
    }
    if (!voucherCodes.trim()) {
      showToast('Please enter at least one voucher code');
      return;
    }

    const planObj = plans?.find(p => p.name === finalPlan || p.id === finalPlan);
    const targetPlanId = planObj?.id || finalPlan;
    const targetProfileName = planObj?.name || finalPlan;

    mutexRef.current = true;
    setSubmittingManual(true);
    try {
      const res = await fetch('/api/super-admin/fallback-vouchers', {
        method: 'POST',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: targetPlanId,
          profile_name: targetProfileName,
          duration: duration || '24h',
          codes: voucherCodes,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(`✅ Successfully added ${json.added} vouchers to fallback pool!`);
        setVoucherCodes('');
        fetchData();
      } else {
        showToast(`❌ ${json.error || 'Failed to add vouchers'}`);
      }
    } catch {
      showToast('Network error saving vouchers');
    }
    setSubmittingManual(false);
    mutexRef.current = false;
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Are you sure you want to delete this fallback voucher?')) return;
    try {
      const res = await fetch('/api/super-admin/fallback-vouchers', {
        method: 'DELETE',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast('Voucher deleted');
        fetchData();
      } else {
        showToast('Failed to delete voucher');
      }
    } catch {
      showToast('Network error');
    }
  };

  const handleClearUnused = async (profileName) => {
    if (!confirm(`Are you sure you want to delete ALL unused fallback vouchers for "${profileName}"?`)) return;
    try {
      const res = await fetch('/api/super-admin/fallback-vouchers', {
        method: 'DELETE',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_name: profileName, clear_unused: true }),
      });
      if (res.ok) {
        showToast(`Cleared unused vouchers for ${profileName}`);
        fetchData();
      } else {
        showToast('Failed to clear vouchers');
      }
    } catch {
      showToast('Network error');
    }
  };

  // Housekeeping tool for thousands of vouchers: prune already redeemed vouchers
  const handlePruneUsed = async () => {
    if (!confirm('Prune all used & expired fallback vouchers? This removes redeemed codes and stale expired ones to keep the pool lean and performant.')) return;
    setPruning(true);
    try {
      const res = await fetch('/api/super-admin/fallback-vouchers', {
        method: 'DELETE',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prune_used: true }),
      });
      const json = await res.json();
      if (res.ok) {
        const detail = json.pruned > 0
          ? `${json.used_pruned || 0} used + ${json.expired_pruned || 0} expired`
          : '0';
        showToast(`🧹 Cleaned up ${json.pruned || 0} vouchers (${detail}) from reserve pool!`);
        fetchData();
      } else {
        showToast(`❌ ${json.error || 'Failed to prune vouchers'}`);
      }
    } catch {
      showToast('Network error pruning vouchers');
    }
    setPruning(false);
  };

  const lowStockPlans = (data.summary || []).filter(s => s.available < 5);
  const totalMatching = data.pagination?.total || 0;
  const totalPages = data.pagination?.totalPages || 1;
  const fromRecord = totalMatching === 0 ? 0 : (page - 1) * limit + 1;
  const toRecord = Math.min(totalMatching, page * limit);

  return (
    <div className="sa-tab-body">
      {/* Banner */}
      <div className="sa-glass-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            fontSize: '1.8rem',
            background: 'rgba(114, 87, 255, 0.15)',
            padding: '10px 14px',
            borderRadius: 12
          }}>
            🛡️
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="sa-card-title" style={{ fontSize: '1.1rem', marginBottom: 4 }}>
              Offline Fallback Voucher Pool (Strict Plan Isolation)
            </h3>
            <p className="sa-card-sub" style={{ margin: 0, lineHeight: 1.5 }}>
              Vouchers in this reserve protect you when your MikroTik router loses internet connectivity. Users buying Daily, Weekly, or Monthly plans will <strong>strictly receive fallback vouchers matching their selected plan</strong>. Auto-generation defaults to 1 device sharing and 12MB upload/download with full customization.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Available Reserve</span>
            <span className="sa-kpi-badge-trend">Ready</span>
          </div>
          <div className="sa-kpi-val" style={{ color: '#10B981' }}>{data.stats.available}</div>
          <div className="sa-kpi-sub">Ready to dispense offline</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Used / Dispensed</span>
            <span className="sa-kpi-badge-trend">History</span>
          </div>
          <div className="sa-kpi-val">{data.stats.used}</div>
          <div className="sa-kpi-sub">Total fallback codes used</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Expired</span>
            {data.stats.expired > 0 && (
              <span className="sa-badge sa-badge-warn">Stale</span>
            )}
          </div>
          <div className="sa-kpi-val" style={{ color: data.stats.expired > 0 ? '#EF4444' : '#8E8E93' }}>
            {data.stats.expired}
          </div>
          <div className="sa-kpi-sub">Past validity — prune to clean up</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Total Pool Size</span>
          </div>
          <div className="sa-kpi-val">{data.stats.total}</div>
          <div className="sa-kpi-sub">Across all internet plans</div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <span className="sa-kpi-label">Low Stock Alert</span>
            {lowStockPlans.length > 0 && (
              <span className="sa-badge sa-badge-warn">Attention</span>
            )}
          </div>
          <div className="sa-kpi-val" style={{ color: lowStockPlans.length > 0 ? '#F59E0B' : '#10B981' }}>
            {lowStockPlans.length}
          </div>
          <div className="sa-kpi-sub">
            {lowStockPlans.length > 0 ? `${lowStockPlans.map(p => p.profile_name).join(', ')} low` : 'All pools well stocked'}
          </div>
        </div>
      </div>

      {/* Grid: Plan Pool Status + Auto-Generate / Add Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginTop: 20 }}>
        {/* Pool status by plan */}
        <div className="sa-glass-card">
          <div className="sa-card-header">
            <div>
              <h3 className="sa-card-title">Reserve Pool by Plan</h3>
              <p className="sa-card-sub">Stock level &amp; 1-click replenish</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {lowStockPlans.length > 0 && (
                <button
                  className="sa-btn-primary"
                  onClick={handleReplenishAllLowStock}
                  disabled={generating}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    background: '#F59E0B',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#000'
                  }}
                  title="Generate 10 vouchers for each plan with low stock (< 5)"
                >
                  ⚡ Auto-Stock Low ({lowStockPlans.length})
                </button>
              )}
              <button className="sa-btn-outline" onClick={fetchData} disabled={loading} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {loading ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {data.summary.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#8E8E93' }}>
              No fallback vouchers added yet. Use the 1-Click Auto-Generator on the right to stock the pool.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.summary.map(item => {
                const isLow = item.available < 5;
                const isThisGenerating = generating && generatingPlan === item.profile_name;
                return (
                  <div key={item.profile_name} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isLow ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{item.profile_name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#8E8E93', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                          {item.duration}
                        </span>
                        {item.plan_id && (
                          <span style={{ fontSize: '0.7rem', color: '#A78BFA', background: 'rgba(167, 139, 250, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            {item.plan_id}
                          </span>
                        )}
                        {isLow && (
                          <span style={{
                            fontSize: '0.72rem',
                            color: '#F59E0B',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontWeight: 600
                          }}>
                            Low Stock
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#8E8E93', marginTop: 4 }}>
                        <span style={{ color: item.available > 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                          {item.available} available
                        </span>
                        {' • '}{item.used} used{' • '}{item.total} total
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="sa-btn-primary"
                        disabled={generating}
                        onClick={() => handleAutoGenerate(item.profile_name, 10)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          background: '#7257FF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Quick-generate 10 vouchers for this pool"
                      >
                        {isThisGenerating ? '⏳...' : '+10'}
                      </button>

                      <button
                        className="sa-btn-primary"
                        disabled={generating}
                        onClick={() => handleAutoGenerate(item.profile_name, 25)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          background: 'rgba(114, 87, 255, 0.25)',
                          border: '1px solid rgba(114, 87, 255, 0.5)',
                          color: '#C4B5FD',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Quick-generate 25 vouchers for this pool"
                      >
                        +25
                      </button>

                      {item.available > 0 && (
                        <button
                          className="sa-btn-outline"
                          onClick={() => handleClearUnused(item.profile_name)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Clear all unused vouchers for this plan"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stocking Card: Switch between 1-Click Auto-Generate and Manual Paste */}
        <div className="sa-glass-card">
          <div className="sa-card-header">
            <div>
              <h3 className="sa-card-title">Stock Fallback Reserve</h3>
              <p className="sa-card-sub">Generate via MikroTik API or paste existing</p>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: '#121218', padding: 3, borderRadius: 8, gap: 2 }}>
              <button
                type="button"
                onClick={() => setInputMode('auto')}
                style={{
                  background: inputMode === 'auto' ? '#7257FF' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ⚡ 1-Click Auto
              </button>
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                style={{
                  background: inputMode === 'manual' ? '#7257FF' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📝 Manual Paste
              </button>
            </div>
          </div>

          {/* ── MODE 1: AUTO-GENERATE ON ROUTER ── */}
          {inputMode === 'auto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sa-field-box">
                <label>Target Internet Plan *</label>
                <select
                  value={selectedPlan}
                  onChange={e => handlePlanChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '10px 12px'
                  }}
                >
                  {(plans || []).map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.duration} • {p.speed || '12MB/12MB'} • {p.devices || 1} Device)
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Plan Name</option>
                </select>
              </div>

              {selectedPlan === '__custom__' && (
                <div className="sa-field-box">
                  <label>Custom Profile Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Day Pass"
                    value={customPlan}
                    onChange={e => setCustomPlan(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="sa-field-box">
                <label>Quantity to Generate</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {[5, 10, 25, 50].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setAutoQuantity(qty)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        background: autoQuantity === qty ? '#7257FF' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${autoQuantity === qty ? '#7257FF' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Router Bandwidth & Limits Settings */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                <div
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#C4B5FD',
                  }}
                >
                  <span>⚙️ Default Settings ({customDevices} Device, ↑{customUpload} / ↓{customDownload})</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{showAdvanced ? '▲ Collapse' : '▼ Tweak Defaults'}</span>
                </div>

                {showAdvanced && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                    <div className="sa-field-box">
                      <label style={{ fontSize: '0.75rem' }}>Device Sharing</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={customDevices}
                        onChange={e => setCustomDevices(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>
                    <div className="sa-field-box">
                      <label style={{ fontSize: '0.75rem' }}>Upload Speed</label>
                      <input
                        type="text"
                        placeholder="12M"
                        value={customUpload}
                        onChange={e => setCustomUpload(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>
                    <div className="sa-field-box">
                      <label style={{ fontSize: '0.75rem' }}>Download Speed</label>
                      <input
                        type="text"
                        placeholder="12M"
                        value={customDownload}
                        onChange={e => setCustomDownload(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(114, 87, 255, 0.08)',
                border: '1px solid rgba(114, 87, 255, 0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#C4B5FD',
                lineHeight: 1.4
              }}>
                ⚡ <strong>Plan-Isolated Auto-Stock:</strong> This creates {autoQuantity} vouchers on your MikroTik router configured for 1 device sharing and {customUpload}/{customDownload} rate limits, and binds them strictly to the selected plan.
              </div>

              <button
                type="button"
                className="sa-btn-primary"
                disabled={generating}
                onClick={() => handleAutoGenerate(null, autoQuantity)}
                style={{ marginTop: 4 }}
              >
                {generating ? '⏳ Provisioning on Router & Stocking...' : `⚡ Auto-Generate ${autoQuantity} Vouchers`}
              </button>
            </div>
          )}

          {/* ── MODE 2: MANUAL BULK PASTE ── */}
          {inputMode === 'manual' && (
            <form onSubmit={handleManualAddVouchers} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sa-field-box">
                <label>Select Plan / Profile *</label>
                <select
                  value={selectedPlan}
                  onChange={e => handlePlanChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '10px 12px'
                  }}
                >
                  {(plans || []).map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.duration})
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Plan Name</option>
                </select>
              </div>

              {selectedPlan === '__custom__' && (
                <div className="sa-field-box">
                  <label>Custom Profile Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Day Pass"
                    value={customPlan}
                    onChange={e => setCustomPlan(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="sa-field-box">
                <label>Uptime Duration *</label>
                <input
                  type="text"
                  placeholder="e.g. 24h, 7d, 30d, 1h"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  required
                />
              </div>

              <div className="sa-field-box">
                <label>Voucher Codes (one per line or comma-separated) *</label>
                <textarea
                  rows={4}
                  placeholder="12345&#10;67890&#10;24680"
                  value={voucherCodes}
                  onChange={e => setVoucherCodes(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem'
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                className="sa-btn-primary"
                disabled={submittingManual}
                style={{ marginTop: 4 }}
              >
                {submittingManual ? 'Adding Vouchers...' : 'Add to Reserve Pool'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── MAINTENANCE & SCALE HOUSEKEEPING CARD ── */}
      <div className="sa-glass-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#fff' }}>🧹 Pool Maintenance & Scale Housekeeping</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#8E8E93' }}>
              Keep your database lean and performant even when handling thousands of historical vouchers.
            </p>
          </div>
          <button
            type="button"
            className="sa-btn-outline"
            disabled={pruning || (data.stats.used === 0 && data.stats.expired === 0)}
            onClick={handlePruneUsed}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              color: '#EF4444',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title="Prune all used and expired vouchers from fallback table"
          >
            {pruning ? '⏳ Pruning...' : `🧹 Prune ${data.stats.used} Used + ${data.stats.expired} Expired`}
          </button>
        </div>
      </div>

      {/* ── PAGINATED INVENTORY LEDGER TABLE ── */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="sa-card-title">Voucher Inventory Ledger</h3>
            <p className="sa-card-sub">
              Showing {fromRecord}–{toRecord} of {totalMatching} vouchers
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search voucher code..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              style={{
                background: '#1A1A24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.85rem',
                minWidth: 160
              }}
            />

            {/* Filter by Plan */}
            <select
              value={filterPlan}
              onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
              style={{
                background: '#1A1A24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.85rem'
              }}
            >
              <option value="all">All Plans</option>
              {data.summary.map(s => (
                <option key={s.profile_name} value={s.profile_name}>{s.profile_name}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              style={{
                background: '#1A1A24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.85rem'
              }}
            >
              <option value="all">All Status</option>
              <option value="available">Available Only</option>
              <option value="used">Used Only</option>
              <option value="expired">Expired Only</option>
            </select>

            {/* Rows per page */}
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                background: '#1A1A24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.85rem'
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {data.vouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8E8E93' }}>
            {loading ? 'Loading vouchers...' : 'No vouchers match the current criteria.'}
          </div>
        ) : (
          <>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Voucher Code</th>
                    <th>Profile / Plan</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Added On</th>
                    <th>Used At</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vouchers.map(v => (
                    <tr key={v.id}>
                      <td>
                        <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, color: '#A78BFA' }}>
                          {v.voucher_code}
                        </code>
                      </td>
                      <td>
                        <strong>{v.profile_name}</strong>
                        {v.plan_id && (
                          <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>ID: {v.plan_id}</div>
                        )}
                      </td>
                      <td>{v.duration}</td>
                      <td>
                        <span className={
                          `sa-badge ${
                            (v.status === 'expired' || (!v.is_used && v.status === 'expired'))
                              ? 'sa-badge-danger'
                              : v.is_used
                              ? 'sa-badge-muted'
                              : 'sa-badge-success'
                          }`
                        }>
                          {v.status === 'expired' ? 'Expired' : v.is_used ? 'Used' : 'Available'}
                        </span>
                      </td>
                      <td>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}</td>
                      <td>{v.used_at ? new Date(v.used_at).toLocaleString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {!v.is_used && (
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              fontSize: '0.82rem'
                            }}
                            title="Delete voucher"
                          >
                            ✕ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#8E8E93' }}>
                Showing <strong>{fromRecord}</strong> to <strong>{toRecord}</strong> of <strong>{totalMatching}</strong> vouchers (Page {page} of {totalPages})
              </span>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="sa-btn-outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  « First
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ‹ Prev
                </button>

                <span style={{
                  padding: '6px 12px',
                  background: 'rgba(114, 87, 255, 0.15)',
                  borderRadius: 6,
                  color: '#C4B5FD',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}>
                  {page}
                </span>

                <button
                  type="button"
                  className="sa-btn-outline"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  Next ›
                </button>
                <button
                  type="button"
                  className="sa-btn-outline"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  Last »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

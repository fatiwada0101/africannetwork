'use client';

import { useState, useCallback, useEffect } from 'react';
import { TicketIcon, SearchIcon, PrinterIcon, DownloadIcon } from '../../components/Icons';

export default function VoucherFactoryTab({
  plans,
  formatPrice,
  adminHeaders,
  showToast,
  mikrotikForm,
  brandingForm,
  fetchCoreData,
}) {
  // Voucher Generator State
  const [voucherGen, setVoucherGen] = useState({
    quantity: 10,
    prefix: '',
    code_format: 'numbers_only',
    code_length: 5,
    profile: 'default',
    expiry_type: 'daily',
    custom_duration: '1d',
    data_limit: 'unlimited',
    custom_data_limit: '',
    price: 100,
    plan_name: '1 Day Pass',
    devices: 1,
    upload_speed: '12M',
    download_speed: '12M',
  });
  const [voucherFactoryTab, setVoucherFactoryTab] = useState('generator'); // 'generator' | 'batches'
  const [batchHistory, setBatchHistory] = useState([]);
  const [batchHistoryLoading, setBatchHistoryLoading] = useState(false);
  const [selectedPlanPreset, setSelectedPlanPreset] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);
  const [genResult, setGenResult] = useState(null);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherSort, setVoucherSort] = useState('default');
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherPageSize, setVoucherPageSize] = useState(20);
  const [printScope, setPrintScope] = useState('all');

  // Voucher Card Customization
  const [cardOptions, setCardOptions] = useState({
    style: 'branded', cols: 2, rows: 4,
    showSsid: true, showPrice: true, showExpiry: true,
    showDataLimit: true, showSerial: true,
  });
  const [cardExporting, setCardExporting] = useState(false);
  const [copiedPin, setCopiedPin] = useState('');

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedPin(code);
    showToast('PIN copied to clipboard');
    setTimeout(() => setCopiedPin(''), 2500);
  };

  const copyAllVouchers = () => {
    const list = getProcessedVouchers();
    if (list.length === 0) return;
    const text = list.map(v => v.code || v.voucher_code).join('\n');
    navigator.clipboard?.writeText(text);
    showToast(`Copied ${list.length} voucher PINs to clipboard`);
  };

  const fetchBatchHistory = useCallback(async () => {
    setBatchHistoryLoading(true);
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBatchHistory(data.batches || []);
      }
    } catch (err) {
      console.error('Batch history error:', err);
    } finally {
      setBatchHistoryLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchBatchHistory();
  }, [fetchBatchHistory]);

  const handleQuickLoadPlan = (planId) => {
    setSelectedPlanPreset(planId);
    if (!planId) return;
    const p = plans.find(plan => String(plan.id) === String(planId));
    if (!p) return;

    let expType = 'daily';
    let customDur = '';
    const d = (p.duration || '').toLowerCase();
    if (d === '1h') expType = '1h';
    else if (d === '3h') expType = '3h';
    else if (d === '6h') expType = '6h';
    else if (d === '12h') expType = '12h';
    else if (d === '24h' || d === '1d' || d === 'daily') expType = 'daily';
    else if (d === '7d' || d === 'weekly') expType = 'weekly';
    else if (d === '30d' || d === 'monthly') expType = 'monthly';
    else {
      expType = 'custom';
      customDur = p.duration || '1d';
    }

    setVoucherGen(prev => ({
      ...prev,
      plan_name: p.name || prev.plan_name,
      price: p.price !== undefined ? p.price : prev.price,
      profile: p.profile_name || 'default',
      devices: p.devices || 1,
      upload_speed: p.upload_speed || '12M',
      download_speed: p.download_speed || '12M',
      expiry_type: expType,
      custom_duration: customDur,
      data_limit: p.data_limit || prev.data_limit || 'unlimited',
    }));
    showToast(`⚡ Loaded preset: ${p.name} (₦${p.price})`);
  };

  // Voucher Generator
  const handleGenerateVouchers = async () => {
    setGenLoading(true);
    setGenResult(null);
    setGeneratedVouchers([]);
    setVoucherSearch('');
    setVoucherSort('default');
    setVoucherPage(1);

    const effectiveDataLimit = voucherGen.data_limit === 'custom' 
      ? (voucherGen.custom_data_limit?.trim() || 'unlimited')
      : voucherGen.data_limit;

    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ...voucherGen,
          data_limit: effectiveDataLimit,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenResult(data);
        setGeneratedVouchers(data.vouchers || []);
        if (data.generated === 0 && data.failed > 0) {
          const firstErr = data.errors?.[0]?.error || 'Unknown error';
          showToast(`❌ All ${data.failed} vouchers failed: ${firstErr}`);
        } else if (data.failed > 0) {
          showToast(`⚠️ Generated ${data.generated} vouchers (${data.failed} failed: ${data.errors?.[0]?.error || 'unknown'})`);
        } else {
          showToast(`✅ Generated ${data.generated} vouchers successfully!`);
        }
        fetchCoreData();
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.details || data.error || 'Generation failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
    finally { setGenLoading(false); }
  };

  // Delete individual generated voucher
  const handleDeleteGeneratedVoucher = async (voucher) => {
    const code = voucher.code || voucher.voucher_code;
    if (!confirm(`Delete voucher "${code}"? This removes it from both the database and router.`)) return;
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedVouchers(prev => prev.filter(v => v.id !== voucher.id));
        showToast(`🗑️ Deleted voucher ${code} (${data.router_removed} removed from router)`);
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.error || 'Delete failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
  };

  // Delete entire batch
  const handleDeleteBatch = async (batchId, count) => {
    if (!confirm(`Delete ALL ${count || ''} vouchers in batch "${batchId}"?\n\nThis removes them from the database and the router. This action cannot be undone.`)) return;
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ batch_id: batchId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🗑️ Deleted batch ${batchId}: ${data.deleted} vouchers removed (${data.router_removed} from router)`);
        // If current view shows this batch, clear it
        if (genResult?.batch_id === batchId) {
          setGenResult(null);
          setGeneratedVouchers([]);
        }
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.error || 'Batch delete failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
  };

  // Load Past Batch into Card Studio
  const handleLoadBatch = async (batchId) => {
    setGenLoading(true);
    try {
      const res = await fetch(`/api/mikrotik/generate-vouchers?batch_id=${encodeURIComponent(batchId)}`, {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const vList = data.vouchers || [];
        setGenResult({
          batch_id: batchId,
          generated: vList.length,
          failed: 0,
          expiry_label: vList[0]?.duration || 'Custom',
          limit_uptime: vList[0]?.duration || '1d',
          data_limit: vList[0]?.data_limit || 'unlimited',
        });
        setGeneratedVouchers(vList);
        if (vList[0]) {
          setVoucherGen(prev => ({
            ...prev,
            plan_name: vList[0].profile_name || prev.plan_name,
            price: vList[0].price !== undefined ? vList[0].price : prev.price,
            data_limit: vList[0].data_limit || prev.data_limit,
          }));
        }
        setVoucherFactoryTab('generator');
        showToast(`Loaded Batch ${batchId} (${vList.length} vouchers)`);
      } else {
        showToast('Failed to load batch vouchers');
      }
    } catch (err) {
      showToast('Error loading batch: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  // CSV Export Handler
  const handleExportCsv = (vouchersList, customFileName) => {
    if (!vouchersList || vouchersList.length === 0) return showToast('No vouchers to export');
    const outName = customFileName || `vouchers_${genResult?.batch_id || 'export'}.csv`;
    const headers = ['Serial #', 'Voucher Code', 'Plan Name', 'Price (NGN)', 'Duration/Expiry', 'Data Limit', 'Batch ID', 'Direct Login Link'];
    const rows = vouchersList.map((v, i) => [
      v.serial_number || (i + 1),
      `"${v.code || v.voucher_code || ''}"`,
      `"${v.plan_name || voucherGen.plan_name || ''}"`,
      v.price !== undefined ? v.price : voucherGen.price,
      `"${v.expiry || genResult?.expiry_label || v.duration || ''}"`,
      `"${v.data_limit || voucherGen.data_limit || 'unlimited'}"`,
      `"${v.batch_id || genResult?.batch_id || ''}"`,
      `"${v.qr_url || `http://${mikrotikForm.hotspot_url || 'asuktech.net'}/login?code=${v.code || v.voucher_code}`}"`,
    ]);
    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', outName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`📊 CSV exported (${vouchersList.length} vouchers)`);
  };

  // ═══ Voucher Card Export Handlers with Search, Sort & Scope ═══
  const getProcessedVouchers = useCallback(() => {
    let list = [...generatedVouchers];
    if (voucherSearch.trim()) {
      const q = voucherSearch.trim().toLowerCase();
      list = list.filter(v => (v.code || v.voucher_code || '').toLowerCase().includes(q) || (v.expiry || v.duration || '').toLowerCase().includes(q));
    }
    if (voucherSort === 'code-asc') {
      list.sort((a, b) => (a.code || a.voucher_code || '').localeCompare(b.code || b.voucher_code || ''));
    } else if (voucherSort === 'code-desc') {
      list.sort((a, b) => (b.code || b.voucher_code || '').localeCompare(a.code || a.voucher_code || ''));
    } else if (voucherSort === 'expiry') {
      list.sort((a, b) => (a.expiry || a.duration || '').localeCompare(b.expiry || b.duration || ''));
    }
    return list;
  }, [generatedVouchers, voucherSearch, voucherSort]);

  const getTargetVouchersForExport = useCallback(() => {
    const list = getProcessedVouchers();
    if (printScope === 'page' && voucherPageSize !== 'all') {
      const size = Number(voucherPageSize) || 20;
      return list.slice((voucherPage - 1) * size, voucherPage * size);
    }
    return list;
  }, [getProcessedVouchers, printScope, voucherPageSize, voucherPage]);

  const handlePrintCards = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to print');
    setCardExporting(true);
    try {
      const { printVoucherCards } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      await printVoucherCards(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`🖨️ Print dialog opened (${cardVouchers.length} cards)`);
    } catch (err) { showToast('Print error: ' + err.message); }
    finally { setCardExporting(false); }
  };

  const handleDownloadCardsPdf = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to download');
    setCardExporting(true);
    try {
      const { downloadVoucherSheetPdf } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      await downloadVoucherSheetPdf(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`📄 PDF downloaded (${cardVouchers.length} cards)`);
    } catch (err) { showToast('PDF error: ' + err.message); }
    finally { setCardExporting(false); }
  };

  const handleDownloadCardsImage = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to download');
    setCardExporting(true);
    try {
      const { downloadVoucherSheetImage } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      downloadVoucherSheetImage(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`🖼️ Image downloaded (${cardVouchers.length} cards)`);
    } catch (err) { showToast('Image error: ' + err.message); }
    finally { setCardExporting(false); }
  };


  return (
          <div className="sa-tab-body">
            {/* Subtab Segmented Controls */}
            <div className="sa-subtab-container" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={voucherFactoryTab === 'generator'}
                className={`sa-subtab-btn ${voucherFactoryTab === 'generator' ? 'active' : ''}`}
                onClick={() => setVoucherFactoryTab('generator')}
              >
                <span className="sa-subtab-icon">🎟️</span>
                <span>Voucher Factory & Studio</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={voucherFactoryTab === 'batches'}
                className={`sa-subtab-btn ${voucherFactoryTab === 'batches' ? 'active' : ''}`}
                onClick={() => { setVoucherFactoryTab('batches'); fetchBatchHistory(); }}
              >
                <span className="sa-subtab-icon">📦</span>
                <span>Batch History & Archives</span>
                <span className="sa-subtab-pill">{batchHistory.length}</span>
              </button>
            </div>

            {/* SUB-VIEW 1: GENERATOR & CARD STUDIO */}
            {voucherFactoryTab === 'generator' && (
              <>
                <div className="sa-glass-card">
                  <div className="sa-card-header">
                    <div>
                      <h3 className="sa-card-title">Bulk Voucher Factory</h3>
                      <p className="sa-card-sub">Generate 1-100 high-performance vouchers with custom prefix, data quotas, and instant MikroTik router provisioning</p>
                    </div>
                    <span className="sa-badge sa-badge-purple"><TicketIcon size={14} color="#34A853" /> Factory v2</span>
                  </div>

                  {/* Plan Preset Quick Loader */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(114, 87, 255, 0.08), rgba(59, 130, 246, 0.06))',
                    border: '1px solid rgba(114, 87, 255, 0.25)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#C4B5FD' }}>Quick Load From Existing Plan Preset</div>
                        <div style={{ fontSize: 11, color: '#8E8E93' }}>Automatically auto-fill pricing, speed limits, devices, duration, and data caps</div>
                      </div>
                    </div>
                    <select
                      value={selectedPlanPreset}
                      onChange={e => handleQuickLoadPlan(e.target.value)}
                      style={{
                        background: '#1A1A24',
                        color: '#fff',
                        border: '1px solid rgba(114, 87, 255, 0.35)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        minWidth: 220,
                      }}
                    >
                      <option value="">-- Choose a Plan Preset --</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} • ₦{Number(p.price || 0).toLocaleString()} ({p.duration || 'Daily'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Form Grid */}
                  <div className="sa-form-grid-3">
                    <div className="sa-field-box">
                      <label>Quantity (1-100)</label>
                      <input type="number" min="1" max="100" value={voucherGen.quantity}
                        onChange={e => setVoucherGen({ ...voucherGen, quantity: e.target.value })} />
                    </div>

                    <div className="sa-field-box">
                      <label>Code Prefix</label>
                      <input
                        value={voucherGen.prefix}
                        onChange={e => setVoucherGen({ ...voucherGen, prefix: e.target.value.toUpperCase() })}
                        placeholder="Optional prefix (leave empty for numbers only)"
                      />
                    </div>

                    <div className="sa-field-box">
                      <label>Code Format / Characters</label>
                      <select
                        value={voucherGen.code_format}
                        onChange={e => setVoucherGen({ ...voucherGen, code_format: e.target.value })}
                      >
                        <option value="alphanumeric">Alphanumeric (No 0/O, 1/I - Clean)</option>
                        <option value="numbers_only">Numeric PIN (Digits 0-9 Only)</option>
                        <option value="letters_only">Letters Only (A-Z)</option>
                      </select>
                    </div>

                    <div className="sa-field-box">
                      <label>Code Length</label>
                      <select value={voucherGen.code_length}
                        onChange={e => setVoucherGen({ ...voucherGen, code_length: Number(e.target.value) })}>
                        <option value={4}>4 Characters</option>
                        <option value={6}>6 Characters (Default)</option>
                        <option value={8}>8 Characters</option>
                        <option value={10}>10 Characters</option>
                        <option value={12}>12 Characters</option>
                      </select>
                    </div>

                    <div className="sa-field-box">
                      <label>Display / Plan Name</label>
                      <input value={voucherGen.plan_name}
                        onChange={e => setVoucherGen({ ...voucherGen, plan_name: e.target.value })}
                        placeholder="e.g. 1 Day Pass" />
                    </div>

                    <div className="sa-field-box">
                      <label>Price (₦)</label>
                      <input type="number" value={voucherGen.price}
                        onChange={e => setVoucherGen({ ...voucherGen, price: e.target.value })} />
                    </div>

                    <div className="sa-field-box">
                      <label>Expiry Type</label>
                      <select value={voucherGen.expiry_type}
                        onChange={e => setVoucherGen({ ...voucherGen, expiry_type: e.target.value })}>
                        <option value="1h">1 Hour</option>
                        <option value="3h">3 Hours</option>
                        <option value="6h">6 Hours</option>
                        <option value="12h">12 Hours</option>
                        <option value="daily">Daily (24h)</option>
                        <option value="weekly">Weekly (7d)</option>
                        <option value="monthly">Monthly (30d)</option>
                        <option value="custom">Custom Duration</option>
                      </select>
                    </div>

                    {voucherGen.expiry_type === 'custom' && (
                      <div className="sa-field-box">
                        <label>Custom Duration</label>
                        <input value={voucherGen.custom_duration}
                          onChange={e => setVoucherGen({ ...voucherGen, custom_duration: e.target.value })}
                          placeholder="e.g. 2d, 12h, 45m" />
                      </div>
                    )}

                    <div className="sa-field-box">
                      <label>Data Quota Limit</label>
                      <select
                        value={voucherGen.data_limit}
                        onChange={e => setVoucherGen({ ...voucherGen, data_limit: e.target.value })}
                      >
                        <option value="unlimited">Unlimited (Time Only)</option>
                        <option value="500MB">500 MB</option>
                        <option value="1GB">1 GB</option>
                        <option value="2GB">2 GB</option>
                        <option value="5GB">5 GB</option>
                        <option value="10GB">10 GB</option>
                        <option value="20GB">20 GB</option>
                        <option value="custom">Custom Quota</option>
                      </select>
                    </div>

                    {voucherGen.data_limit === 'custom' && (
                      <div className="sa-field-box">
                        <label>Custom Data Quota</label>
                        <input
                          value={voucherGen.custom_data_limit}
                          onChange={e => setVoucherGen({ ...voucherGen, custom_data_limit: e.target.value })}
                          placeholder="e.g. 750MB, 1.5GB, 15GB"
                        />
                      </div>
                    )}

                    <div className="sa-field-box">
                      <label>Router Profile</label>
                      <input value={voucherGen.profile}
                        onChange={e => setVoucherGen({ ...voucherGen, profile: e.target.value })}
                        placeholder="default" />
                    </div>

                    <div className="sa-field-box">
                      <label>Devices (shared-users)</label>
                      <input type="number" min="1" max="10" value={voucherGen.devices}
                        onChange={e => setVoucherGen({ ...voucherGen, devices: e.target.value })} />
                    </div>

                    <div className="sa-field-box">
                      <label>Upload Speed</label>
                      <input value={voucherGen.upload_speed}
                        onChange={e => setVoucherGen({ ...voucherGen, upload_speed: e.target.value })}
                        placeholder="12M" />
                    </div>

                    <div className="sa-field-box">
                      <label>Download Speed</label>
                      <input value={voucherGen.download_speed}
                        onChange={e => setVoucherGen({ ...voucherGen, download_speed: e.target.value })}
                        placeholder="12M" />
                    </div>
                  </div>

                  <div className="sa-plan-form-footer" style={{ marginTop: 18 }}>
                    <button className="sa-btn-primary sa-btn-lg" onClick={handleGenerateVouchers} disabled={genLoading}>
                      {genLoading ? `Generating ${voucherGen.quantity} vouchers...` : `🎟️ Generate ${voucherGen.quantity} Vouchers`}
                    </button>
                  </div>
                </div>

                {/* Generated Results & Studio */}
                {genResult && (() => {
                  const processed = getProcessedVouchers();
                  const isAll = voucherPageSize === 'all';
                  const pageSize = isAll ? Math.max(1, processed.length) : Number(voucherPageSize) || 20;
                  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
                  const currentPage = Math.min(Math.max(1, voucherPage), totalPages);
                  const paginatedVouchers = isAll ? processed : processed.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                  const exportCount = printScope === 'page' ? paginatedVouchers.length : processed.length;

                  return (
                  <div className="sa-glass-card" style={{ marginTop: 24 }}>
                    <div className="sa-card-header">
                      <div>
                        <h3 className="sa-card-title">Generated Batch: {genResult.batch_id || 'Active Batch'}</h3>
                        <p className="sa-card-sub">
                          {genResult.generated} created • {genResult.expiry_label} expiry • {genResult.limit_uptime} uptime • {voucherGen.plan_name} • ₦{voucherGen.price}
                        </p>
                      </div>
                      <div className="sa-header-actions">
                        {processed.length > 0 && (
                          <button className="sa-btn-pill-small" onClick={copyAllVouchers}>
                            📋 Copy All ({processed.length})
                          </button>
                        )}
                        <button
                          className="sa-btn-pill-small"
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          onClick={() => handleExportCsv(processed, `vouchers_${genResult.batch_id || 'batch'}.csv`)}
                        >
                          📊 Export CSV ({processed.length})
                        </button>
                        <span className="sa-badge sa-badge-success">{genResult.generated} Success</span>
                        {genResult.failed > 0 && <span className="sa-badge sa-badge-danger">{genResult.failed} Failed</span>}
                      </div>
                    </div>

                    {/* Categorization & Metadata Badges */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0', alignItems: 'center' }}>
                      <span className="sa-badge sa-badge-purple" style={{ fontSize: 11 }}>🏷️ Plan: {voucherGen.plan_name}</span>
                      <span className="sa-badge" style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>⏱ Expiry: {genResult.expiry_label}</span>
                      <span className="sa-badge" style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>💰 ₦{voucherGen.price} each</span>
                      <span className="sa-badge" style={{ fontSize: 11, background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>⚡ Data: {genResult.data_limit || voucherGen.data_limit || 'Unlimited'}</span>
                      <span className="sa-badge" style={{ fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>🔤 {voucherGen.code_length} chars</span>
                      {genResult.batch_id && (
                        <span
                          className="sa-badge"
                          style={{ fontSize: 11, background: 'rgba(114,87,255,0.12)', color: '#C4B5FD', cursor: 'pointer' }}
                          onClick={() => { navigator.clipboard.writeText(genResult.batch_id); showToast('Copied Batch ID: ' + genResult.batch_id); }}
                          title="Click to copy Batch ID"
                        >
                          📦 {genResult.batch_id} 📋
                        </span>
                      )}
                      <span className="sa-badge sa-badge-muted" style={{ fontSize: 11 }}>📊 Showing {paginatedVouchers.length} of {processed.length}</span>
                    </div>

                    {/* Search, Sort, and Page Size Toolbar */}
                    <div style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '12px 14px',
                      borderRadius: 12,
                      margin: '10px 0 16px 0',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      {/* Search / Filter */}
                      <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SearchIcon size={14} color="#8E8E93" />
                        <input
                          type="text"
                          value={voucherSearch}
                          onChange={e => { setVoucherSearch(e.target.value); setVoucherPage(1); }}
                          placeholder="Search voucher code, expiry, serial..."
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            width: '100%',
                          }}
                        />
                        {voucherSearch && (
                          <button
                            onClick={() => { setVoucherSearch(''); setVoucherPage(1); }}
                            style={{ background: 'transparent', border: 'none', color: '#8E8E93', cursor: 'pointer', fontSize: 12 }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Sort */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#8E8E93' }}>Sort:</span>
                        <select
                          value={voucherSort}
                          onChange={e => { setVoucherSort(e.target.value); setVoucherPage(1); }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 12,
                            padding: '4px 8px',
                          }}
                        >
                          <option value="default">Creation Order</option>
                          <option value="code-asc">Code (A → Z)</option>
                          <option value="code-desc">Code (Z → A)</option>
                          <option value="expiry">Expiry Duration</option>
                        </select>
                      </div>

                      {/* Per Page */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#8E8E93' }}>Show:</span>
                        <select
                          value={voucherPageSize}
                          onChange={e => {
                            setVoucherPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                            setVoucherPage(1);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 12,
                            padding: '4px 8px',
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                    </div>

                    {paginatedVouchers.length > 0 ? (
                      <>
                        {/* Voucher Grid */}
                        <div className="sa-voucher-grid">
                          {paginatedVouchers.map((v, i) => (
                            <div key={v.code || v.voucher_code || i} className="sa-voucher-card-mini" onClick={() => copyCode(v.code || v.voucher_code)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: '#81C995', fontWeight: 700 }}>
                                  #{String(v.serial_number || i + 1).padStart(3, '0')}
                                </span>
                                {v.data_limit && v.data_limit !== 'unlimited' && (
                                  <span style={{ fontSize: 9, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 5px', borderRadius: 4 }}>
                                    ⚡ {v.data_limit}
                                  </span>
                                )}
                              </div>
                              <div className="sa-voucher-card-code">
                                <code>{v.code || v.voucher_code}</code>
                                <span className="sa-copy-icon">{copiedPin === (v.code || v.voucher_code) ? '✓' : '📋'}</span>
                              </div>
                              <div className="sa-voucher-card-meta">
                                <span>{v.expiry || v.duration || genResult.expiry_label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="sa-badge sa-badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>Active</span>
                                  {v.id && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteGeneratedVoucher(v); }}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: 4,
                                        color: '#fca5a5',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        padding: '2px 5px',
                                        lineHeight: 1,
                                      }}
                                      title="Delete this voucher"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && !isAll && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, padding: '10px 0' }}>
                            <button
                              className="sa-btn-pill-small"
                              disabled={currentPage <= 1}
                              onClick={() => setVoucherPage(1)}
                              title="First Page"
                            >
                              « First
                            </button>
                            <button
                              className="sa-btn-pill-small"
                              disabled={currentPage <= 1}
                              onClick={() => setVoucherPage(p => Math.max(1, p - 1))}
                              title="Previous Page"
                            >
                              ‹ Prev
                            </button>
                            <span style={{
                              fontSize: 12,
                              color: '#C4B5FD',
                              padding: '4px 10px',
                              background: 'rgba(114, 87, 255, 0.12)',
                              borderRadius: 6,
                              fontWeight: 600
                            }}>
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              className="sa-btn-pill-small"
                              disabled={currentPage >= totalPages}
                              onClick={() => setVoucherPage(p => Math.min(totalPages, p + 1))}
                              title="Next Page"
                            >
                              Next ›
                            </button>
                            <button
                              className="sa-btn-pill-small"
                              disabled={currentPage >= totalPages}
                              onClick={() => setVoucherPage(totalPages)}
                              title="Last Page"
                            >
                              Last »
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#8E8E93', fontSize: 13 }}>
                        No vouchers match your filter criteria.
                      </div>
                    )}

                    {/* ── Card Customization & Multi-Format Export ── */}
                    <div className="sa-glass-card" style={{ marginTop: 16, background: 'rgba(114, 87, 255, 0.04)', border: '1px solid rgba(114, 87, 255, 0.15)' }}>
                      <div className="sa-card-header">
                        <div>
                          <h3 className="sa-card-title">🎨 Print & Download Card Studio</h3>
                          <p className="sa-card-sub">Export batch as beautiful printable cards, PDF sheets, images, or raw Excel/CSV</p>
                        </div>
                      </div>

                      <div className="sa-form-grid-3">
                        <div className="sa-field-box">
                          <label>Card Style</label>
                          <select value={cardOptions.style} onChange={e => setCardOptions({ ...cardOptions, style: e.target.value })}>
                            <option value="minimal">Minimal (Clean Light)</option>
                            <option value="branded">Branded (Purple Royal)</option>
                            <option value="premium">Premium (Gold & Dark)</option>
                          </select>
                        </div>
                        <div className="sa-field-box">
                          <label>Cards Per Row</label>
                          <select value={cardOptions.cols} onChange={e => setCardOptions({ ...cardOptions, cols: Number(e.target.value) })}>
                            <option value={2}>2 Cards</option>
                            <option value={3}>3 Cards</option>
                          </select>
                        </div>
                        <div className="sa-field-box">
                          <label>Rows Per Page</label>
                          <select value={cardOptions.rows} onChange={e => setCardOptions({ ...cardOptions, rows: Number(e.target.value) })}>
                            <option value={3}>3 Rows</option>
                            <option value={4}>4 Rows (Default)</option>
                            <option value={5}>5 Rows</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#C4B5FD' }}>Export Scope:</span>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#fff' }}>
                            <input
                              type="radio"
                              name="printScope"
                              value="all"
                              checked={printScope === 'all'}
                              onChange={() => setPrintScope('all')}
                            />
                            <span>All Matching ({processed.length})</span>
                          </label>
                          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#fff' }}>
                            <input
                              type="radio"
                              name="printScope"
                              value="page"
                              checked={printScope === 'page'}
                              onChange={() => setPrintScope('page')}
                            />
                            <span>Current Page ({paginatedVouchers.length})</span>
                          </label>
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <label className="sa-checkbox-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={cardOptions.showSsid} onChange={e => setCardOptions({ ...cardOptions, showSsid: e.target.checked })} />
                            <span>Show SSID</span>
                          </label>
                          <label className="sa-checkbox-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={cardOptions.showPrice} onChange={e => setCardOptions({ ...cardOptions, showPrice: e.target.checked })} />
                            <span>Show Price</span>
                          </label>
                          <label className="sa-checkbox-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={cardOptions.showExpiry} onChange={e => setCardOptions({ ...cardOptions, showExpiry: e.target.checked })} />
                            <span>Show Expiry</span>
                          </label>
                          <label className="sa-checkbox-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={cardOptions.showDataLimit} onChange={e => setCardOptions({ ...cardOptions, showDataLimit: e.target.checked })} />
                            <span>Show Data Limit</span>
                          </label>
                          <label className="sa-checkbox-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={cardOptions.showSerial} onChange={e => setCardOptions({ ...cardOptions, showSerial: e.target.checked })} />
                            <span>Show Serial #</span>
                          </label>
                        </div>
                      </div>

                      <div className="sa-plan-form-footer" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                        <button className="sa-btn-primary" onClick={handlePrintCards} disabled={cardExporting || exportCount === 0}>
                          <PrinterIcon size={16} /> 🖨️ Print {exportCount} Cards
                        </button>
                        <button className="sa-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={handleDownloadCardsPdf} disabled={cardExporting || exportCount === 0}>
                          <DownloadIcon size={16} /> 📄 Download PDF ({exportCount})
                        </button>
                        <button className="sa-btn-pill-small" onClick={handleDownloadCardsImage} disabled={cardExporting || exportCount === 0}>
                          🖼️ Download Image ({exportCount})
                        </button>
                        <button
                          className="sa-btn-pill-small"
                          style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          onClick={() => handleExportCsv(getTargetVouchersForExport())}
                          disabled={exportCount === 0}
                        >
                          📊 Download Excel / CSV ({exportCount})
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </>
            )}

            {/* SUB-VIEW 2: BATCH HISTORY & ARCHIVES */}
            {voucherFactoryTab === 'batches' && (
              <div className="sa-glass-card">
                <div className="sa-card-header">
                  <div>
                    <h3 className="sa-card-title">Generated Voucher Batches</h3>
                    <p className="sa-card-sub">Browse previous production runs, re-print card sheets, or export historical batches to CSV</p>
                  </div>
                  <div className="sa-header-actions">
                    <button className="sa-btn-pill-small" onClick={fetchBatchHistory} disabled={batchHistoryLoading}>
                      {batchHistoryLoading ? 'Loading...' : '🔄 Refresh Batches'}
                    </button>
                  </div>
                </div>

                {batchHistoryLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8E8E93' }}>
                    Loading batch history...
                  </div>
                ) : batchHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8E8E93' }}>
                    No bulk voucher batches recorded yet. Generate your first batch using the Voucher Factory tab!
                  </div>
                ) : (
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Batch ID</th>
                          <th>Plan Name</th>
                          <th>Vouchers</th>
                          <th>Data Quota</th>
                          <th>Created At</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchHistory.map(b => (
                          <tr key={b.batch_id}>
                            <td>
                              <code style={{ color: '#81C995', fontWeight: 600 }}>{b.batch_id}</code>
                            </td>
                            <td>
                              <strong>{b.plan_name || 'Standard Pass'}</strong>
                            </td>
                            <td>
                              <span className="sa-badge sa-badge-purple">{b.total} cards</span>
                              {b.used > 0 && <span className="sa-badge sa-badge-muted" style={{ marginLeft: 4, fontSize: 10 }}>{b.used} used</span>}
                            </td>
                            <td>
                              <span className="sa-badge" style={{
                                background: b.data_limit && b.data_limit !== 'unlimited' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.06)',
                                color: b.data_limit && b.data_limit !== 'unlimited' ? '#38bdf8' : '#8E8E93'
                              }}>
                                {b.data_limit && b.data_limit !== 'unlimited' ? `⚡ ${b.data_limit}` : 'Unlimited'}
                              </span>
                            </td>
                            <td style={{ color: '#8E8E93', fontSize: '0.85rem' }}>
                              {b.created_at ? new Date(b.created_at).toLocaleString() : 'Recent'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  className="sa-btn-pill-small"
                                  style={{ background: 'rgba(114, 87, 255, 0.15)', color: '#C4B5FD', borderColor: 'rgba(114, 87, 255, 0.3)' }}
                                  onClick={() => handleLoadBatch(b.batch_id)}
                                  title="Load all vouchers in this batch into the Card Studio for printing or downloading"
                                >
                                  🎨 Open in Studio
                                </button>
                                <button
                                  className="sa-btn-pill-small"
                                  style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                  onClick={() => handleDeleteBatch(b.batch_id, b.total)}
                                  title="Delete all vouchers in this batch"
                                >
                                  🗑️ Delete Batch
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
            )}
          </div>

  );
}

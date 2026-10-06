'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function FinanceTab({ adminHeaders, formatPrice, showToast }) {
  const [financeData, setFinanceData] = useState(null);
  const [finLoading, setFinLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'deposit' | 'purchase' | 'transfer'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Server-side pagination & search states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileReport, setReconcileReport] = useState(null);

  const runReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/super-admin/finance/reconcile', {
        method: 'POST',
        headers: adminHeaders()
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReconcileReport(data.report);
        showToast('Audit complete: ' + (data.report.is_balanced ? '✅ All balanced' : '⚠️ Discrepancies detected'));
      } else {
        showToast('Reconciliation failed: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      showToast('Reconciliation error: ' + e.message);
    } finally {
      setReconciling(false);
    }
  };

  const getDateRange = useCallback((filter) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let start = today, end = today;

    switch (filter) {
      case 'today':
        start = today; end = today; break;
      case 'this_week': {
        const d = new Date(now); d.setDate(d.getDate() - d.getDay());
        start = d.toISOString().split('T')[0]; end = today; break;
      }
      case 'this_month': {
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; end = today; break;
      }
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        start = lm.toISOString().split('T')[0]; end = lmEnd.toISOString().split('T')[0]; break;
      }
      case 'custom':
        start = customStart || today; end = customEnd || today; break;
    }
    return { start, end };
  }, [customStart, customEnd]);

  const abortControllerRef = useRef(null);
  const seqRef = useRef(0);

  const fetchFinanceData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++seqRef.current;

    setFinLoading(true);
    try {
      const { start, end } = getDateRange(dateFilter);
      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
        page: String(page),
        limit: String(limit),
        type: typeFilter,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/super-admin/finance?${params.toString()}`, {
        headers: adminHeaders(),
        signal: controller.signal,
      });

      if (currentSeq !== seqRef.current) return;

      if (res.ok) {
        setFinanceData(await res.json());
      } else {
        showToast('Failed to load finance data');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      showToast('Network error');
    } finally {
      if (currentSeq === seqRef.current) {
        setFinLoading(false);
      }
    }
  }, [dateFilter, getDateRange, page, limit, search, typeFilter, adminHeaders, showToast]);

  useEffect(() => { fetchFinanceData(); }, [fetchFinanceData]);

  const exportPDF = async () => {
    try {
      setExporting(true);
      const jspdfModule = await import('jspdf');
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
      await import('jspdf-autotable');
      const doc = new jsPDF('landscape');
      const { start, end } = getDateRange(dateFilter);

      const res = await fetch(`/api/super-admin/finance?start_date=${start}&end_date=${end}&type=${typeFilter}&export_all=true`, {
        headers: adminHeaders(),
      });
      const dataToExport = res.ok ? await res.json() : financeData;
      if (!dataToExport) return;

      doc.setFontSize(18);
      doc.text('Financial Ledger & Revenue Statement', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${start} to ${end}  |  Type: ${typeFilter.toUpperCase()}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      // Summary
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Total Inflow: ${formatPrice(dataToExport.summary?.totalRevenue || 0)}  |  Total Deposits: ${formatPrice(dataToExport.summary?.totalDeposits || 0)}  |  Pass Sales: ${formatPrice(dataToExport.summary?.totalPassSales || 0)}  |  Wallet Liability: ${formatPrice(dataToExport.summary?.walletLiability || 0)}`, 14, 44);

      // Transaction table
      const rows = (dataToExport.transactions || []).map(t => [
        new Date(t.date).toLocaleString(),
        t.type_label,
        t.customer_name || 'Guest',
        t.plan || '-',
        t.voucher_code || '-',
        t.payment_method?.toUpperCase() || '-',
        formatPrice(t.amount),
        t.status?.toUpperCase() || 'SUCCESS',
      ]);

      doc.autoTable({
        startY: 50,
        head: [['Date & Time', 'Type', 'Customer', 'Plan / Purpose', 'Voucher Code', 'Method', 'Amount', 'Status']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [114, 87, 255] },
        styles: { fontSize: 8 },
      });

      doc.save(`finance_report_${start}_to_${end}.pdf`);
      showToast('✅ Full PDF exported!');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const XLSX = await import('xlsx');
      const { start, end } = getDateRange(dateFilter);

      const res = await fetch(`/api/super-admin/finance?start_date=${start}&end_date=${end}&type=${typeFilter}&export_all=true`, {
        headers: adminHeaders(),
      });
      const dataToExport = res.ok ? await res.json() : financeData;
      if (!dataToExport) return;

      // Summary sheet
      const summaryData = [
        ['Financial Ledger Report'],
        [`Period: ${start} to ${end}`],
        [`Filter: ${typeFilter}`],
        [],
        ['Metric', 'Value'],
        ['Total Cash Inflow (₦)', dataToExport.summary?.totalRevenue || 0],
        ['Total Wallet Deposits (₦)', dataToExport.summary?.totalDeposits || 0],
        ['Total Pass Sales (₦)', dataToExport.summary?.totalPassSales || 0],
        ['Customer Wallet Liability (₦)', dataToExport.summary?.walletLiability || 0],
        ['Total Transactions', dataToExport.summary?.totalTransactions || 0],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);

      // Transactions sheet
      const txHeaders = ['Date', 'Type', 'Customer Name', 'Customer Phone', 'Plan / Purpose', 'Voucher Code', 'Method', 'Reference', 'Amount (₦)', 'Status'];
      const txRows = (dataToExport.transactions || []).map(t => [
        new Date(t.date).toLocaleString(),
        t.type_label,
        t.customer_name || 'Guest',
        t.customer_phone || '-',
        t.plan || '-',
        t.voucher_code || '-',
        t.payment_method || '-',
        t.ref || '-',
        t.amount,
        t.status || 'successful',
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
      XLSX.utils.book_append_sheet(wb, ws2, 'Ledger Transactions');

      XLSX.writeFile(wb, `finance_report_${start}_to_${end}.xlsx`);
      showToast('✅ Full Excel exported!');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const summary = financeData?.summary || {};
  const transactions = financeData?.transactions || [];
  const pagination = financeData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const totalMatching = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;
  const fromRecord = totalMatching === 0 ? 0 : (page - 1) * limit + 1;
  const toRecord = Math.min(totalMatching, page * limit);

  return (
    <>
      {/* Date & Type Filters */}
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Financial Ledger & Revenue</h3>
            <p className="sa-card-sub">Deposits, voucher purchases, customer wallet balances & audit</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="sa-btn-primary" onClick={exportPDF} disabled={!financeData || finLoading || exporting}
              style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {exporting ? '⏳ Exporting...' : '📄 Export PDF'}
            </button>
            <button className="sa-btn-primary" onClick={runReconcile} disabled={reconciling}
              style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', borderColor: '#10b981' }}>
              {reconciling ? '⏳ Auditing...' : '🔍 Gateway Audit'}
            </button>
            <button className="sa-btn-outline" onClick={exportExcel} disabled={!financeData || finLoading || exporting}
              style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {exporting ? '⏳ Exporting...' : '📊 Export Excel'}
            </button>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#8E8E93', alignSelf: 'center', marginRight: 4 }}>Period:</span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom' },
          ].map(f => (
            <button key={f.id}
              className={`sa-btn-outline ${dateFilter === f.id ? 'sa-filter-active' : ''}`}
              onClick={() => { setDateFilter(f.id); setPage(1); }}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20,
                background: dateFilter === f.id ? 'var(--primary-color, #7257FF)' : 'transparent',
                color: dateFilter === f.id ? '#fff' : 'inherit',
                borderColor: dateFilter === f.id ? 'var(--primary-color, #7257FF)' : 'rgba(255,255,255,0.12)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Transaction Type Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#8E8E93', alignSelf: 'center', marginRight: 4 }}>Filter:</span>
          {[
            { id: 'all', label: '⚡ All Activity' },
            { id: 'deposit', label: '💰 Wallet Deposits' },
            { id: 'purchase', label: '🎟️ Pass Purchases' },
            { id: 'transfer', label: '⇄ Wallet Transfers' },
          ].map(t => (
            <button key={t.id}
              className={`sa-btn-outline ${typeFilter === t.id ? 'sa-filter-active' : ''}`}
              onClick={() => { setTypeFilter(t.id); setPage(1); }}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20,
                background: typeFilter === t.id ? '#10b981' : 'transparent',
                color: typeFilter === t.id ? '#fff' : 'inherit',
                borderColor: typeFilter === t.id ? '#10b981' : 'rgba(255,255,255,0.12)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="sa-field-box" style={{ flex: 1, minWidth: 160 }}>
              <label>Start Date</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div className="sa-field-box" style={{ flex: 1, minWidth: 160 }}>
              <label>End Date</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
            <button className="sa-btn-primary" onClick={() => { setPage(1); fetchFinanceData(); }}
              style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Summary KPIs */}
      {finLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>Loading financial ledger...</div>
      ) : (
        <>
          <div className="sa-kpi-grid" style={{ marginTop: 20 }}>
            <div className="sa-kpi-card sa-kpi-hero">
              <div className="sa-kpi-top"><span className="sa-kpi-label">Total Cash Inflow</span></div>
              <div className="sa-kpi-value">{formatPrice(summary.totalRevenue || 0)}</div>
              <div className="sa-kpi-footer">Deposits & direct card payments</div>
            </div>
            <div className="sa-kpi-card">
              <div className="sa-kpi-top"><span className="sa-kpi-label">Wallet Deposits</span></div>
              <div className="sa-kpi-value sa-color-green">{formatPrice(summary.totalDeposits || 0)}</div>
              <div className="sa-kpi-footer">{summary.depositCount || 0} top-up transactions</div>
            </div>
            <div className="sa-kpi-card">
              <div className="sa-kpi-top"><span className="sa-kpi-label">Wi-Fi Pass Sales</span></div>
              <div className="sa-kpi-value" style={{ color: '#7257FF' }}>{formatPrice(summary.totalPassSales || 0)}</div>
              <div className="sa-kpi-footer">{summary.totalSales || 0} passes sold</div>
            </div>
            <div className="sa-kpi-card">
              <div className="sa-kpi-top"><span className="sa-kpi-label">Customer Wallets</span></div>
              <div className="sa-kpi-value" style={{ color: '#F59E0B' }}>{formatPrice(summary.walletLiability || 0)}</div>
              <div className="sa-kpi-footer">Unspent customer balance held</div>
            </div>
          </div>

          {/* Transactions Table with Search & Pagination */}
          <div className="sa-glass-card" style={{ marginTop: 20 }}>
            <div className="sa-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className="sa-card-title">Financial Activity Ledger</h3>
                <p className="sa-card-sub">
                  Showing {fromRecord}–{toRecord} of {totalMatching} records
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search customer, ref, plan..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    minWidth: 220,
                  }}
                />
                <select
                  value={limit}
                  onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{
                    background: '#1A1A24',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#8E8E93' }}>
                {finLoading ? 'Loading activity...' : 'No transactions recorded in this period'}
              </div>
            ) : (
              <>
                <div className="sa-table-responsive">
                  <table className="sa-modern-table">
                    <thead><tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Plan / Purpose</th>
                      <th>Method / Ref</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr></thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {new Date(t.date).toLocaleDateString()} <span style={{ color: '#8E8E93' }}>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td>
                            <span className="sa-badge" style={{
                              background: t.type === 'wallet_topup' ? 'rgba(16, 185, 129, 0.15)' : t.type === 'voucher_purchase' ? 'rgba(114, 87, 255, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: t.type === 'wallet_topup' ? '#10B981' : t.type === 'voucher_purchase' ? '#C4B5FD' : '#60A5FA',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}>
                              {t.type_label}
                            </span>
                          </td>
                          <td>
                            <strong>{t.customer_name}</strong>
                            {t.customer_phone && <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>{t.customer_phone}</div>}
                          </td>
                          <td>
                            <span>{t.plan || '—'}</span>
                            {t.voucher_code && t.voucher_code !== '-' && (
                              <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                                Code: <code style={{ color: '#C4B5FD' }}>{t.voucher_code}</code>
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>{t.payment_method}</span>
                            {t.ref && t.ref !== '-' && (
                              <div style={{ fontSize: '0.7rem', color: '#8E8E93', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.ref}>
                                {t.ref}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong style={{
                              color: t.type === 'wallet_topup' ? '#10B981' : '#fff',
                              fontSize: '0.95rem'
                            }}>
                              {t.type === 'wallet_topup' ? '+' : ''}{formatPrice(t.amount)}
                            </strong>
                          </td>
                          <td>
                            <span className={`sa-badge ${t.status === 'successful' ? 'sa-badge-success' : 'sa-badge-muted'}`}>
                              {t.status}
                            </span>
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
                    Showing <strong>{fromRecord}</strong> to <strong>{toRecord}</strong> of <strong>{totalMatching}</strong> records (Page {page} of {totalPages})
                  </span>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="sa-btn-outline"
                      disabled={page <= 1 || finLoading}
                      onClick={() => setPage(1)}
                      style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: page <= 1 ? 0.4 : 1 }}
                    >
                      « First
                    </button>
                    <button
                      type="button"
                      className="sa-btn-outline"
                      disabled={page <= 1 || finLoading}
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
                      disabled={page >= totalPages || finLoading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: page >= totalPages ? 0.4 : 1 }}
                    >
                      Next ›
                    </button>
                    <button
                      type="button"
                      className="sa-btn-outline"
                      disabled={page >= totalPages || finLoading}
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
        </>
      )}
    </>
  );
}

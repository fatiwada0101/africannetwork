'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CARD_STYLES,
  CARDS_PER_PAGE_PRESETS,
  drawSingleVoucherPreview,
  printVoucherCards,
  downloadVoucherSheetPdf,
  downloadVoucherSheetImage,
} from '@/lib/voucherCardGenerator';
import { PrinterIcon, DownloadIcon } from '../../components/Icons';

export default function VoucherPrintModal({
  isOpen,
  onClose,
  vouchers = [],
  allVouchers = [],
  brandName = 'African Network Wi-Fi',
  ssid = 'African Network Wi-Fi',
  defaultPlanName = '1 Day Pass',
  defaultPrice = 100,
  defaultExpiry = '24h',
  defaultDataLimit = 'Unlimited',
  showToast = () => {},
}) {
  // Card layout & style state
  const [style, setStyle] = useState('branded');
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(4);
  const [isCustomGrid, setIsCustomGrid] = useState(false);
  const [scope, setScope] = useState('all'); // 'all' | 'page'
  const [previewIndex, setPreviewIndex] = useState(0);

  // Content toggles
  const [showSsid, setShowSsid] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showExpiry, setShowExpiry] = useState(true);
  const [showDataLimit, setShowDataLimit] = useState(true);
  const [showSerial, setShowSerial] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(true);

  // Loading states
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef(null);

  // Target voucher list based on scope
  const targetList = scope === 'page' && vouchers.length > 0 ? vouchers : allVouchers;
  const cardsPerPage = cols * rows;
  const totalCards = targetList.length;
  const totalSheets = Math.max(1, Math.ceil(totalCards / cardsPerPage));
  const isLandscape = cols > rows || (cols === 3 && rows === 4);

  // Active sample voucher for live preview
  const currentVoucher = targetList[previewIndex] || targetList[0] || {
    code: '782941',
    voucher_code: '782941',
    serial_number: 1,
    plan_name: defaultPlanName,
    price: defaultPrice,
    expiry: defaultExpiry,
    data_limit: defaultDataLimit,
  };

  // Render live canvas preview whenever any design/option/voucher changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    drawSingleVoucherPreview(canvasRef.current, currentVoucher, {
      style,
      brandName,
      ssid,
      showSsid,
      showPrice,
      showExpiry,
      showDataLimit,
      showSerial,
      showCutGuides,
    });
  }, [
    isOpen,
    style,
    brandName,
    ssid,
    showSsid,
    showPrice,
    showExpiry,
    showDataLimit,
    showSerial,
    showCutGuides,
    currentVoucher,
  ]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset) => {
    setCols(preset.cols);
    setRows(preset.rows);
    setIsCustomGrid(false);
  };

  const handleCustomCols = (val) => {
    const num = Math.min(5, Math.max(1, Number(val) || 1));
    setCols(num);
    setIsCustomGrid(true);
  };

  const handleCustomRows = (val) => {
    const num = Math.min(8, Math.max(1, Number(val) || 1));
    setRows(num);
    setIsCustomGrid(true);
  };

  const prepareVouchersForExport = () => {
    return targetList.map((v, idx) => ({
      code: v.code || v.voucher_code || '00000',
      serial_number: v.serial_number || (idx + 1),
      expiry: v.expiry || v.duration || defaultExpiry,
      data_limit: v.data_limit || defaultDataLimit,
      batch_id: v.batch_id,
      plan_name: v.plan_name || defaultPlanName,
      price: v.price !== undefined ? v.price : defaultPrice,
    }));
  };

  const getExportOptions = () => ({
    style,
    cols,
    rows,
    brandName,
    ssid,
    showSsid,
    showPrice,
    showExpiry,
    showDataLimit,
    showSerial,
    showCutGuides,
  });

  const handlePrint = async () => {
    if (targetList.length === 0) return showToast('No vouchers available to print');
    setExporting(true);
    try {
      const items = prepareVouchersForExport();
      await printVoucherCards(items, getExportOptions());
      showToast(`🖨️ Print dialog opened (${items.length} cards, ${totalSheets} sheets)`);
    } catch (err) {
      showToast('Print failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = async () => {
    if (targetList.length === 0) return showToast('No vouchers available to download');
    setExporting(true);
    try {
      const items = prepareVouchersForExport();
      await downloadVoucherSheetPdf(items, getExportOptions());
      showToast(`📄 PDF downloaded (${items.length} cards, ${totalSheets} A4 pages)`);
    } catch (err) {
      showToast('PDF download failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImage = () => {
    if (targetList.length === 0) return showToast('No vouchers available to download');
    setExporting(true);
    try {
      const items = prepareVouchersForExport();
      downloadVoucherSheetImage(items, getExportOptions());
      showToast(`🖼️ High-resolution sheet image downloaded (${items.length} cards)`);
    } catch (err) {
      showToast('Image download failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Savings calculation vs default 8 cards
  const paperSavings = cardsPerPage > 8 ? Math.round(((cardsPerPage - 8) / cardsPerPage) * 100) : 0;

  return (
    <div
      className="sa-modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 10000,
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="sa-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1060px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#12141F',
          border: '1px solid rgba(114, 87, 255, 0.28)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(114, 87, 255, 0.12) 0%, rgba(18, 20, 31, 0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7257FF, #5b3cc4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(114, 87, 255, 0.35)',
              }}
            >
              🖨️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>
                Print & Card Customization Studio
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
                Choose card visual design, configure cards per A4 page, and preview before printing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94A3B8',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 380px) 1fr',
            gap: 24,
            flex: 1,
          }}
        >
          {/* ════ LEFT COLUMN: LIVE CARD PREVIEW & STATS ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Live Card Preview Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C4B5FD' }}>
                  Live Card Preview
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: CARD_STYLES[style]?.previewColor || '#7257FF',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {CARD_STYLES[style]?.name || 'Current Style'}
                </span>
              </div>

              {/* Canvas Preview Container with subtle drop-shadow */}
              <div
                style={{
                  background: '#090a10',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    maxWidth: 360,
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  }}
                />
              </div>

              {/* Sample Voucher Navigation */}
              {targetList.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}>
                  <span>
                    Previewing voucher #{previewIndex + 1} of {targetList.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                      disabled={previewIndex === 0}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 5,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: previewIndex === 0 ? '#475569' : '#fff',
                        cursor: previewIndex === 0 ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                      }}
                    >
                      ‹ Prev
                    </button>
                    <button
                      onClick={() => setPreviewIndex((i) => Math.min(targetList.length - 1, i + 1))}
                      disabled={previewIndex >= targetList.length - 1}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 5,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: previewIndex >= targetList.length - 1 ? '#475569' : '#fff',
                        cursor: previewIndex >= targetList.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                      }}
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Print Allocation Summary Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(114, 87, 255, 0.08), rgba(16, 185, 129, 0.06))',
                border: '1px solid rgba(114, 87, 255, 0.22)',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C4B5FD' }}>A4 Page Output Metrics</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: isLandscape ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isLandscape ? '#60A5FA' : '#34D399',
                    border: `1px solid ${isLandscape ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}
                >
                  {isLandscape ? '📐 Landscape A4' : '📄 Portrait A4'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px', borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{cardsPerPage}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Cards / Sheet</div>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px', borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#81C995' }}>{totalSheets}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>A4 Sheets Req.</div>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px', borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#C4B5FD' }}>{totalCards}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>Total Vouchers</div>
                </div>
              </div>

              {paperSavings > 0 && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    color: '#34D399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>🌿</span>
                  <span><strong>{paperSavings}% Paper Saved</strong> compared to standard 8 cards/sheet!</span>
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT COLUMN: CUSTOMIZATION SETTINGS ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── 1. CARDS PER A4 PAGE ALLOCATION ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  1. How Many Cards Fit Per A4 Page?
                </label>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  Active Grid: <strong>{cols} columns × {rows} rows ({cardsPerPage} cards)</strong>
                </span>
              </div>

              {/* Preset Allocation Buttons */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: 8,
                }}
              >
                {CARDS_PER_PAGE_PRESETS.map((p) => {
                  const isSelected = !isCustomGrid && cols === p.cols && rows === p.rows;
                  return (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 10,
                        border: isSelected
                          ? '2px solid #7257FF'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(114, 87, 255, 0.22), rgba(114, 87, 255, 0.08))'
                          : 'rgba(255, 255, 255, 0.03)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#C4B5FD' : '#fff' }}>
                          {p.count} Cards
                        </span>
                        {p.recommended && (
                          <span style={{ fontSize: 9, background: '#7257FF', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                            Default
                          </span>
                        )}
                        {p.popular && !p.recommended && (
                          <span style={{ fontSize: 9, background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                            Save Paper
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: isSelected ? '#DDD6FE' : '#94A3B8' }}>
                        {p.cols}×{p.rows} • {p.orientation}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Grid Inputs */}
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isCustomGrid ? 'rgba(114, 87, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isCustomGrid ? '1px solid rgba(114, 87, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '8px 12px',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#C4B5FD' }}>Or Custom Grid:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <label style={{ color: '#94A3B8' }}>Cols:</label>
                  <select
                    value={cols}
                    onChange={(e) => handleCustomCols(e.target.value)}
                    style={{
                      background: '#1E2235',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 12,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((c) => (
                      <option key={c} value={c}>{c} cols</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <label style={{ color: '#94A3B8' }}>Rows:</label>
                  <select
                    value={rows}
                    onChange={(e) => handleCustomRows(e.target.value)}
                    style={{
                      background: '#1E2235',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 12,
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => (
                      <option key={r} value={r}>{r} rows</option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  = <strong>{cols * rows} cards/sheet</strong>
                </span>
              </div>
            </div>

            {/* ── 2. CARD DESIGN PICKER ── */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'block', marginBottom: 8 }}>
                2. Select Card Visual Design & Theme
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: 10,
                }}
              >
                {Object.values(CARD_STYLES).map((s) => {
                  const isSelected = style === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle(s.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: isSelected
                          ? '2px solid #7257FF'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(114, 87, 255, 0.2), rgba(114, 87, 255, 0.05))'
                          : 'rgba(255, 255, 255, 0.03)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: s.previewColor,
                              boxShadow: `0 0 8px ${s.previewColor}88`,
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : '#E2E8F0' }}>
                            {s.name}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.3 }}>
                        {s.description}
                      </div>
                      {s.tag && (
                        <div style={{ marginTop: 2 }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: isSelected ? 'rgba(114, 87, 255, 0.4)' : 'rgba(255, 255, 255, 0.06)',
                              color: isSelected ? '#C4B5FD' : '#94A3B8',
                            }}
                          >
                            {s.tag}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 3. CARD CONTENT TOGGLES & SCOPE ── */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C4B5FD' }}>
                  Card Fields & Trimming:
                </span>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="radio"
                      name="modalScope"
                      value="all"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                    />
                    <span>All Vouchers ({allVouchers.length})</span>
                  </label>
                  {vouchers.length > 0 && vouchers.length !== allVouchers.length && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#fff' }}>
                      <input
                        type="radio"
                        name="modalScope"
                        value="page"
                        checked={scope === 'page'}
                        onChange={() => setScope('page')}
                      />
                      <span>Current Page ({vouchers.length})</span>
                    </label>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showSsid} onChange={(e) => setShowSsid(e.target.checked)} />
                  <span>Wi-Fi SSID</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                  <span>Price (₦)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showExpiry} onChange={(e) => setShowExpiry(e.target.checked)} />
                  <span>Expiry</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showDataLimit} onChange={(e) => setShowDataLimit(e.target.checked)} />
                  <span>Data Limit</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showSerial} onChange={(e) => setShowSerial(e.target.checked)} />
                  <span>Serial #</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#E2E8F0' }}>
                  <input type="checkbox" checked={showCutGuides} onChange={(e) => setShowCutGuides(e.target.checked)} />
                  <span>✂ Scissors Cut Guides</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer with Print & Export Actions ── */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            Ready to output <strong>{totalCards} cards</strong> across <strong>{totalSheets} {isLandscape ? 'Landscape' : 'Portrait'} A4 page{totalSheets > 1 ? 's' : ''}</strong>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                color: '#fff',
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImage}
              disabled={exporting || totalCards === 0}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                color: '#fff',
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: exporting || totalCards === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              🖼️ Save PNG
            </button>

            <button
              type="button"
              onClick={handlePdf}
              disabled={exporting || totalCards === 0}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: exporting || totalCards === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <DownloadIcon size={14} color="#fff" />
              <span>📄 Download A4 PDF ({totalCards})</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={exporting || totalCards === 0}
              style={{
                background: 'linear-gradient(135deg, #7257FF, #5B3CC4)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
                cursor: exporting || totalCards === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 16px rgba(114, 87, 255, 0.4)',
              }}
            >
              <PrinterIcon size={14} color="#fff" />
              <span>{exporting ? 'Opening Print...' : `🖨️ Print ${totalCards} Cards`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

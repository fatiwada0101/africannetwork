'use client';

/**
 * Voucher Card Generator — Canvas-based rendering engine for printable voucher cards.
 * Supports customizable A4 page allocations (4, 6, 8, 10, 12, 16, 20, 24+ cards per page),
 * multiple distinct card designs, PDF export, image export, and native print dialog.
 */

// ═══════════════════════════════════════════════════════════
// CONSTANTS & STYLE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export const CARD_W = 360;
export const CARD_H = 220;
const DPR = 2; // High-resolution retina render

export const CARD_STYLES = {
  branded: {
    id: 'branded',
    name: 'Royal Purple',
    description: 'Vibrant signature gradient with clean modern typography',
    tag: 'Recommended',
    bg: '#ffffff',
    gradientColors: ['#7257FF', '#5b3cc4'],
    headerColor: '#ffffff',
    accentColor: '#7257FF',
    codeBg: '#f4f0ff',
    codeColor: '#4f35c2',
    codeBorderColor: '#7257FF',
    textColor: '#1f2937',
    subColor: '#6b7280',
    borderColor: '#dcd6fa',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeColor: '#ffffff',
    isDark: false,
    previewColor: '#7257FF',
  },
  minimal: {
    id: 'minimal',
    name: 'Clean Ink-Saver',
    description: 'Black & white eco-design, saves printer toner & ink cartridges',
    tag: 'Eco Ink-Saver',
    bg: '#ffffff',
    headerBg: '#18181b',
    headerColor: '#ffffff',
    accentColor: '#18181b',
    codeBg: '#f4f4f5',
    codeColor: '#09090b',
    codeBorderColor: '#71717a',
    textColor: '#27272a',
    subColor: '#71717a',
    borderColor: '#a1a1aa',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    badgeColor: '#ffffff',
    isDark: false,
    isInkSaver: true,
    previewColor: '#27272a',
  },
  premium: {
    id: 'premium',
    name: 'Golden VIP Dark',
    description: 'Deep midnight card with rich metallic gold gradient accents',
    tag: 'VIP / Luxury',
    bg: '#0b0f19',
    gradientColors: ['#f59e0b', '#d97706'],
    headerColor: '#0b0f19',
    accentColor: '#fbbf24',
    codeBg: '#131926',
    codeColor: '#fbbf24',
    codeBorderColor: '#d97706',
    textColor: '#e2e8f0',
    subColor: '#94a3b8',
    borderColor: '#2d3748',
    badgeBg: 'rgba(0, 0, 0, 0.3)',
    badgeColor: '#0b0f19',
    isDark: true,
    previewColor: '#f59e0b',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Speed',
    description: 'Fresh tech green gradient, high contrast, vibrant & modern',
    tag: 'High Speed',
    bg: '#ffffff',
    gradientColors: ['#10b981', '#059669'],
    headerColor: '#ffffff',
    accentColor: '#059669',
    codeBg: '#ecfdf5',
    codeColor: '#065f46',
    codeBorderColor: '#10b981',
    textColor: '#1f2937',
    subColor: '#6b7280',
    borderColor: '#a7f3d0',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeColor: '#ffffff',
    isDark: false,
    previewColor: '#10b981',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Neo',
    description: 'Warm coral to rose gradient, high visibility & energetic',
    tag: 'Vibrant',
    bg: '#ffffff',
    gradientColors: ['#f97316', '#e11d48'],
    headerColor: '#ffffff',
    accentColor: '#e11d48',
    codeBg: '#fff1f2',
    codeColor: '#be123c',
    codeBorderColor: '#fb7185',
    textColor: '#1f2937',
    subColor: '#6b7280',
    borderColor: '#fecdd3',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeColor: '#ffffff',
    isDark: false,
    previewColor: '#e11d48',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Corporate',
    description: 'Deep cobalt blue gradient, enterprise & business lounge aesthetic',
    tag: 'Business',
    bg: '#ffffff',
    gradientColors: ['#2563eb', '#1d4ed8'],
    headerColor: '#ffffff',
    accentColor: '#1d4ed8',
    codeBg: '#eff6ff',
    codeColor: '#1e40af',
    codeBorderColor: '#3b82f6',
    textColor: '#1f2937',
    subColor: '#6b7280',
    borderColor: '#bfdbfe',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeColor: '#ffffff',
    isDark: false,
    previewColor: '#2563eb',
  },
  ticket: {
    id: 'ticket',
    name: 'Retail Ticket Pass',
    description: 'Perforated retail coupon with edge punch notches & barcode motif',
    tag: 'Coupon Tear-Off',
    bg: '#fafafa',
    gradientColors: ['#475569', '#334155'],
    headerColor: '#ffffff',
    accentColor: '#334155',
    codeBg: '#ffffff',
    codeColor: '#0f172a',
    codeBorderColor: '#64748b',
    textColor: '#1e293b',
    subColor: '#64748b',
    borderColor: '#cbd5e1',
    badgeBg: 'rgba(255, 255, 255, 0.2)',
    badgeColor: '#ffffff',
    isTicket: true,
    isDark: false,
    previewColor: '#475569',
  },
};

export const STYLES = CARD_STYLES; // Backward compatibility alias

export const CARDS_PER_PAGE_PRESETS = [
  { count: 4, cols: 2, rows: 2, label: '4 Cards / A4 (2×2)', subtitle: 'Large VIP Badges', orientation: 'portrait' },
  { count: 6, cols: 2, rows: 3, label: '6 Cards / A4 (2×3)', subtitle: 'Medium Large', orientation: 'portrait' },
  { count: 8, cols: 2, rows: 4, label: '8 Cards / A4 (2×4)', subtitle: 'Standard (Default)', orientation: 'portrait', recommended: true },
  { count: 10, cols: 2, rows: 5, label: '10 Cards / A4 (2×5)', subtitle: 'Compact Cards', orientation: 'portrait' },
  { count: 12, cols: 3, rows: 4, label: '12 Cards / A4 (3×4)', subtitle: 'High Density (Landscape)', orientation: 'landscape', popular: true },
  { count: 15, cols: 3, rows: 5, label: '15 Cards / A4 (3×5)', subtitle: 'Mini Cards (Landscape)', orientation: 'landscape' },
  { count: 16, cols: 4, rows: 4, label: '16 Cards / A4 (4×4)', subtitle: 'Wallet Pass (Save 50% Paper)', orientation: 'landscape', popular: true },
  { count: 18, cols: 3, rows: 6, label: '18 Cards / A4 (3×6)', subtitle: 'High Yield Slips', orientation: 'landscape' },
  { count: 20, cols: 4, rows: 5, label: '20 Cards / A4 (4×5)', subtitle: 'Ultra High Yield', orientation: 'landscape' },
  { count: 24, cols: 4, rows: 6, label: '24 Cards / A4 (4×6)', subtitle: 'Maximum Economy Slips', orientation: 'landscape' },
];

function formatPdfCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 'Free';
  return '₦' + num.toLocaleString('en-NG');
}

// ═══════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Draws rounded rectangle path with optional ticket edge punch notches.
 */
function drawCardPath(ctx, x, y, w, h, r, isTicket = false, notchY = y + 50) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);

  if (isTicket) {
    const nr = 10;
    ctx.lineTo(x + w, notchY - nr);
    ctx.arc(x + w, notchY, nr, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);

  if (isTicket) {
    const nr = 10;
    ctx.lineTo(x, notchY + nr);
    ctx.arc(x, notchY, nr, Math.PI / 2, -Math.PI / 2, true);
  }
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Draws vector Wi-Fi signal waves onto the canvas.
 */
function drawWifiIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  // Dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.45, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Inner arc
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.45, size * 0.42, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();
  // Outer arc
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.45, size * 0.82, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws simulated retail barcode lines for the ticket style.
 */
function drawBarcode(ctx, bx, by, bw, bh, color) {
  ctx.save();
  ctx.fillStyle = color;
  const barPattern = [2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1];
  let curX = bx;
  for (let i = 0; i < barPattern.length && curX < bx + bw; i++) {
    const barW = barPattern[i];
    if (i % 2 === 0) {
      ctx.fillRect(curX, by, Math.min(barW, bx + bw - curX), bh);
    }
    curX += barW + 1.2;
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// SINGLE CARD RENDERER
// ═══════════════════════════════════════════════════════════

export function drawVoucherCard(ctx, x, y, voucher, options = {}) {
  const {
    style = 'branded',
    brandName = 'African Network Wi-Fi',
    ssid = 'African Network Wi-Fi',
    showSsid = true,
    showPrice = true,
    showExpiry = true,
    showDataLimit = true,
    showSerial = true,
    showCutGuides = false,
  } = options;

  const s = CARD_STYLES[style] || CARD_STYLES.branded;
  const w = CARD_W;
  const h = CARD_H;
  const headerH = 50;
  const isTicket = s.isTicket === true;
  const notchY = y + headerH + 2;

  ctx.save();

  // 1. Card Base Background & Border
  drawCardPath(ctx, x, y, w, h, 12, isTicket, notchY);
  ctx.fillStyle = s.bg;
  ctx.fill();
  ctx.strokeStyle = s.borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip(); // Clip inner content to rounded / notched card shape

  // 2. Header Band
  if (s.gradientColors && s.gradientColors.length >= 2) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + headerH);
    grad.addColorStop(0, s.gradientColors[0]);
    grad.addColorStop(1, s.gradientColors[1]);
    ctx.fillStyle = grad;
  } else if (s.headerBg) {
    ctx.fillStyle = s.headerBg;
  } else {
    ctx.fillStyle = s.accentColor;
  }
  ctx.fillRect(x, y, w, headerH);

  // 3. Header Wi-Fi Icon & Brand Name
  drawWifiIcon(ctx, x + 22, y + 15, 12, s.headerColor);

  ctx.fillStyle = s.headerColor;
  ctx.font = 'bold 15px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  const cleanBrand = brandName || 'Wi-Fi Hotspot';
  ctx.fillText(cleanBrand.length > 18 ? cleanBrand.substring(0, 16) + '…' : cleanBrand, x + 36, y + 22);

  // 4. Subtitle with Serial Number
  ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = s.headerColor;
  ctx.globalAlpha = 0.88;
  const serialText = (showSerial && voucher.serial_number)
    ? `Wi-Fi Voucher • #${String(voucher.serial_number).padStart(3, '0')}`
    : 'Wi-Fi Access Pass';
  ctx.fillText(serialText, x + 36, y + 38);
  ctx.globalAlpha = 1.0;

  // 5. Plan Name and Meta on Top-Right
  const planLabel = voucher.plan_name || voucher.expiry || '';
  if (planLabel) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = s.headerColor;
    const truncatedPlan = planLabel.length > 18 ? planLabel.substring(0, 16) + '…' : planLabel;
    ctx.fillText(truncatedPlan, x + w - 16, y + 21);

    let metaRight = '';
    if (showExpiry && voucher.expiry) metaRight = voucher.expiry;
    if (showDataLimit && voucher.data_limit && voucher.data_limit.toLowerCase() !== 'unlimited') {
      metaRight = metaRight ? `${metaRight} • ${voucher.data_limit}` : voucher.data_limit;
    }
    if (metaRight) {
      ctx.font = '10px "Inter", "Segoe UI", system-ui, sans-serif';
      ctx.globalAlpha = 0.88;
      ctx.fillText(metaRight.length > 20 ? metaRight.substring(0, 18) + '…' : metaRight, x + w - 16, y + 37);
      ctx.globalAlpha = 1.0;
    }
  }

  // 6. Header Perforation / Tear Divider
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = s.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + (isTicket ? 16 : 8), notchY);
  ctx.lineTo(x + w - (isTicket ? 16 : 8), notchY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 7. Code Box
  const codeY = y + headerH + 15;
  const codeBoxW = w - 44;
  const codeBoxH = 46;
  const codeBoxX = x + 22;

  // Code background
  ctx.fillStyle = s.codeBg;
  const cr = 8;
  ctx.beginPath();
  ctx.moveTo(codeBoxX + cr, codeY);
  ctx.lineTo(codeBoxX + codeBoxW - cr, codeY);
  ctx.arcTo(codeBoxX + codeBoxW, codeY, codeBoxX + codeBoxW, codeY + cr, cr);
  ctx.lineTo(codeBoxX + codeBoxW, codeY + codeBoxH - cr);
  ctx.arcTo(codeBoxX + codeBoxW, codeY + codeBoxH, codeBoxX + codeBoxW - cr, codeY + codeBoxH, cr);
  ctx.lineTo(codeBoxX + cr, codeY + codeBoxH);
  ctx.arcTo(codeBoxX, codeY + codeBoxH, codeBoxX, codeY + codeBoxH - cr, cr);
  ctx.lineTo(codeBoxX, codeY + cr);
  ctx.arcTo(codeBoxX, codeY, codeBoxX + cr, codeY, cr);
  ctx.closePath();
  ctx.fill();

  // Code border
  ctx.setLineDash(s.isInkSaver || isTicket ? [5, 3] : [6, 3]);
  ctx.strokeStyle = s.codeBorderColor || s.accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // Top micro-label inside code box
  ctx.font = 'bold 9px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = s.subColor;
  ctx.textAlign = 'center';
  ctx.fillText('VOUCHER ACCESS CODE', codeBoxX + codeBoxW / 2, codeY + 12);

  // Voucher Code Monospace Text
  ctx.fillStyle = s.codeColor;
  const code = voucher.code || voucher.voucher_code || '00000';
  const fontSize = code.length > 14 ? 17 : code.length > 10 ? 19 : 23;
  ctx.font = `bold ${fontSize}px "Courier New", "Consolas", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(code, codeBoxX + codeBoxW / 2, codeY + 34);

  // 8. Info Section (SSID & Price)
  const bottomY = codeY + codeBoxH + 17;

  if (showSsid && ssid) {
    ctx.textAlign = 'left';
    ctx.font = '10px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = s.subColor;
    ctx.fillText('Network:', x + 22, bottomY);
    ctx.fillStyle = s.textColor;
    ctx.font = 'bold 10px "Inter", "Segoe UI", system-ui, sans-serif';
    const displaySsid = ssid.length > 18 ? ssid.substring(0, 16) + '…' : ssid;
    ctx.fillText(displaySsid, x + 72, bottomY);
  }

  if (showPrice && voucher.price !== undefined) {
    ctx.textAlign = 'right';
    ctx.fillStyle = s.accentColor;
    ctx.font = 'bold 13px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(formatPdfCurrency(voucher.price), x + w - 22, bottomY);
  }

  // 9. Instructions / Batch Footer
  const footerY = bottomY + 18;

  if (isTicket) {
    // Ticket style barcode decoration
    drawBarcode(ctx, x + 24, footerY - 5, 80, 10, s.subColor);
    ctx.font = '8px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = s.subColor;
    ctx.textAlign = 'right';
    ctx.fillText(voucher.batch_id ? `[BATCH ${voucher.batch_id}] • TEAR HERE` : 'OFFICIAL HOTSPOT VOUCHER', x + w - 22, footerY + 3);
  } else {
    ctx.font = '9px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = s.subColor;
    ctx.textAlign = 'center';
    const footerText = voucher.batch_id
      ? `Connect to Wi-Fi → Enter code to login • [${voucher.batch_id}]`
      : 'Connect to Wi-Fi → Open browser → Enter code above → Enjoy!';
    ctx.fillText(footerText, x + w / 2, footerY);
  }

  // 10. Corner Scissors / Cut Guidelines if requested
  if (showCutGuides || s.isInkSaver) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Top-left tick
    ctx.moveTo(x, y + 8); ctx.lineTo(x, y); ctx.lineTo(x + 8, y);
    // Top-right tick
    ctx.moveTo(x + w - 8, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + 8);
    // Bottom-left tick
    ctx.moveTo(x, y + h - 8); ctx.lineTo(x, y + h); ctx.lineTo(x + 8, y + h);
    // Bottom-right tick
    ctx.moveTo(x + w - 8, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - 8);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a single voucher preview onto any given HTMLCanvasElement in real time.
 */
export function drawSingleVoucherPreview(canvas, voucher, options = {}) {
  if (!canvas) return;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2) : 2;
  canvas.width = CARD_W * dpr;
  canvas.height = CARD_H * dpr;
  canvas.style.width = '100%';
  canvas.style.maxWidth = `${CARD_W}px`;
  canvas.style.height = 'auto';
  canvas.style.aspectRatio = `${CARD_W} / ${CARD_H}`;

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  drawVoucherCard(ctx, 0, 0, voucher, options);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// SHEET RENDERER (Multiple cards on a page)
// ═══════════════════════════════════════════════════════════

/**
 * Render a full sheet of voucher cards as a high-res canvas.
 */
export function generateVoucherSheet(vouchers, options = {}) {
  const { cols = 2, rows = 4, showCutGuides = true } = options;
  const padding = 20;
  const gap = 16;

  const sheetW = cols * CARD_W + (cols - 1) * gap + padding * 2;
  const sheetH = rows * CARD_H + (rows - 1) * gap + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW * DPR;
  canvas.height = sheetH * DPR;
  canvas.style.width = sheetW + 'px';
  canvas.style.height = sheetH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // Clean white sheet background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);

  // Render cards in grid
  const perPage = cols * rows;
  for (let i = 0; i < Math.min(vouchers.length, perPage); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (CARD_W + gap);
    const y = padding + row * (CARD_H + gap);
    drawVoucherCard(ctx, x, y, vouchers[i], options);
  }

  // Draw cutting guideline dashes between cards
  if (showCutGuides) {
    ctx.save();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);

    for (let c = 1; c < cols; c++) {
      const cutX = padding + c * CARD_W + (c - 0.5) * gap;
      ctx.beginPath();
      ctx.moveTo(cutX, 4);
      ctx.lineTo(cutX, sheetH - 4);
      ctx.stroke();
    }

    for (let r = 1; r < rows; r++) {
      const cutY = padding + r * CARD_H + (r - 0.5) * gap;
      ctx.beginPath();
      ctx.moveTo(4, cutY);
      ctx.lineTo(sheetW - 4, cutY);
      ctx.stroke();
    }

    ctx.restore();
  }

  return canvas;
}

// ═══════════════════════════════════════════════════════════
// PDF EXPORT (True Standard A4 Scaling)
// ═══════════════════════════════════════════════════════════

/**
 * Generate a multi-page PDF with voucher cards scaled onto standard A4 pages.
 */
export async function downloadVoucherSheetPdf(vouchers, options = {}) {
  const { cols = 2, rows = 4 } = options;
  const perPage = cols * rows;

  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;

  const padding = 20;
  const gap = 16;
  const sheetW = cols * CARD_W + (cols - 1) * gap + padding * 2;
  const sheetH = rows * CARD_H + (rows - 1) * gap + padding * 2;

  // Determine standard A4 orientation
  const isLandscape = sheetW > sheetH;
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // Standard A4 dimensions in mm
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 8;
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2;

  const sheetRatio = sheetW / sheetH;
  const availRatio = availW / availH;
  let targetW, targetH;
  if (sheetRatio > availRatio) {
    targetW = availW;
    targetH = availW / sheetRatio;
  } else {
    targetH = availH;
    targetW = availH * sheetRatio;
  }
  const posX = margin + (availW - targetW) / 2;
  const posY = margin + (availH - targetH) / 2;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const totalPages = Math.ceil(vouchers.length / perPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage('a4', orientation);

    const pageVouchers = vouchers.slice(page * perPage, (page + 1) * perPage);
    const canvas = generateVoucherSheet(pageVouchers, { ...options, cols, rows });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', posX, posY, targetW, targetH, undefined, 'FAST');
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`voucher-cards-${timestamp}.pdf`);
}

// ═══════════════════════════════════════════════════════════
// IMAGE EXPORT
// ═══════════════════════════════════════════════════════════

export function downloadVoucherSheetImage(vouchers, options = {}) {
  const canvas = generateVoucherSheet(vouchers, options);
  const dataUrl = canvas.toDataURL('image/png');

  try {
    const blob = dataURLtoBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voucher-cards-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `voucher-cards-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }
}

function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const b64 = atob(parts[1]);
  const u8arr = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) u8arr[i] = b64.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

// ═══════════════════════════════════════════════════════════
// PRINT DIALOG (Guaranteed 1-Page-Per-Sheet Fit)
// ═══════════════════════════════════════════════════════════

export async function printVoucherCards(vouchers, options = {}) {
  const { cols = 2, rows = 4 } = options;
  const perPage = cols * rows;
  const totalPages = Math.ceil(vouchers.length / perPage);

  const padding = 20;
  const gap = 16;
  const sheetW = cols * CARD_W + (cols - 1) * gap + padding * 2;
  const sheetH = rows * CARD_H + (rows - 1) * gap + padding * 2;
  const isLandscape = sheetW > sheetH;

  let pagesHtml = '';
  for (let page = 0; page < totalPages; page++) {
    const pageVouchers = vouchers.slice(page * perPage, (page + 1) * perPage);
    const canvas = generateVoucherSheet(pageVouchers, { ...options, cols, rows });
    const imgData = canvas.toDataURL('image/png');
    pagesHtml += `
      <div class="print-page">
        <img src="${imgData}" alt="Voucher Sheet ${page + 1}" />
      </div>
    `;
  }

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Voucher Cards (${vouchers.length} Cards)</title>
  <style>
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'};
      margin: 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      width: 100%;
      height: 100%;
    }
    .print-page {
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
      box-sizing: border-box;
      padding: 0;
    }
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .print-page img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: auto;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .print-page {
        height: auto;
        max-height: none;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        padding: 10px;
        border-radius: 6px;
      }
      .print-page img {
        max-width: 800px;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  // Use hidden iframe approach
  let iframe = document.getElementById('voucher-print-frame');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'voucher-print-frame';
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:700px;border:none;';
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(printHtml);
  iframe.contentDocument.close();

  await new Promise(resolve => {
    iframe.onload = resolve;
    setTimeout(resolve, 600);
  });

  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
      win.focus();
      win.print();
    }
  }
}

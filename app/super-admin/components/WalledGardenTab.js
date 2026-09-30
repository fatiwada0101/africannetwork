'use client';

import { useState } from 'react';
import { RefreshIcon, TrashIcon } from '../../components/Icons';
import WindowsProgressBar from '../../components/WindowsProgressBar';

export default function WalledGardenTab({
  adminHeaders,
  showToast,
  walledGardenEntries,
  fetchWalledGarden,
  wgLoading,
  brandingForm,
}) {
  const [wgCustomUrl, setWgCustomUrl] = useState('');
  const [wgCustomComment, setWgCustomComment] = useState('');
  const [wgSyncing, setWgSyncing] = useState(false);
  const [wgBulkProgress, setWgBulkProgress] = useState({
    active: false,
    percent: 0,
    title: '',
    subtitle: '',
    status: 'normal',
    itemCount: '',
    elapsedText: '',
    canRetry: false,
    failedList: [],
  });

  const currentAppHost = (() => {
    try {
      if (brandingForm.app_url) {
        return new URL(brandingForm.app_url.startsWith('http') ? brandingForm.app_url : `https://${brandingForm.app_url}`).hostname;
      }
      if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.hostname;
      }
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return new URL(process.env.NEXT_PUBLIC_APP_URL.startsWith('http') ? process.env.NEXT_PUBLIC_APP_URL : `https://${process.env.NEXT_PUBLIC_APP_URL}`).hostname;
      }
    } catch {}
    return 'www.africannetwork.com';
  })();

  const currentApexDomain = (() => {
    const parts = currentAppHost.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : currentAppHost;
  })();

  const currentSupabaseHost = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) return new URL(url).hostname;
    } catch {}
    return '';
  })();

  const CORE_SYSTEM_DOMAINS = [
    ...(currentAppHost ? [{ domain: currentAppHost, label: `${brandingForm.app_name || 'App'} Web Portal (${currentAppHost})` }] : []),
    ...(currentApexDomain && currentApexDomain !== currentAppHost ? [{ domain: currentApexDomain, label: `${brandingForm.app_name || 'App'} Apex (${currentApexDomain})` }] : []),
    ...(currentApexDomain ? [{ domain: `*.${currentApexDomain}`, label: `${brandingForm.app_name || 'App'} Wildcard (*.${currentApexDomain})` }] : []),
    ...(currentSupabaseHost ? [{ domain: currentSupabaseHost, label: `Supabase Cloud API (${currentSupabaseHost})` }] : []),
    { domain: '*.supabase.co', label: 'Supabase Global APIs' },
  ];

  const PAYMENT_GATEWAYS = [
    { domain: '*.flutterwave.com', label: 'Flutterwave Core' },
    { domain: '*.flw.io', label: 'Flutterwave CDN' },
    { domain: '*.ravepay.co', label: 'Rave by Flutterwave' },
    { domain: '*.paystack.com', label: 'Paystack Checkout' },
    { domain: '*.paystack.co', label: 'Paystack API' },
    { domain: '*.remita.net', label: 'Remita Gateway' },
    { domain: '*.interswitchng.com', label: 'Interswitch Webpay' },
    { domain: '*.quickteller.com', label: 'Quickteller' },
    { domain: '*.interswitch.com', label: 'Interswitch Global' },
    { domain: '*.unifiedpaymentsnigeria.com', label: 'Unified Payments (UP)' },
    { domain: '*.monnify.com', label: 'Monnify Gateway' },
    { domain: '*.squadco.com', label: 'Squad by HabariPay' },
    { domain: '*.habaripay.com', label: 'HabariPay Gateway' },
    { domain: '*.nomba.com', label: 'Nomba (Kudi)' },
    { domain: '*.payvessel.com', label: 'PayVessel' },
  ];

  const SECURITY_3DS_DOMAINS = [
    { domain: '*.mastercard.com', label: 'Mastercard 3D-Secure' },
    { domain: '*.securecode.com', label: 'Mastercard SecureCode' },
    { domain: '*.visa.com', label: 'Verified by Visa (VbV)' },
    { domain: '*.visaeurope.com', label: 'Visa Europe 3DS' },
    { domain: '*.verve.com.ng', label: 'Verve Card Verification' },
    { domain: '*.verveinternational.com', label: 'Verve International' },
    { domain: '*.cardinalcommerce.com', label: 'CardinalCommerce 3DS ACS' },
    { domain: '*.arcot.com', label: 'Arcot 3DS Authentication' },
    { domain: '*.modirum.com', label: 'Modirum 3DS ACS Engine' },
    { domain: '*.threatmetrix.com', label: 'ThreatMetrix Risk Authentication' },
  ];

  const NIGERIAN_BANKS = [
    { domain: '*.opayweb.com', label: 'OPay Web Portal' },
    { domain: '*.opay.com', label: 'OPay Mobile & API' },
    { domain: '*.operapay.com', label: 'OPay Services' },
    { domain: '*.palmpay.com', label: 'PalmPay Core API' },
    { domain: '*.palmpay.co', label: 'PalmPay App Services' },
    { domain: '*.moniepoint.com', label: 'Moniepoint Banking Portal' },
    { domain: '*.teamapt.com', label: 'Moniepoint Core Infrastructure' },
    { domain: '*.kuda.com', label: 'Kuda Bank Web & App' },
    { domain: '*.kudabank.com', label: 'Kuda Bank API Services' },
    { domain: '*.gtbank.com', label: 'GTBank (Guaranty Trust Bank)' },
    { domain: '*.gtworld.gtbank.com', label: 'GTWorld Mobile Platform' },
    { domain: '*.accessbankplc.com', label: 'Access Bank Core Portal' },
    { domain: '*.accessmore.com', label: 'Access More App Portal' },
    { domain: '*.zenithbank.com', label: 'Zenith Bank Internet Banking' },
    { domain: '*.firstbanknigeria.com', label: 'First Bank of Nigeria (FirstMobile)' },
    { domain: '*.firstmonie.com', label: 'FirstMonie Agent & App' },
    { domain: '*.ubagroup.com', label: 'United Bank for Africa (UBA)' },
    { domain: '*.stanbicibtc.com', label: 'Stanbic IBTC Bank' },
    { domain: '*.stanbicibtcbank.com', label: 'Stanbic IBTC Mobile Services' },
    { domain: '*.fidelitybank.ng', label: 'Fidelity Bank Nigeria' },
    { domain: '*.fcmb.com', label: 'First City Monument Bank (FCMB)' },
    { domain: '*.sterling.ng', label: 'Sterling Bank Core' },
    { domain: '*.sterlingbankng.com', label: 'Sterling Bank Services' },
    { domain: '*.unionbankng.com', label: 'Union Bank of Nigeria' },
    { domain: '*.wemaplc.com', label: 'Wema Bank PLC' },
    { domain: '*.alat.ng', label: 'ALAT by Wema Digital Bank' },
    { domain: '*.polarisbanklimited.com', label: 'Polaris Bank VConnect' },
    { domain: '*.keystonebankng.com', label: 'Keystone Bank' },
    { domain: '*.ecobank.com', label: 'Ecobank Nigeria' },
    { domain: '*.jaizbankplc.com', label: 'Jaiz Bank PLC' },
    { domain: '*.tajbank.com', label: 'TAJBank Non-Interest' },
    { domain: '*.lotusbank.com', label: 'Lotus Bank Non-Interest' },
    { domain: '*.optimusbank.com', label: 'Optimus Bank' },
    { domain: '*.parallexbank.com', label: 'Parallex Bank' },
    { domain: '*.premiumtrustbank.com', label: 'PremiumTrust Bank' },
    { domain: '*.signaturebankng.com', label: 'Signature Bank' },
    { domain: '*.providusbank.com', label: 'Providus Bank Core' },
  ];

  const handleBulkAddWalledGarden = async (entries, category) => {
    if (wgSyncing) return;
    setWgSyncing(true);

    const total = entries.length;
    let added = 0;
    let skipped = 0;
    let failed = 0;
    const failedList = [];
    const startTime = Date.now();

    const existingDomains = walledGardenEntries.map(e => (e['dst-host'] || '').toLowerCase());

    setWgBulkProgress({
      active: true,
      percent: 1,
      title: `Whitelisting ${category} Domains`,
      subtitle: `Initializing sync for ${total} domains...`,
      status: 'normal',
      itemCount: `0 of ${total}`,
      elapsedText: '0s elapsed',
      canRetry: false,
      failedList: [],
    });

    for (let i = 0; i < total; i++) {
      const entry = entries[i];
      const percent = Math.max(1, Math.min(100, Math.round(((i + 1) / total) * 100)));
      const sec = Math.floor((Date.now() - startTime) / 1000);

      if (existingDomains.includes(entry.domain.toLowerCase())) {
        skipped++;
        setWgBulkProgress(prev => ({
          ...prev,
          percent,
          subtitle: `Skipping ${entry.domain} (already whitelisted)`,
          itemCount: `${i + 1} of ${total} (${added} added, ${skipped} active)`,
          elapsedText: `${sec}s elapsed`,
        }));
        continue;
      }

      setWgBulkProgress(prev => ({
        ...prev,
        percent,
        subtitle: `Whitelisting ${entry.domain} (${entry.label || category})...`,
        itemCount: `${i + 1} of ${total} (${added} added, ${failed} failed)`,
        elapsedText: `${sec}s elapsed`,
      }));

      try {
        const res = await fetch('/api/mikrotik/walled-garden', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify({ dst_host: entry.domain, category: entry.category || category, comment: entry.label }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          added++;
          existingDomains.push(entry.domain.toLowerCase());
        } else {
          failed++;
          failedList.push(entry);
        }
      } catch {
        failed++;
        failedList.push(entry);
      }
    }

    const finalSec = Math.floor((Date.now() - startTime) / 1000);
    const hasFailures = failed > 0;

    setWgBulkProgress({
      active: true,
      percent: 100,
      title: hasFailures ? `Walled Garden Sync Finished with ${failed} Failure(s)` : `Walled Garden Sync Completed!`,
      subtitle: hasFailures
        ? `Added ${added} new domains (${skipped} were already active, ${failed} timed out or failed)`
        : `Successfully whitelisted all ${added} domains (${skipped} were already active).`,
      status: failed === total ? 'error' : hasFailures ? 'warning' : 'success',
      itemCount: `${total} of ${total} (${added} added, ${skipped} active, ${failed} failed)`,
      elapsedText: `${finalSec}s total`,
      canRetry: hasFailures,
      failedList,
    });

    showToast(hasFailures ? `⚠️ Processed with ${failed} failed domain(s)` : `✅ Added ${added} ${category} entries`);
    await fetchWalledGarden();
    setWgSyncing(false);
  };

  const handleActivateAllBypass = async () => {
    const all = [
      ...CORE_SYSTEM_DOMAINS.map(d => ({ ...d, category: 'core' })),
      ...PAYMENT_GATEWAYS.map(d => ({ ...d, category: 'payment' })),
      ...SECURITY_3DS_DOMAINS.map(d => ({ ...d, category: 'security' })),
      ...NIGERIAN_BANKS.map(d => ({ ...d, category: 'bank' })),
    ];
    await handleBulkAddWalledGarden(all, 'All Services');
  };

  const handleAddWalledGarden = async (dstHost, category = 'custom', label = '') => {
    setWgSyncing(true);
    try {
      const res = await fetch('/api/mikrotik/walled-garden', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ dst_host: dstHost, category, comment: label }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Added ${dstHost} to bypass list`);
        await fetchWalledGarden();
      } else {
        showToast('❌ ' + (data.details || data.error));
      }
    } catch (err) { showToast('Error: ' + err.message); }
    finally { setWgSyncing(false); }
  };

  const handleRemoveWalledGarden = async (entryId, domain, source) => {
    if (!confirm(`Remove "${domain}" from bypass list?`)) return;
    setWgSyncing(true);
    try {
      const res = await fetch('/api/mikrotik/walled-garden', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ id: entryId, source: source || undefined, dst_host: domain }),
      });
      if (res.ok) {
        showToast(`Removed ${domain}`);
        await fetchWalledGarden();
      } else {
        const data = await res.json();
        showToast('❌ ' + (data.details || data.error));
      }
    } catch (err) { showToast('Error: ' + err.message); }
    finally { setWgSyncing(false); }
  };

  return (
          <div className="sa-tab-body">
            {/* Windows-style Progress Bar for Walled Garden Bulk Operations */}
            {wgBulkProgress.active && (
              <div style={{ marginBottom: 20 }}>
                <WindowsProgressBar
                  percent={wgBulkProgress.percent}
                  title={wgBulkProgress.title}
                  subtitle={wgBulkProgress.subtitle}
                  status={wgBulkProgress.status}
                  itemCount={wgBulkProgress.itemCount}
                  elapsedText={wgBulkProgress.elapsedText}
                  canRetry={wgBulkProgress.canRetry}
                  onRetry={wgBulkProgress.failedList?.length > 0 ? () => handleBulkAddWalledGarden(wgBulkProgress.failedList, 'Failed Domains') : null}
                  onDismiss={() => setWgBulkProgress(prev => ({ ...prev, active: false }))}
                />
              </div>
            )}

            {/* Master Activation Banner */}
            <div className="sa-glass-card" style={{
              background: 'linear-gradient(135deg, rgba(114, 87, 255, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(114, 87, 255, 0.35)',
              boxShadow: '0 8px 32px rgba(114, 87, 255, 0.15)',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <h3 className="sa-card-title" style={{ color: '#FFFFFF', fontSize: 18 }}>All-in-One Walled Garden Bypass</h3>
                    <span className="sa-badge sa-badge-purple" style={{ fontSize: 11 }}>Active on Router: {walledGardenEntries.length}</span>
                  </div>
                  <p className="sa-card-sub" style={{ color: '#D4D4D8', maxWidth: 680 }}>
                    Enable all Nigerian commercial banks, digital fintechs (OPay, PalmPay, Moniepoint, Kuda), payment switches (Paystack, Flutterwave, Interswitch, Remita), and hidden 3D Secure / ACS verification links (Mastercard, Visa, Verve, CardinalCommerce) so all users can make payments and use bank apps freely before Wi-Fi login.
                  </p>
                </div>
                <button
                  className="sa-btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={handleActivateAllBypass}
                  disabled={wgSyncing}
                >
                  <span>⚡</span>
                  {wgSyncing ? 'Provisioning Router...' : 'Activate All Banks & Gateways (1-Click)'}
                </button>
              </div>
            </div>

            {/* Core App & Database Bypass (Defaults) */}
            <div className="sa-glass-card">
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">🌐 Core App & Database Bypass (Defaults)</h3>
                  <p className="sa-card-sub">Pre-authenticated access for the {brandingForm.app_name || 'App'} web portal and cloud database</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="sa-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => handleBulkAddWalledGarden(CORE_SYSTEM_DOMAINS, 'core')} disabled={wgSyncing}>
                    {wgSyncing ? 'Syncing...' : '⚡ Add All Core Defaults'}
                  </button>
                  <button className="sa-btn-pill-small" onClick={fetchWalledGarden} disabled={wgLoading}>
                    <RefreshIcon size={14} /> {wgLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              <div className="sa-wg-list">
                {CORE_SYSTEM_DOMAINS.map((core, i) => {
                  const isActive = walledGardenEntries.some(e => (e['dst-host'] || '').toLowerCase() === core.domain.toLowerCase());
                  return (
                    <div key={i} className="sa-wg-item">
                      <div className="sa-wg-item-info">
                        <span className={`sa-wg-dot ${isActive ? 'active' : ''}`} />
                        <code className="sa-wg-domain">{core.domain}</code>
                        <span className="sa-badge sa-badge-purple" style={{ fontSize: 9, padding: '1px 6px' }}>{core.label}</span>
                      </div>
                      {!isActive ? (
                        <button className="sa-btn-pill-small" style={{ fontSize: 11 }} onClick={() => handleAddWalledGarden(core.domain, 'core', core.label)} disabled={wgSyncing}>Add</button>
                      ) : (
                        <span className="sa-badge sa-badge-success" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Gateways */}
            <div className="sa-glass-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">💳 Payment Gateways</h3>
                  <p className="sa-card-sub">Allow checkout and payment processing without an active plan</p>
                </div>
                <button className="sa-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => handleBulkAddWalledGarden(PAYMENT_GATEWAYS, 'payment')} disabled={wgSyncing}>
                  {wgSyncing ? 'Syncing...' : '➕ Add All Payment Gateways'}
                </button>
              </div>
              <div className="sa-wg-list">
                {PAYMENT_GATEWAYS.map((gw, i) => {
                  const isActive = walledGardenEntries.some(e => (e['dst-host'] || '').toLowerCase() === gw.domain.toLowerCase());
                  return (
                    <div key={i} className="sa-wg-item">
                      <div className="sa-wg-item-info">
                        <span className={`sa-wg-dot ${isActive ? 'active' : ''}`} />
                        <code className="sa-wg-domain">{gw.domain}</code>
                        <span className="sa-badge sa-badge-purple" style={{ fontSize: 9, padding: '1px 6px' }}>{gw.label}</span>
                      </div>
                      {!isActive ? (
                        <button className="sa-btn-pill-small" style={{ fontSize: 11 }} onClick={() => handleAddWalledGarden(gw.domain, 'payment', gw.label)} disabled={wgSyncing}>Add</button>
                      ) : (
                        <span className="sa-badge sa-badge-success" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3D-Secure ACS & Card Verification (Hidden Links) */}
            <div className="sa-glass-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">🔐 3D Secure ACS & Card Verification (Hidden Bank Links)</h3>
                  <p className="sa-card-sub">Hidden risk authentication engines, ACS redirect endpoints, and OTP verification portals</p>
                </div>
                <button className="sa-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => handleBulkAddWalledGarden(SECURITY_3DS_DOMAINS, 'security')} disabled={wgSyncing}>
                  {wgSyncing ? 'Syncing...' : '➕ Add All 3DS & ACS Links'}
                </button>
              </div>
              <div className="sa-wg-list">
                {SECURITY_3DS_DOMAINS.map((sec, i) => {
                  const isActive = walledGardenEntries.some(e => (e['dst-host'] || '').toLowerCase() === sec.domain.toLowerCase());
                  return (
                    <div key={i} className="sa-wg-item">
                      <div className="sa-wg-item-info">
                        <span className={`sa-wg-dot ${isActive ? 'active' : ''}`} />
                        <code className="sa-wg-domain">{sec.domain}</code>
                        <span className="sa-badge sa-badge-purple" style={{ fontSize: 9, padding: '1px 6px' }}>{sec.label}</span>
                      </div>
                      {!isActive ? (
                        <button className="sa-btn-pill-small" style={{ fontSize: 11 }} onClick={() => handleAddWalledGarden(sec.domain, 'security', sec.label)} disabled={wgSyncing}>Add</button>
                      ) : (
                        <span className="sa-badge sa-badge-success" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nigerian Banks */}
            <div className="sa-glass-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">🏦 Bank Portals</h3>
                  <p className="sa-card-sub">Allow banking apps and websites for payments without an active plan</p>
                </div>
                <button className="sa-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => handleBulkAddWalledGarden(NIGERIAN_BANKS, 'bank')} disabled={wgSyncing}>
                  {wgSyncing ? 'Syncing...' : '➕ Add All Banks'}
                </button>
              </div>
              <div className="sa-wg-list">
                {NIGERIAN_BANKS.map((bank, i) => {
                  const isActive = walledGardenEntries.some(e => (e['dst-host'] || '').toLowerCase() === bank.domain.toLowerCase());
                  return (
                    <div key={i} className="sa-wg-item">
                      <div className="sa-wg-item-info">
                        <span className={`sa-wg-dot ${isActive ? 'active' : ''}`} />
                        <code className="sa-wg-domain">{bank.domain}</code>
                        <span className="sa-badge sa-badge-blue" style={{ fontSize: 9, padding: '1px 6px' }}>{bank.label}</span>
                      </div>
                      {!isActive ? (
                        <button className="sa-btn-pill-small" style={{ fontSize: 11 }} onClick={() => handleAddWalledGarden(bank.domain, 'bank', bank.label)} disabled={wgSyncing}>Add</button>
                      ) : (
                        <span className="sa-badge sa-badge-success" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom URL */}
            <div className="sa-glass-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">🔗 Custom URL</h3>
                  <p className="sa-card-sub">Add any domain to the bypass list</p>
                </div>
              </div>
              <div className="sa-form-grid-3">
                <div className="sa-field-box">
                  <label>Domain Pattern</label>
                  <input value={wgCustomUrl} onChange={e => setWgCustomUrl(e.target.value)}
                    placeholder="*.example.com or example.com" />
                </div>
                <div className="sa-field-box">
                  <label>Label (optional)</label>
                  <input value={wgCustomComment} onChange={e => setWgCustomComment(e.target.value)}
                    placeholder="e.g. My Service" />
                </div>
              </div>
              <div className="sa-plan-form-footer">
                <button className="sa-btn-primary" onClick={handleAddCustomUrl} disabled={wgSyncing || !wgCustomUrl.trim()}>
                  {wgSyncing ? 'Adding...' : '➕ Add Custom URL'}
                </button>
              </div>
            </div>

            {/* Active Entries */}
            <div className="sa-glass-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">📋 Active Bypass Entries ({walledGardenEntries.length})</h3>
                  <p className="sa-card-sub">Currently whitelisted domains on the MikroTik router</p>
                </div>
                <button className="sa-btn-pill-small" onClick={fetchWalledGarden} disabled={wgLoading}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
              {wgLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" /></div>
              ) : walledGardenEntries.length === 0 ? (
                <p className="sa-card-sub" style={{ textAlign: 'center', padding: 24 }}>No walled garden entries found. Add domains above to get started.</p>
              ) : (
                <div className="sa-wg-list">
                  {walledGardenEntries.map((entry, i) => (
                    <div key={`${entry._source || 'wg'}-${entry['.id'] || i}`} className="sa-wg-item">
                      <div className="sa-wg-item-info">
                        <span className="sa-wg-dot active" />
                        <code className="sa-wg-domain">{entry['dst-host'] || entry['dst-address'] || '—'}</code>
                        {entry._source && <span className="sa-badge" style={{ fontSize: 9, padding: '1px 6px', background: entry._source === 'ip' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: entry._source === 'ip' ? '#10b981' : '#3b82f6' }}>{entry._source === 'ip' ? 'HTTPS/IP' : 'HTTP'}</span>}
                        {entry.comment && <span className="sa-badge sa-badge-purple" style={{ fontSize: 9, padding: '1px 6px' }}>{entry.comment}</span>}
                      </div>
                      <button className="sa-btn-danger-small" onClick={() => handleRemoveWalledGarden(entry['.id'], entry['dst-host'] || entry['dst-address'], entry._source)} disabled={wgSyncing}>
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

  );
}

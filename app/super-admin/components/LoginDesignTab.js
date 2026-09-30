'use client';

import { useState } from 'react';
import { RefreshIcon, SmartphoneIcon, MonitorIcon } from '../../components/Icons';
import WindowsProgressBar from '../../components/WindowsProgressBar';

export default function LoginDesignTab({
  mikrotikForm,
  brandingForm,
  adminHeaders,
  showToast,
}) {
  const [portalTemplate, setPortalTemplate] = useState('midnight-glass');
  const [portalConfig, setPortalConfig] = useState({
    logoUrl: '', businessName: '', contactFooter: '', primaryColor: '', buyUrl: '',
  });
  const [portalPushing, setPortalPushing] = useState(false);
  const [portalPreviewMode, setPortalPreviewMode] = useState('phone');
  const [portalPreviewKey, setPortalPreviewKey] = useState(0);
  const [portalPushProgress, setPortalPushProgress] = useState({
    active: false,
    percent: 0,
    title: '',
    subtitle: '',
    status: 'normal',
    itemCount: '',
    elapsedText: '',
    canRetry: false,
  });

  const handlePushLoginPageWithProgress = async () => {
    if (portalPushing) return;
    setPortalPushing(true);

    const startTime = Date.now();
    const updateElapsed = () => `${Math.floor((Date.now() - startTime) / 1000)}s elapsed`;

    setPortalPushProgress({
      active: true,
      percent: 15,
      title: 'Deploying Captive Portal to Router',
      subtitle: `Preparing "${portalTemplate}" markup, CSS tokens & assets...`,
      status: 'normal',
      itemCount: 'Step 1 of 4',
      elapsedText: '0s elapsed',
      canRetry: false,
    });

    const targetBuyUrl = portalConfig.buyUrl
      || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : '')
      || 'https://www.africannetwork.com/packages';

    const t1 = setTimeout(() => {
      setPortalPushProgress(prev => prev.active && prev.status !== 'error' ? {
        ...prev,
        percent: 45,
        subtitle: 'Connecting to MikroTik REST storage API...',
        itemCount: 'Step 2 of 4',
        elapsedText: updateElapsed(),
      } : prev);
    }, 1200);

    const t2 = setTimeout(() => {
      setPortalPushProgress(prev => prev.active && prev.status !== 'error' ? {
        ...prev,
        percent: 75,
        subtitle: 'Writing login.html directly to router hotspot storage directory...',
        itemCount: 'Step 3 of 4',
        elapsedText: updateElapsed(),
      } : prev);
    }, 2800);

    const t3 = setTimeout(() => {
      setPortalPushProgress(prev => prev.active && prev.status !== 'error' ? {
        ...prev,
        percent: 92,
        subtitle: 'Verifying live captive portal deployment on router...',
        itemCount: 'Step 4 of 4',
        elapsedText: updateElapsed(),
      } : prev);
    }, 4500);

    try {
      const res = await fetch('/api/mikrotik/push-login-page', {
        method: 'POST',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: portalTemplate,
          wifi_ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
          business_name: portalConfig.businessName || mikrotikForm.wifi_ssid || brandingForm.app_name || '',
          logo_url: portalConfig.logoUrl || brandingForm.logo_url || '',
          contact_footer: portalConfig.contactFooter || '',
          primary_color: portalConfig.primaryColor || '',
          buy_url: targetBuyUrl,
        }),
        signal: AbortSignal.timeout(25000),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const data = await res.json();
      if (res.ok && data.success) {
        setPortalPushProgress({
          active: true,
          percent: 100,
          title: 'Login Page Deployed Live!',
          subtitle: `"${portalTemplate}" template uploaded and verified on router hotspot storage.`,
          status: 'success',
          itemCount: 'Deployed Live',
          elapsedText: updateElapsed(),
          canRetry: false,
        });
        showToast(`✅ "${portalTemplate}" template pushed to router!`);
      } else {
        throw new Error(data.error || 'Push failed');
      }
    } catch (e) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const isTimeout = e.name === 'TimeoutError' || e.message?.includes('timeout');
      const errDetail = isTimeout
        ? 'Upload timed out after 25s. The router may be slow or on a high-latency link.'
        : e.message;

      setPortalPushProgress(prev => ({
        ...prev,
        active: true,
        percent: prev.percent || 45,
        status: 'error',
        subtitle: `❌ ${errDetail}`,
        elapsedText: updateElapsed(),
        canRetry: true,
      }));

      showToast(`❌ Push Error: ${errDetail}`);
    } finally {
      setPortalPushing(false);
    }
  };

  return (
          <div className="sa-tab-body">

            {/* ── Template Gallery ── */}
            <div className="sa-glass-card">
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'🎨'} Captive Portal Templates</h3>
                  <p className="sa-card-sub">Choose a beautiful login page design for your MikroTik hotspot</p>
                </div>
                <span className="sa-badge sa-badge-purple">5 Templates</span>
              </div>

              <div className="sa-template-gallery">
                {[
                  { id: 'midnight-glass', name: 'Midnight Glass', emoji: '🌙', desc: 'Dark glassmorphism with frosted card & purple glow', css: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 50%, #2d1b69 100%)' },
                  { id: 'sunrise-gradient', name: 'Sunrise Gradient', emoji: '🌅', desc: 'Warm orange-to-pink gradient with clean white card', css: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)' },
                  { id: 'ocean-breeze', name: 'Ocean Breeze', emoji: '🌊', desc: 'Cool teal-blue waves with aqua gradient accents', css: 'linear-gradient(135deg, #0d9488 0%, #0ea5e9 50%, #6366f1 100%)' },
                  { id: 'neon-pulse', name: 'Neon Pulse', emoji: '⚡', desc: 'Electric cyberpunk with neon green borders', css: 'linear-gradient(135deg, #0a0a0a 0%, #0d1117 50%, #1a1a2e 100%)' },
                  { id: 'clean-minimal', name: 'Clean Minimal', emoji: '✨', desc: 'Ultra-clean white card, Apple-inspired simplicity', css: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' },
                ].map(tpl => (
                  <div
                    key={tpl.id}
                    className={`sa-template-card ${portalTemplate === tpl.id ? 'active' : ''}`}
                    onClick={() => { setPortalTemplate(tpl.id); setPortalPreviewKey(k => k + 1); }}
                  >
                    <div className="sa-template-thumb" style={{ background: tpl.css }}>
                      <span className="sa-template-emoji">{tpl.emoji}</span>
                      {portalTemplate === tpl.id && <span className="sa-template-check">✓</span>}
                    </div>
                    <div className="sa-template-info">
                      <strong>{tpl.name}</strong>
                      <span>{tpl.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Customization Panel ── */}
            <div className="sa-glass-card" style={{ marginTop: 24 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'⚙️'} Customize Template</h3>
                  <p className="sa-card-sub">Personalize the login page with your brand</p>
                </div>
              </div>

              <div className="sa-form-grid-2">
                <div className="sa-field-box">
                  <label>Business Name</label>
                  <input value={portalConfig.businessName} onChange={e => setPortalConfig({ ...portalConfig, businessName: e.target.value })}
                    placeholder={mikrotikForm.wifi_ssid || 'Your Business Name'} />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Heading text on the login card (defaults to Wi-Fi SSID)</span>
                </div>
                <div className="sa-field-box">
                  <label>Logo URL</label>
                  <input value={portalConfig.logoUrl} onChange={e => setPortalConfig({ ...portalConfig, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png" />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Direct link to your brand logo image</span>
                </div>
                <div className="sa-field-box">
                  <label>Contact / Footer Text</label>
                  <input value={portalConfig.contactFooter} onChange={e => setPortalConfig({ ...portalConfig, contactFooter: e.target.value })}
                    placeholder="Call: 0801-234-5678 | WhatsApp: 0901-234-5678" />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Phone, email, or WhatsApp shown at the bottom</span>
                </div>
                <div className="sa-field-box">
                  <label>Accent Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={portalConfig.primaryColor || '#7c3aed'}
                      onChange={e => setPortalConfig({ ...portalConfig, primaryColor: e.target.value })}
                      style={{ width: 44, height: 36, padding: 2, borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer' }} />
                    <input value={portalConfig.primaryColor} onChange={e => setPortalConfig({ ...portalConfig, primaryColor: e.target.value })}
                      placeholder="#7c3aed (auto)" style={{ flex: 1 }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>Override the template's default accent color</span>
                </div>
                <div className="sa-field-box" style={{ gridColumn: '1 / -1' }}>
                  <label>Buy Voucher Redirect URL (Self-Service)</label>
                  <input
                    value={portalConfig.buyUrl}
                    onChange={e => setPortalConfig({ ...portalConfig, buyUrl: e.target.value })}
                    placeholder={brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : 'https://www.africannetwork.com/packages'}
                  />
                  <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>
                    The destination URL for the &quot;Buy a Data Plan&quot; button on the hotspot portal. Defaults to your web app&apos;s /packages page.
                  </span>
                </div>
              </div>

              <div className="sa-plan-form-footer" style={{ marginTop: 16 }}>
                <button
                  className="sa-btn-primary"
                  onClick={async () => {
                    try {
                      const fullConfig = {
                        templateId: portalTemplate,
                        businessName: portalConfig.businessName,
                        logoUrl: portalConfig.logoUrl,
                        contactFooter: portalConfig.contactFooter,
                        primaryColor: portalConfig.primaryColor,
                        buyUrl: portalConfig.buyUrl,
                      };
                      const res = await fetch('/api/super-admin/settings', {
                        method: 'POST',
                        headers: adminHeaders(),
                        body: JSON.stringify({ key: 'portal_template', value: fullConfig }),
                      });
                      if (res.ok) {
                        showToast('✅ Login design settings saved!');
                        fetchChangeHistory();
                      } else {
                        showToast('❌ Failed to save login design');
                      }
                    } catch {
                      showToast('Network error');
                    }
                  }}
                >
                  💾 Save Design Settings
                </button>
              </div>
            </div>


            {/* ── Live Preview ── */}
            <div className="sa-glass-card" style={{ marginTop: 24 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'👁️'} Live Preview</h3>
                  <p className="sa-card-sub">See how your login page looks to customers</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`sa-preview-toggle ${portalPreviewMode === 'phone' ? 'active' : ''}`}
                    onClick={() => setPortalPreviewMode('phone')}
                    title="Phone preview"
                  >
                    <SmartphoneIcon size={16} /> Phone
                  </button>
                  <button
                    className={`sa-preview-toggle ${portalPreviewMode === 'desktop' ? 'active' : ''}`}
                    onClick={() => setPortalPreviewMode('desktop')}
                    title="Desktop preview"
                  >
                    <MonitorIcon size={16} /> Desktop
                  </button>
                  <button
                    className="sa-preview-toggle"
                    onClick={() => setPortalPreviewKey(k => k + 1)}
                    title="Refresh preview"
                  >
                    <RefreshIcon size={14} />
                  </button>
                </div>
              </div>

              <div className={`sa-portal-preview-frame ${portalPreviewMode}`}>
                <div className="sa-portal-preview-notch" />
                <iframe
                  key={portalPreviewKey}
                  className="sa-portal-preview-iframe"
                  srcDoc={(() => {
                    try {
                      // Build a static preview by replacing MikroTik variables with demo values
                      const templates = {
                        'midnight-glass': 'Midnight Glass',
                        'sunrise-gradient': 'Sunrise Gradient',
                        'ocean-breeze': 'Ocean Breeze',
                        'neon-pulse': 'Neon Pulse',
                        'clean-minimal': 'Clean Minimal',
                      };
                      const name = portalConfig.businessName || mikrotikForm.wifi_ssid || brandingForm.app_name || 'African Network Wi-Fi';
                      const targetBuyUrl = portalConfig.buyUrl
                        || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : '')
                        || 'https://www.africannetwork.com/packages';

                      // We build the preview HTML via the API using a GET request
                      const params = new URLSearchParams({
                        template_id: portalTemplate,
                        wifi_ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
                        business_name: name,
                        logo_url: portalConfig.logoUrl || brandingForm.logo_url || '',
                        contact_footer: portalConfig.contactFooter || '',
                        primary_color: portalConfig.primaryColor || '',
                        buy_url: targetBuyUrl,
                      });
                      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;overflow:hidden}</style></head><body><script>
fetch('/api/mikrotik/push-login-page?${params.toString()}')
  .then(r=>r.text())
  .then(html=>{
    html=html.replace(/\$\(link-login-only\)/g,'#')
      .replace(/\$\(link-orig\)/g,'https://google.com')
      .replace(/\$\(link-orig-esc\)/g,'https%3A%2F%2Fgoogle.com')
      .replace(/\$\(link-login-only-esc\)/g,'%23')
      .replace(/\$\(mac\)/g,'AA:BB:CC:DD:EE:FF')
      .replace(/\$\(ip\)/g,'10.0.0.42')
      .replace(/\$\(username\)/g,'')
      .replace(/\$\(if error\)[\\s\\S]*?\$\(endif\)/g,'');
    document.open();document.write(html);document.close();
  });
<\/script></body></html>`;
                    } catch { return '<p>Preview unavailable</p>'; }
                  })()}
                  sandbox="allow-scripts allow-same-origin"
                  title="Login Page Preview"
                />
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="sa-glass-card" style={{ marginTop: 24 }}>
              <div className="sa-card-header">
                <div>
                  <h3 className="sa-card-title">{'🚀'} Deploy to Router</h3>
                  <p className="sa-card-sub">Push the selected template to your MikroTik hotspot</p>
                </div>
              </div>

              {/* Windows-style Progress Bar for Template Push */}
              {portalPushProgress.active && (
                <div style={{ marginBottom: 16 }}>
                  <WindowsProgressBar
                    percent={portalPushProgress.percent}
                    title={portalPushProgress.title}
                    subtitle={portalPushProgress.subtitle}
                    status={portalPushProgress.status}
                    itemCount={portalPushProgress.itemCount}
                    elapsedText={portalPushProgress.elapsedText}
                    canRetry={portalPushProgress.canRetry}
                    onRetry={handlePushLoginPageWithProgress}
                    onDismiss={() => setPortalPushProgress(prev => ({ ...prev, active: false }))}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="sa-btn-primary"
                  disabled={portalPushing}
                  style={{
                    flex: '1 1 200px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    padding: '14px 24px', fontSize: '14px', fontWeight: 800,
                    borderRadius: 14, boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                  }}
                  onClick={handlePushLoginPageWithProgress}
                >
                  {portalPushing ? 'Pushing to Router...' : '🚀 Push to Router'}
                </button>

                <button
                  className="sa-btn-outline"
                  style={{ flex: '1 1 160px', padding: '14px 20px', fontSize: '13px', fontWeight: 700, borderRadius: 14 }}
                  onClick={() => {
                    const targetBuyUrl = portalConfig.buyUrl
                      || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : '')
                      || 'https://www.africannetwork.com/packages';
                    const params = new URLSearchParams({
                      download: 'true',
                      template_id: portalTemplate,
                      wifi_ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
                      business_name: portalConfig.businessName || mikrotikForm.wifi_ssid || brandingForm.app_name || '',
                      logo_url: portalConfig.logoUrl || brandingForm.logo_url || '',
                      contact_footer: portalConfig.contactFooter || '',
                      primary_color: portalConfig.primaryColor || '',
                      buy_url: targetBuyUrl,
                    });
                    window.open(`/api/mikrotik/push-login-page?${params.toString()}`, '_blank');
                  }}
                >
                  📥 Download login.html
                </button>

                <button
                  className="sa-btn-outline"
                  style={{ flex: '1 1 160px', padding: '14px 20px', fontSize: '13px', fontWeight: 700, borderRadius: 14 }}
                  onClick={() => {
                    const targetBuyUrl = portalConfig.buyUrl
                      || (brandingForm.app_url ? `${brandingForm.app_url.replace(/\/+$/, '')}/packages` : '')
                      || 'https://www.africannetwork.com/packages';
                    const params = new URLSearchParams({
                      template_id: portalTemplate,
                      wifi_ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
                      business_name: portalConfig.businessName || mikrotikForm.wifi_ssid || brandingForm.app_name || '',
                      logo_url: portalConfig.logoUrl || brandingForm.logo_url || '',
                      contact_footer: portalConfig.contactFooter || '',
                      primary_color: portalConfig.primaryColor || '',
                      buy_url: targetBuyUrl,
                    });
                    window.open(`/api/mikrotik/push-login-page?${params.toString()}`, '_blank');
                  }}
                >
                  👁️ Full-Screen Preview
                </button>
              </div>

              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)' }}>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                  <strong style={{ color: '#22c55e' }}>How it works:</strong> Clicking &quot;Push to Router&quot; uploads the generated login.html directly to your MikroTik router&apos;s hotspot directory. The captive portal will immediately use the new design for all connecting users.
                </div>
              </div>
            </div>
          </div>


  );
}

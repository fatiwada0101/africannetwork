'use client';

import { THEME_PALETTES } from '../../context/BrandingContext';

export default function BrandingTab({
  brandingForm,
  setBrandingForm,
  adminHeaders,
  showToast,
}) {
  return (
    <div className="sa-tab-body">
      <div className="sa-glass-card">
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">App Identity</h3>
            <p className="sa-card-sub">Customize name, logo, and appearance</p>
          </div>
          <span className="sa-badge sa-badge-purple">Branding</span>
        </div>

        {/* Live Preview */}
        <div className="sa-branding-preview" style={{ background: THEME_PALETTES[brandingForm.theme]?.cardGradient || 'var(--card-gradient)' }}>
          <div className="sa-branding-preview-name">
            {brandingForm.logo_url && <img src={brandingForm.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, marginRight: 10, verticalAlign: 'middle' }} />}
            {brandingForm.app_name || 'Your App Name'}
          </div>
          <div className="sa-branding-preview-sub">Wi-Fi Hotspot • Live Preview</div>
        </div>

        <div className="sa-form-grid-2">
          <div className="sa-field-box">
            <label>App Name *</label>
            <input value={brandingForm.app_name} onChange={e => setBrandingForm({ ...brandingForm, app_name: e.target.value })} placeholder="African Network" />
          </div>
          <div className="sa-field-box">
            <label>Logo URL (optional)</label>
            <input value={brandingForm.logo_url} onChange={e => setBrandingForm({ ...brandingForm, logo_url: e.target.value })} placeholder="https://example.com/logo.png" />
          </div>
          <div className="sa-field-box" style={{ gridColumn: '1 / -1' }}>
            <label>Web App / Portal URL</label>
            <input
              value={brandingForm.app_url || ''}
              onChange={e => setBrandingForm({ ...brandingForm, app_url: e.target.value })}
              placeholder="https://africannetwork.com"
            />
            <span style={{ fontSize: '11px', color: '#71717A', marginTop: 4 }}>
              Public URL of this web application (e.g. https://mybrand.com). Used by the captive portal for voucher purchasing, redirects, and automated walled-garden bypass.
            </span>
          </div>
        </div>

        <div className="sa-plan-form-footer">
          <button className="sa-btn-primary" onClick={async () => {
            try {
              const res = await fetch('/api/super-admin/settings', {
                method: 'POST', headers: adminHeaders(),
                body: JSON.stringify({ key: 'branding', value: brandingForm }),
              });
              if (res.ok) showToast('✅ Branding saved! Refresh user app to see changes.');
              else showToast('❌ Failed to save branding');
            } catch { showToast('Network error'); }
          }}>Save Branding</button>
        </div>
      </div>

      {/* Theme Palette Picker */}
      <div className="sa-glass-card" style={{ marginTop: 24 }}>
        <div className="sa-card-header">
          <div>
            <h3 className="sa-card-title">Color Theme</h3>
            <p className="sa-card-sub">Choose a color palette for the entire app</p>
          </div>
          <span className="sa-badge">{Object.keys(THEME_PALETTES).length} Themes</span>
        </div>

        <div className="sa-theme-grid">
          {Object.values(THEME_PALETTES).map(palette => (
            <div
              key={palette.id}
              className={`sa-theme-swatch ${brandingForm.theme === palette.id ? 'active' : ''}`}
              onClick={() => setBrandingForm({ ...brandingForm, theme: palette.id })}
            >
              <span className="sa-theme-swatch-emoji">{palette.emoji}</span>
              <div className="sa-theme-color-preview" style={{ background: palette.cardGradient }} />
              <span className="sa-theme-swatch-label">{palette.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

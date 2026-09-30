'use client';

import { useState, useEffect } from 'react';
import { WifiIcon } from './Icons';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !window.navigator.standalone) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    // Android / Desktop Chrome beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '76px', // Above bottom navigation
      left: '16px',
      right: '16px',
      maxWidth: '480px',
      margin: '0 auto',
      background: 'rgba(18, 18, 23, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '16px',
      padding: '14px 16px',
      zIndex: 999,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <WifiIcon size={20} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
          Install African Network App
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
          {isIos
            ? 'Tap share button and select "Add to Home Screen"'
            : 'Fast 1-tap connection & offline vouchers'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {!isIos && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px'
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

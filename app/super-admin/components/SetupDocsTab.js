'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── GitBook-Style Reusable copy-to-clipboard button ──────────────
function CopyBlock({ code, label, language = 'routeros' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{
      marginBottom: 18,
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid #1E293B',
      background: '#030712',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
    }}>
      {/* GitBook Code Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#0F172A',
        borderBottom: '1px solid #1E293B',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          </div>
          {label && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.2px' }}>
              {label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11,
            color: '#38BDF8',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            fontWeight: 700,
            textTransform: 'uppercase',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '3px 8px',
            borderRadius: 5,
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}>
            {language}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#10B981' : '#1E293B',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Code Text Area */}
      <pre
        style={{
          padding: '16px 20px',
          fontSize: 12.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          color: '#F8FAFC',
          lineHeight: 1.65,
          overflowX: 'auto',
          maxHeight: 450,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: '#030712',
        }}
      >
        {code}
      </pre>
    </div>
  );
}

// ─── GitBook-Style Step number badge ──────────────────────────────
function StepBadge({ number, color = '#2563EB' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: '#2563EB',
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: 900,
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
    }}>
      {number}
    </span>
  );
}

// ─── GitBook-Style Collapsible section ───────────────────────────
function CollapsibleSection({ title, icon, subtitle, color = '#F59E0B', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: 20,
        background: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: '#131C31',
          borderBottom: open ? '1px solid #1E293B' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.2px' }}>{title}</h3>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>{subtitle}</p>}
          </div>
        </div>
        <span style={{
          fontSize: 14,
          color: '#94A3B8',
          fontWeight: 700,
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>
          ▼
        </span>
      </div>
      {open && (
        <div style={{ padding: '22px 24px', background: '#0B0F19', color: '#E2E8F0', fontSize: 14, lineHeight: 1.75 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── GitBook-Style Callout Block ──────────────────────────────────
function GitbookCallout({ type = 'info', title, children }) {
  const configs = {
    info: { border: '#38BDF8', bg: '#0F1E36', titleColor: '#38BDF8', icon: 'ℹ️' },
    warning: { border: '#F59E0B', bg: '#1E170A', titleColor: '#FBBF24', icon: '⚠️' },
    success: { border: '#10B981', bg: '#081D15', titleColor: '#34D399', icon: '✅' },
    danger: { border: '#EF4444', bg: '#1F1113', titleColor: '#F87171', icon: '⛔' },
    tip: { border: '#A78BFA', bg: '#19122E', titleColor: '#C4B5FD', icon: '💡' },
  };
  const c = configs[type] || configs.info;

  return (
    <div style={{
      borderLeft: `4px solid ${c.border}`,
      background: c.bg,
      borderRadius: '0 8px 8px 0',
      padding: '14px 18px',
      marginBottom: 16,
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    }}>
      {title && (
        <strong style={{ color: c.titleColor, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span>{c.icon}</span> {title}
        </strong>
      )}
      <div style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function SetupDocsTab({
  routersList = [],
  selectedRouterId = '',
  pollingConfig = {},
  onNavigateTab = null,
}) {
  const [activeGuide, setActiveGuide] = useState('overview');
  const [apiPassword, setApiPassword] = useState('AfricanNet2026!');
  const [showApiPassword, setShowApiPassword] = useState(true);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 16; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiPassword(res);
  };

  const activeRouter = routersList.find(r => r.id === selectedRouterId) || routersList[0] || null;
  const activeSecret = activeRouter?.polling_secret || 'YOUR_ROUTER_SECRET';
  const activeRouterName = activeRouter?.name || 'African Network Router';
  const appHostname = typeof window !== 'undefined' ? window.location.host : 'africannetwork.net';
  const appProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  // Smart sequential auto-calculation for new router additions
  const nextRouterNumber = Math.max(routersList.length + 1, 3);
  const defaultNextVpnIp = `10.10.10.${nextRouterNumber + 1}`;
  const defaultNextVpsPort = String(8728 + nextRouterNumber);

  // New Router Interactive Generator State (100% reactive & synchronized)
  const [newRouterName, setNewRouterName] = useState(`Branch Router ${nextRouterNumber}`);
  const [newRouterVpnIp, setNewRouterVpnIp] = useState(defaultNextVpnIp);
  const [newRouterVpsPort, setNewRouterVpsPort] = useState(defaultNextVpsPort);
  const [newRouterPublicKey, setNewRouterPublicKey] = useState('');
  const [vpsPublicKey, setVpsPublicKey] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState('custom');
  const [presetFeedback, setPresetFeedback] = useState('');

  // ── Auto-load persisted router configuration & saved presets on mount ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // 1. Load saved presets list
      const savedRaw = localStorage.getItem('an_router_deployment_presets');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) setSavedPresets(parsed);
      }
      // 2. Load current working draft
      const draftRaw = localStorage.getItem('an_current_new_router_config');
      if (draftRaw) {
        const d = JSON.parse(draftRaw);
        if (d.name) setNewRouterName(d.name);
        if (d.vpnIp) setNewRouterVpnIp(d.vpnIp);
        if (d.vpsPort) setNewRouterVpsPort(d.vpsPort);
        if (d.password) setApiPassword(d.password);
        if (d.routerPublicKey) setNewRouterPublicKey(d.routerPublicKey);
        if (d.vpsPublicKey) setVpsPublicKey(d.vpsPublicKey);
      }
    } catch (e) {
      console.warn('Error restoring router config from localStorage:', e);
    }
  }, []);

  // ── Auto-save current working configuration to localStorage on change ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const config = {
        name: newRouterName,
        vpnIp: newRouterVpnIp,
        vpsPort: newRouterVpsPort,
        password: apiPassword,
        routerPublicKey: newRouterPublicKey,
        vpsPublicKey: vpsPublicKey,
        updatedAt: Date.now(),
      };
      localStorage.setItem('an_current_new_router_config', JSON.stringify(config));
    } catch (e) {}
  }, [newRouterName, newRouterVpnIp, newRouterVpsPort, apiPassword, newRouterPublicKey, vpsPublicKey]);

  // Save current configuration as a permanent named preset (with completion validation)
  const isRouterConfigFinished = Boolean(
    newRouterPublicKey &&
    newRouterPublicKey.trim().length > 15 &&
    !newRouterPublicKey.includes('<')
  );

  const handleSaveAsPreset = () => {
    const name = (newRouterName || `Branch Router ${nextRouterNumber}`).trim();
    if (!isRouterConfigFinished) {
      const confirmSave = confirm(
        '⚠️ Router Public Key has not been pasted yet from Phase 1.\n\nWould you still like to save this as a working preset? (It will be marked as in-progress until the key is added).'
      );
      if (!confirmSave) return;
    }

    const newPreset = {
      id: 'preset_' + Date.now(),
      name,
      vpnIp: newRouterVpnIp || defaultNextVpnIp,
      vpsPort: newRouterVpsPort || defaultNextVpsPort,
      password: apiPassword || 'AfricanNet2026!',
      routerPublicKey: newRouterPublicKey || '',
      vpsPublicKey: vpsPublicKey || '',
      isCompleted: isRouterConfigFinished,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedPresets.filter(p => p.name !== name), newPreset];
    setSavedPresets(updated);
    setActivePresetId(newPreset.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('an_router_deployment_presets', JSON.stringify(updated));
    }

    if (isRouterConfigFinished) {
      setPresetFeedback(`✅ Completed preset "${name}" saved! Ready for 1-click import in Locations & Fleet.`);
    } else {
      setPresetFeedback(`📝 Saved in-progress draft "${name}". Complete Phase 1 to activate in Locations & Fleet.`);
    }
    setTimeout(() => setPresetFeedback(''), 5000);
  };

  // Load a saved preset into the generator
  const handleSelectPreset = (presetId) => {
    setActivePresetId(presetId);
    if (presetId === 'custom') return;
    const p = savedPresets.find(item => item.id === presetId);
    if (p) {
      if (p.name) setNewRouterName(p.name);
      if (p.vpnIp) setNewRouterVpnIp(p.vpnIp);
      if (p.vpsPort) setNewRouterVpsPort(p.vpsPort);
      if (p.password) setApiPassword(p.password);
      if (p.routerPublicKey !== undefined) setNewRouterPublicKey(p.routerPublicKey);
      if (p.vpsPublicKey !== undefined) setVpsPublicKey(p.vpsPublicKey);
      setPresetFeedback(`Loaded preset "${p.name}" (Port ${p.vpsPort})`);
      setTimeout(() => setPresetFeedback(''), 3000);
    }
  };

  // Delete a saved preset
  const handleDeletePreset = (presetId) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    setActivePresetId('custom');
    if (typeof window !== 'undefined') {
      localStorage.setItem('an_router_deployment_presets', JSON.stringify(updated));
    }
    setPresetFeedback('Preset removed.');
    setTimeout(() => setPresetFeedback(''), 3000);
  };

  // Keep defaults updated when routersList loads
  useEffect(() => {
    if (routersList.length > 0) {
      const nextNum = Math.max(routersList.length + 1, 3);
      setNewRouterName(prev => (!prev || prev.startsWith('Branch Router')) ? `Branch Router ${nextNum}` : prev);
      setNewRouterVpnIp(prev => (!prev || prev.startsWith('10.10.10.')) ? `10.10.10.${nextNum + 1}` : prev);
      setNewRouterVpsPort(prev => (!prev || (Number(prev) >= 8729 && Number(prev) <= 8740)) ? String(8728 + nextNum) : prev);
    }
  }, [routersList.length]);

  const nextVpnIp = newRouterVpnIp || defaultNextVpnIp;
  const nextVpsPort = newRouterVpsPort || defaultNextVpsPort;

  // ── Guide navigation pills ────────────────────────────
  const guides = [
    { id: 'overview', label: '📖 Overview', color: '#60A5FA' },
    { id: 'master-config', label: '⚡ Master 1-Shot Config', color: '#F59E0B' },
    { id: 'quick-recovery', label: '🔧 Quick Recovery (Already Online)', color: '#A78BFA' },
    { id: 'vps-setup', label: '🖥️ VPS & WireGuard', color: '#34A853' },
    { id: 'mikrotik-setup', label: '📡 MikroTik REST API', color: '#C084FC' },
    { id: 'watchdog', label: '🔋 Power-Cut Watchdog', color: '#EF4444' },
    { id: 'add-router', label: '➕ Add New Router', color: '#06B6D4' },
  ];

  // ═══════════════════════════════════════════════════════
  // MASTER 1-SHOT CONFIG SCRIPT
  // ═══════════════════════════════════════════════════════
  const masterConfigScript = `# ═══════════════════════════════════════════════════════════
# AFRICAN NETWORK — MASTER 1-SHOT MikroTik Configuration
# ═══════════════════════════════════════════════════════════
# Paste this ENTIRE block into WinBox → Terminal
# This configures REST API, Cloud DDNS, NTP, WireGuard
# keepalive, and the auto-recovery watchdog in ONE shot.
# ═══════════════════════════════════════════════════════════

# ─── 1. Enable REST API on HTTPS port 443 ───
/ip service set www-ssl disabled=no port=443
/ip service set api-ssl disabled=no

# ─── 2. Create a dedicated REST API user (change password!) ───
:do { /user add name=api-user group=full password="${apiPassword || 'AfricanNet2026!'}" } on-error={
  :log info "User 'api-user' already exists — updating password"
  /user set [find name=api-user] password="${apiPassword || 'AfricanNet2026!'}"
}

# ─── 3. Enable MikroTik Cloud DDNS & Time Sync ───
/ip cloud set ddns-enabled=yes update-time=yes

# ─── 4. Configure robust NTP (direct IPs — works before DNS) ───
:do { /system ntp client set enabled=yes servers=216.239.35.0,1.1.1.1 } on-error={
  /system ntp client set enabled=yes primary-ntp=216.239.35.0 secondary-ntp=1.1.1.1
}

# ─── 5. Set WireGuard persistent keepalive (prevents NAT timeout) ───
:do {
  /interface wireguard peers set [find endpoint-port=51820] persistent-keepalive=25s
} on-error={}

# ─── 6. Remove old watchdog if present ───
:do { /system scheduler remove [find name="an-power-watchdog"] } on-error={}
:do { /system script remove [find name="an-watchdog-script"] } on-error={}

# ─── 7. Create Auto-Recovery Watchdog Script ───
/system script add name="an-watchdog-script" policy=read,write,test source={
  :local vpsIp "10.10.10.1"
  :local pingCount [/ping $vpsIp count=2]
  :if ($pingCount = 0) do={
    :log warning "Watchdog: WireGuard unreachable. Cycling interface..."
    :do {
      /interface wireguard disable [find name="wg-vps"]
      :delay 2s
      /interface wireguard enable [find name="wg-vps"]
    } on-error={}
    :do { /ip cloud force-update } on-error={}
  }
  :do {
    /tool fetch url="${appProtocol}//${appHostname}/api/mikrotik/heartbeat?secret=${activeSecret}" mode=https check-certificate=no keep-result=no
  } on-error={}
}

# ─── 8. Schedule watchdog: runs on boot + every 60s ───
/system scheduler add name="an-power-watchdog" start-time=startup interval=60s on-event="/system script run an-watchdog-script" policy=read,write,test

# ─── 9. Generate self-signed SSL cert if none exists ───
:do {
  /certificate add name=local-cert common-name=router key-size=2048
  /certificate sign local-cert
  /ip service set www-ssl certificate=local-cert
} on-error={
  :log info "SSL cert already exists — skipping"
}

:log info "═══ African Network: Master config applied successfully! ═══"
:put ""
:put "SUCCESS! Router is now configured for:"
:put "  ✅ REST API on HTTPS port 443"
:put "  ✅ Cloud DDNS & auto time sync"  
:put "  ✅ WireGuard keepalive (25s)"
:put "  ✅ Power-cut auto-recovery watchdog"
:put "  ✅ Heartbeat reporting to cloud"
:put ""
:put "Next: Add this router in your Admin Dashboard → Locations & Fleet"`;

  // ═══════════════════════════════════════════════════════
  // VPS SETUP SCRIPTS
  // ═══════════════════════════════════════════════════════
  const vpsInstallScript = `# ═══════════════════════════════════════════════════════════
# VPS Full Setup (Run on Hostinger VPS via SSH)
# ═══════════════════════════════════════════════════════════

# 1. Install WireGuard
apt update && apt install -y wireguard

# 2. Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# 3. Open firewall ports
ufw allow 22/tcp       # SSH
ufw allow 51820/udp    # WireGuard
ufw allow 8443/tcp     # Router 1 API
ufw allow 8730/tcp     # Router 2 API

# 4. Start and enable WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# 5. Verify
wg show
iptables -t nat -L -n | grep -E "8443|8730"
cat /proc/sys/net/ipv4/ip_forward`;

  const wg0ConfTemplate = `[Interface]
Address = 10.10.10.1/24
ListenPort = 51820
PrivateKey = <VPS_PRIVATE_KEY>

# ─── Port Forwarding Rules ───
# Router 1: VPS port 8443 → 10.10.10.2:443
PostUp = iptables -t nat -A PREROUTING -p tcp --dport 8443 -j DNAT --to-destination 10.10.10.2:443
PostUp = iptables -A FORWARD -p tcp -d 10.10.10.2 --dport 443 -j ACCEPT

# Router 2: VPS port 8730 → 10.10.10.3:443
PostUp = iptables -t nat -A PREROUTING -p tcp --dport 8730 -j DNAT --to-destination 10.10.10.3:443
PostUp = iptables -A FORWARD -p tcp -d 10.10.10.3 --dport 443 -j ACCEPT

PostUp = iptables -t nat -A POSTROUTING -j MASQUERADE

PostDown = iptables -t nat -D PREROUTING -p tcp --dport 8443 -j DNAT --to-destination 10.10.10.2:443
PostDown = iptables -D FORWARD -p tcp -d 10.10.10.2 --dport 443 -j ACCEPT
PostDown = iptables -t nat -D PREROUTING -p tcp --dport 8730 -j DNAT --to-destination 10.10.10.3:443
PostDown = iptables -D FORWARD -p tcp -d 10.10.10.3 --dport 443 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -j MASQUERADE

# ─── Peers ───
[Peer]
# Router 1
PublicKey = <ROUTER_1_PUBLIC_KEY>
AllowedIPs = 10.10.10.2/32

[Peer]
# Router 2
PublicKey = <ROUTER_2_PUBLIC_KEY>
AllowedIPs = 10.10.10.3/32`;

  // ═══════════════════════════════════════════════════════
  // ADD NEW ROUTER SCRIPTS (SYNCHRONIZED & EXECUTABLE)
  // ═══════════════════════════════════════════════════════

  // Phase 1: MikroTik Create WireGuard Interface
  const addRouterPhase1Script = `# ═══════════════════════════════════════════════════════
# Phase 1: Create WireGuard Interface on New Router
# Run on the NEW MikroTik Router via WinBox → Terminal
# ═══════════════════════════════════════════════════════

# 1. Create WireGuard interface
:do {
  /interface wireguard add name=wg-vps listen-port=0 mtu=1420
} on-error={
  :log info "WireGuard interface wg-vps already exists"
}

# 2. Print Public Key
:put ""
:put "═══════════════════════════════════════════════════════"
:put "COPY THIS PUBLIC KEY (paste into form in admin dashboard):"
:put "═══════════════════════════════════════════════════════"
/interface wireguard print where name=wg-vps`;

  // Phase 2: VPS 1-Shot Zero-Downtime Hot-Add Bash Script
  const addRouterVpsScript = `# ═══════════════════════════════════════════════════════
# Phase 2: Add Router to VPS (1-Shot Zero-Downtime Script)
# SSH into Hostinger VPS: ssh root@187.7.22.89
# Paste this ENTIRE block into VPS SSH Terminal
# ═══════════════════════════════════════════════════════

ROUTER_NAME="${newRouterName || `Branch Router ${nextRouterNumber}`}"
ROUTER_KEY="${(newRouterPublicKey || '').trim() || '<PASTE_ROUTER_PUBLIC_KEY>'}"
ROUTER_IP="${newRouterVpnIp || defaultNextVpnIp}"
VPS_PORT="${newRouterVpsPort || defaultNextVpsPort}"

echo "═══════════════════════════════════════════════════════"
echo "Registering $ROUTER_NAME on VPS Hub"
echo "  • WireGuard Tunnel IP: $ROUTER_IP"
echo "  • Forwarding Port: $VPS_PORT -> $ROUTER_IP:443"
echo "═══════════════════════════════════════════════════════"

if [ "$ROUTER_KEY" = "<PASTE_ROUTER_PUBLIC_KEY>" ] || [ -z "$ROUTER_KEY" ]; then
  echo "⚠️ ERROR: Router Public Key is missing!"
  echo "Please copy the public key from WinBox (Phase 1) and paste it into the dashboard form."
  exit 1
fi

# 1. Authorize peer LIVE on WireGuard without restart (Zero downtime for other routers)
wg set wg0 peer "$ROUTER_KEY" allowed-ips "$ROUTER_IP/32"

# 2. Append peer to /etc/wireguard/wg0.conf for reboot persistence
cat <<EOF >> /etc/wireguard/wg0.conf

[Peer]
# $ROUTER_NAME
PublicKey = $ROUTER_KEY
AllowedIPs = $ROUTER_IP/32
EOF

# 3. Add live NAT port forwarding to iptables (Forward $VPS_PORT -> $ROUTER_IP:443)
iptables -t nat -A PREROUTING -p tcp --dport $VPS_PORT -j DNAT --to-destination $ROUTER_IP:443
iptables -A FORWARD -p tcp -d $ROUTER_IP --dport 443 -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT
iptables -t nat -A POSTROUTING -j MASQUERADE

# 4. Open port in UFW firewall
ufw allow $VPS_PORT/tcp

# 5. Persist firewall rules permanently across reboots
if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save
elif [ -d /etc/iptables ]; then
  iptables-save > /etc/iptables/rules.v4
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ SUCCESS! $ROUTER_NAME is registered on VPS."
echo "═══════════════════════════════════════════════════════"
wg show wg0`;

  // Phase 3: MikroTik Connect to VPS & Verify Tunnel
  const addRouterPhase3Script = `# ═══════════════════════════════════════════════════════
# Phase 3: Connect to VPS WireGuard & Test Ping
# Run on the NEW MikroTik Router via WinBox → Terminal
# ═══════════════════════════════════════════════════════

# 1. Assign VPN IP to WireGuard interface
:do {
  /ip address add address=${newRouterVpnIp || defaultNextVpnIp}/24 interface=wg-vps
} on-error={
  /ip address set [find interface=wg-vps] address=${newRouterVpnIp || defaultNextVpnIp}/24
}

# 2. Add VPS as peer with 25s persistent keepalive
:do {
  /interface wireguard peers add \\
    interface=wg-vps \\
    public-key="${(vpsPublicKey || '').trim() || '<VPS_PUBLIC_KEY>'}" \\
    endpoint-address="187.7.22.89" \\
    endpoint-port=51820 \\
    allowed-address=10.10.10.0/24 \\
    persistent-keepalive=25s
} on-error={
  /interface wireguard peers set [find interface=wg-vps] \\
    public-key="${(vpsPublicKey || '').trim() || '<VPS_PUBLIC_KEY>'}" \\
    endpoint-address="187.7.22.89" \\
    endpoint-port=51820 \\
    allowed-address=10.10.10.0/24 \\
    persistent-keepalive=25s
}

# 3. Test ping to VPS Hub
:put ""
:put "Testing ping to VPS Hub (10.10.10.1)..."
/ping 10.10.10.1 count=3

:put ""
:put "If ping succeeds (0% packet loss), WireGuard tunnel is UP!"
:put "Next: Proceed to Phase 4 (Master 1-Shot Config)."`;

  // ═══════════════════════════════════════════════════════
  // REST API ONLY SETUP
  // ═══════════════════════════════════════════════════════
  const restApiSetupScript = `# ═══════════════════════════════════════════════════════
# MikroTik REST API Setup (Minimal)
# Run on MikroTik Router via WinBox → Terminal
# ═══════════════════════════════════════════════════════

# 1. Enable HTTPS service on port 443
/ip service set www-ssl disabled=no port=443

# 2. Enable REST API over SSL
/ip service set api-ssl disabled=no

# 3. Generate self-signed SSL certificate
:do {
  /certificate add name=local-cert common-name=router key-size=2048
  /certificate sign local-cert
  /ip service set www-ssl certificate=local-cert
} on-error={
  :log info "Certificate already exists"
}

# 4. Create a dedicated API user
:do {
  /user add name=api-user group=full password="${apiPassword || 'AfricanNet2026!'}"
} on-error={
  :log info "User api-user already exists — updating password"
  /user set [find name=api-user] password="${apiPassword || 'AfricanNet2026!'}"
}

# 5. Test — from any browser or curl:
#    https://<ROUTER_IP>:443/rest/system/resource
#    Login: api-user / ${apiPassword || 'AfricanNet2026!'}

:put "REST API is now active on HTTPS port 443"
:put "Test URL: https://$(ip address get [find interface=ether1] address)/rest/system/resource"`;

  // ═══════════════════════════════════════════════════════
  // WATCHDOG-ONLY SCRIPT
  // ═══════════════════════════════════════════════════════
  const watchdogOnlyScript = `# ═══════════════════════════════════════════════════════
# Power-Cut Auto-Recovery Watchdog (Standalone)
# For: ${activeRouterName}
# Paste into WinBox → Terminal
# ═══════════════════════════════════════════════════════

# 1. Enable Cloud Time Sync (fixes 1970 clock after power loss)
/ip cloud set ddns-enabled=yes update-time=yes

# 2. Configure NTP with direct IPs (works before DNS resolves)
:do { /system ntp client set enabled=yes servers=216.239.35.0,1.1.1.1 } on-error={
  /system ntp client set enabled=yes primary-ntp=216.239.35.0 secondary-ntp=1.1.1.1
}

# 3. Set WireGuard keepalive to prevent NAT mapping timeout
:do {
  /interface wireguard peers set [find endpoint-port=51820] persistent-keepalive=25s
} on-error={}

# 4. Remove old watchdog (safe to run if none exists)
:do { /system scheduler remove [find name="an-power-watchdog"] } on-error={}
:do { /system script remove [find name="an-watchdog-script"] } on-error={}

# 5. Create the recovery script
/system script add name="an-watchdog-script" policy=read,write,test source={
  :local vpsIp "10.10.10.1"
  :local pingCount [/ping $vpsIp count=2]
  :if ($pingCount = 0) do={
    :log warning "Watchdog: VPS unreachable. Cycling WireGuard..."
    :do {
      /interface wireguard disable [find name="wg-vps"]
      :delay 2s
      /interface wireguard enable [find name="wg-vps"]
    } on-error={}
    :do { /ip cloud force-update } on-error={}
  }
  :do {
    /tool fetch url="${appProtocol}//${appHostname}/api/mikrotik/heartbeat?secret=${activeSecret}" mode=https check-certificate=no keep-result=no
  } on-error={}
}

# 6. Run on boot + every 60 seconds
/system scheduler add name="an-power-watchdog" start-time=startup interval=60s on-event="/system script run an-watchdog-script" policy=read,write,test

:log info "Power-Cut Auto-Recovery Watchdog installed!"
:put "✅ Watchdog active! After any future power cut, router reconnects in 30-60 seconds."`;


  return (
    <div className="sa-tab-body">

      {/* ── GitBook Style Documentation Header ── */}
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: 14,
          padding: '24px 26px',
          marginBottom: 24,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 18,
          borderBottom: '1px solid #1E293B',
          paddingBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#1E293B',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}>
              📖
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                Setup & Deployment Docs
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#94A3B8', lineHeight: 1.5 }}>
                Official operational runbooks, copy-paste terminal scripts, and multi-router fleet configurations.
              </p>
            </div>
          </div>

          {/* Active router context chip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#0B0F19',
            border: '1px solid #1E293B',
            borderRadius: 8,
            padding: '8px 14px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: activeRouter?.status === 'online' ? '#10B981' : '#EF4444',
              boxShadow: `0 0 8px ${activeRouter?.status === 'online' ? '#10B981' : '#EF4444'}`,
            }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#F8FAFC' }}>
              Target: {activeRouterName}
            </span>
            <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'monospace' }}>
              ({activeRouter?.ip_address || 'Cloud'}:{activeRouter?.port || 443})
            </span>
          </div>
        </div>

        {/* GitBook Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          background: '#0B0F19',
          border: '1px solid #1E293B',
          borderRadius: 10,
          padding: 6,
        }}>
          {guides.map(g => {
            const isActive = activeGuide === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGuide(g.id)}
                style={{
                  background: isActive ? '#1E293B' : 'transparent',
                  border: isActive ? '1px solid #38BDF8' : '1px solid transparent',
                  borderRadius: 7,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* OVERVIEW GUIDE                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'overview' && (
        <div>
          {/* Architecture diagram */}
          <CollapsibleSection
            title="Architecture Overview"
            icon="🏗️"
            subtitle="How the platform connects to MikroTik routers"
            color="#60A5FA"
            defaultOpen={true}
          >
            <CopyBlock
              label="Network Architecture Diagram"
              language="ascii"
              code={`
┌──────────────────────────────────┐
│   Vercel (Next.js Cloud App)     │
│   africannetwork.vercel.app      │
└──────────┬───────────────────────┘
           │  HTTPS REST API Calls
           ▼
┌──────────────────────────────────┐
│   Hostinger VPS (187.7.22.89)    │
│   Ubuntu + WireGuard Server      │
│                                  │
│   Port 8443 → 10.10.10.2:443    │  ← Router 1
│   Port 8730 → 10.10.10.3:443    │  ← Router 2
│   Port ${nextVpsPort}  → ${nextVpnIp}:443    │  ← Router ${nextRouterNumber} (next)
│                                  │
│   WireGuard VPN: UDP 51820       │
└──────────┬───────────────────────┘
           │  Encrypted WireGuard Tunnel
           ▼
┌──────────────────────────────────┐
│   MikroTik Routers               │
│   (Behind local ISP NAT)         │
│                                  │
│   Router 1: 10.10.10.2 (VPN)    │
│   Router 2: 10.10.10.3 (VPN)    │
│                                  │
│   REST API on HTTPS:443          │
│   Hotspot + Captive Portal       │
└──────────────────────────────────┘`}
            />

            {/* Port forwarding table */}
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 12.5, color: '#E2E8F0',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B', background: '#131C31' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>VPS Public Port</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Forwards To</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {routersList.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px 14px' }}>
                        <code style={{ color: '#F59E0B' }}>{r.port || (8443 + i * 287)}</code>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <code style={{ color: '#4ADE80' }}>10.10.10.{i + 2}:443</code>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        {r.status === 'online' ? '🟢' : '🔴'} {r.name} — MikroTik REST API
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: '1px solid #1E293B' }}>
                    <td style={{ padding: '8px 14px' }}><code style={{ color: '#F59E0B' }}>51820</code> (UDP)</td>
                    <td style={{ padding: '8px 14px' }}>—</td>
                    <td style={{ padding: '8px 14px' }}>WireGuard VPN listen port</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 14px' }}><code style={{ color: '#F59E0B' }}>22</code> (TCP)</td>
                    <td style={{ padding: '8px 14px' }}>—</td>
                    <td style={{ padding: '8px 14px' }}>SSH access</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* Quick decision tree */}
          <CollapsibleSection
            title="Which Guide Do I Need?"
            icon="🧭"
            subtitle="Quick decision tree based on your situation"
            color="#34A853"
            defaultOpen={true}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {[
                {
                  emoji: '🆕',
                  title: 'Setting Up a Brand New Router',
                  desc: 'First time configuring a MikroTik for this platform',
                  action: 'Use the Master 1-Shot Config — it does everything in one paste.',
                  color: '#F59E0B',
                  guide: 'master-config',
                },
                {
                  emoji: '🖥️',
                  title: 'VPS Was Wiped / New VPS Setup',
                  desc: 'Hostinger VPS expired or you need to start from scratch',
                  action: 'Go to VPS & WireGuard guide for full restore procedure.',
                  color: '#34A853',
                  guide: 'vps-setup',
                },
                {
                  emoji: '⚡',
                  title: 'Router Shows Offline After Power Cut',
                  desc: 'Power went out and the router isn\'t reconnecting',
                  action: 'Install the Power-Cut Watchdog to permanently fix this.',
                  color: '#EF4444',
                  guide: 'watchdog',
                },
                {
                  emoji: '➕',
                  title: 'Adding Another Router to the Fleet',
                  desc: 'Expanding to a new location with a new MikroTik',
                  action: 'Follow the Add New Router guide — VPS + Router steps.',
                  color: '#06B6D4',
                  guide: 'add-router',
                },
              ].map((card) => (
                <div
                  key={card.guide}
                  onClick={() => setActiveGuide(card.guide)}
                  style={{
                    background: '#131C31',
                    border: '1px solid #1E293B',
                    borderRadius: 12,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{card.emoji}</span>
                    <strong style={{ fontSize: 13, color: card.color }}>{card.title}</strong>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                    {card.desc}
                  </p>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#E2E8F0', fontWeight: 600 }}>
                    → {card.action}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Timing comparison */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid #1E293B', borderLeft: '4px solid #F59E0B',
            borderRadius: 14,
            padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>⏱️</span>
              <strong style={{ fontSize: 14, color: '#F59E0B' }}>Recovery Time Comparison</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid #7F1D1D',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <strong style={{ color: '#FCA5A5', fontSize: 12 }}>❌ Without Watchdog</strong>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444', margin: '6px 0 4px' }}>1–3 hours</div>
                <p style={{ margin: 0, fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
                  Router boots with 1970 clock → WireGuard rejects handshakes → Waits for slow NTP/DNS → Eventually syncs
                </p>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid #065F46',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <strong style={{ color: '#86EFAC', fontSize: 12 }}>✅ With Watchdog</strong>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', margin: '6px 0 4px' }}>30–60 sec</div>
                <p style={{ margin: 0, fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
                  Boot → Cloud time sync instantly → WireGuard keepalive reconnects → Heartbeat pings cloud server
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* MASTER 1-SHOT CONFIG                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'master-config' && (
        <div>
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid #1E293B', borderLeft: '4px solid #F59E0B',
            borderRadius: 14,
            padding: '18px 22px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <div>
                <strong style={{ fontSize: 15, color: '#F59E0B' }}>Master 1-Shot Configuration</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#CBD5E1' }}>
                  Paste this ONE script into WinBox Terminal and it configures EVERYTHING.
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 8,
              marginTop: 10,
            }}>
              {[
                { icon: '🔒', text: 'REST API on HTTPS:443' },
                { icon: '👤', text: 'Dedicated API user' },
                { icon: '☁️', text: 'Cloud DDNS & time sync' },
                { icon: '🕐', text: 'NTP with direct IPs' },
                { icon: '🌐', text: 'WireGuard keepalive' },
                { icon: '⚡', text: 'Auto-recovery watchdog' },
                { icon: '📡', text: 'Boot heartbeat to cloud' },
                { icon: '🔐', text: 'Self-signed SSL cert' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 11.5,
                  color: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prerequisites */}
          <CollapsibleSection
            title="Prerequisites"
            icon="✅"
            subtitle="What you need before running the script"
            color="#60A5FA"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li><strong>WinBox</strong> installed on your computer (<a href="https://mikrotik.com/download" target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA' }}>Download from MikroTik</a>)</li>
                <li><strong>Connect to router</strong> via WinBox (MAC or IP address)</li>
                <li><strong>WireGuard tunnel</strong> already set up between router and VPS (see <span onClick={() => setActiveGuide('add-router')} style={{ color: '#06B6D4', cursor: 'pointer', textDecoration: 'underline' }}>Add New Router</span> guide if not)</li>
                <li>API Password: Pre-configured below as <code style={{ color: '#34D399', background: '#1E293B', padding: '2px 6px', borderRadius: 4 }}>{apiPassword}</code> — automatically injected into script (no manual editing needed!)</li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* Steps */}
          <CollapsibleSection
            title="Step-by-Step Instructions"
            icon="📝"
            subtitle="How to run the master config"
            color="#F59E0B"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={1} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Open WinBox & Connect</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.5 }}>
                    Launch WinBox → Click on your router&apos;s MAC address → Login as admin
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={2} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Open Terminal</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.5 }}>
                    In WinBox, click <strong>&quot;New Terminal&quot;</strong> in the left menu to open the RouterOS command line
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={3} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Copy & Paste the Script</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.5 }}>
                    Click the &quot;📋 Copy&quot; button below → Right-click in the WinBox terminal → Paste
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={4} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Register in Admin Dashboard</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.5 }}>
                    Go to <strong>Locations & Fleet</strong> tab → Add the router with its VPS IP (187.7.22.89), port, and API credentials
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* The actual script */}
          {/* Interactive API Password Generator */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              <div>
                <strong style={{ fontSize: 13.5, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔑 REST API Password Configurator
                </strong>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  The script below will automatically use this password. Just copy and paste into WinBox — no manual editing required!
                </span>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  color: '#38BDF8',
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🎲 Generate Password
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type={showApiPassword ? 'text' : 'password'}
                value={apiPassword}
                onChange={e => setApiPassword(e.target.value)}
                style={{
                  flex: 1,
                  background: '#030712',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '8px 14px',
                  color: '#34D399',
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 700,
                }}
                placeholder="Enter password..."
              />
              <button
                type="button"
                onClick={() => setShowApiPassword(!showApiPassword)}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#CBD5E1',
                  padding: '8px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {showApiPassword ? '👁️ Hide' : '👁️ Show'}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: '#FBBF24', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span> <strong>Remember this password!</strong> You will use username <code style={{ color: '#38BDF8' }}>api-user</code> and this password when registering the router in <strong>Locations & Fleet</strong>.
            </div>
          </div>

          <CopyBlock
            label="⚡ Master 1-Shot Config — Copy & Paste into WinBox Terminal"
            language="RouterOS Script"
            code={masterConfigScript}
          />

          {/* Important notes */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid #7F1D1D',
            borderRadius: 12,
            padding: '14px 18px',
            marginTop: 8,
          }}>
            <strong style={{ color: '#FCA5A5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span> Important Reminders
            </strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
              <li>API credentials are automatically set to: <code style={{ color: '#38BDF8' }}>api-user</code> / <code style={{ color: '#34D399' }}>{apiPassword}</code></li>
              <li>The WireGuard tunnel (<code>wg-vps</code>) must already be configured on the router</li>
              <li>This script is safe to run multiple times — it won&apos;t duplicate anything</li>
              <li>After running, register the router in <strong>Locations & Fleet</strong> in the admin dashboard</li>
            </ul>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* VPS & WIREGUARD SETUP                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'vps-setup' && (
        <div>
          <CollapsibleSection
            title="VPS Requirements"
            icon="📋"
            subtitle="What you need for the Hostinger VPS"
            color="#34A853"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10,
              }}>
                {[
                  { label: 'Provider', value: 'Hostinger VPS' },
                  { label: 'OS', value: 'Ubuntu 22.04+ LTS' },
                  { label: 'RAM', value: '1 GB minimum' },
                  { label: 'Public IP', value: '187.7.22.89' },
                  { label: 'SSH Access', value: 'Port 22' },
                  { label: 'WireGuard', value: 'UDP 51820' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid #1E293B',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid #7F1D1D',
                borderRadius: 10,
                padding: '12px 16px',
                marginTop: 14,
                fontSize: 12,
                color: '#FCA5A5',
              }}>
                <strong>⚠️ CRITICAL:</strong> Enable <strong>Auto-Renewal</strong> on Hostinger! If the VPS expires, the OS gets completely wiped and all config is lost. You&apos;ll need to run the full restore procedure below.
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="WireGuard Config File (wg0.conf)"
            icon="🔐"
            subtitle="/etc/wireguard/wg0.conf on the VPS"
            color="#C084FC"
            defaultOpen={false}
          >
            <CopyBlock
              label="📄 WireGuard Server Config Template"
              language="INI"
              code={wg0ConfTemplate}
            />
            <p style={{ fontSize: 11.5, color: '#CBD5E1', margin: '4px 8px', lineHeight: 1.5 }}>
              Replace <code style={{ color: '#F59E0B' }}>&lt;VPS_PRIVATE_KEY&gt;</code> and <code style={{ color: '#F59E0B' }}>&lt;ROUTER_X_PUBLIC_KEY&gt;</code> with actual keys.
              Generate VPS keys with: <code style={{ color: '#4ADE80' }}>wg genkey | tee privatekey | wg pubkey &gt; publickey</code>
            </p>
          </CollapsibleSection>

          <CollapsibleSection
            title="Full VPS Setup / Restore Procedure"
            icon="🔄"
            subtitle="Run these commands if VPS is fresh or was wiped"
            color="#34A853"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <StepBadge number={1} color="#34A853" />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>SSH into VPS</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1' }}>
                    <code style={{ color: '#4ADE80' }}>ssh root@187.7.22.89</code>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <StepBadge number={2} color="#34A853" />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Write the wg0.conf file</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1' }}>
                    Copy the WireGuard config from above to <code style={{ color: '#4ADE80' }}>/etc/wireguard/wg0.conf</code>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <StepBadge number={3} color="#34A853" />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Run this setup script</strong>
                </div>
              </div>
            </div>

            <CopyBlock
              label="🖥️ VPS Full Install & Enable Script (run as root)"
              language="bash"
              code={vpsInstallScript}
            />
          </CollapsibleSection>

          {/* UFW ports reference */}
          <CollapsibleSection
            title="Firewall (UFW) Port Reference"
            icon="🛡️"
            subtitle="All required ports and their purpose"
            color="#60A5FA"
            defaultOpen={false}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 12.5, color: '#E2E8F0',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B', background: '#131C31' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Port</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Protocol</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Purpose</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>UFW Command</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { port: '22', proto: 'TCP', purpose: 'SSH access', cmd: 'ufw allow 22/tcp' },
                    { port: '51820', proto: 'UDP', purpose: 'WireGuard VPN', cmd: 'ufw allow 51820/udp' },
                    { port: '8443', proto: 'TCP', purpose: 'Router 1 REST API', cmd: 'ufw allow 8443/tcp' },
                    { port: '8730', proto: 'TCP', purpose: 'Router 2 REST API', cmd: 'ufw allow 8730/tcp' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px 14px' }}><code style={{ color: '#F59E0B' }}>{row.port}</code></td>
                      <td style={{ padding: '8px 14px' }}>{row.proto}</td>
                      <td style={{ padding: '8px 14px' }}>{row.purpose}</td>
                      <td style={{ padding: '8px 14px' }}><code style={{ color: '#4ADE80', fontSize: 11 }}>{row.cmd}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* MIKROTIK REST API SETUP                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'mikrotik-setup' && (
        <div>
          <CollapsibleSection
            title="What is the MikroTik REST API?"
            icon="💡"
            subtitle="Understanding how the platform communicates with routers"
            color="#C084FC"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', fontSize: 13, color: '#CBD5E1', lineHeight: 1.6 }}>
              <p>
                MikroTik RouterOS 7+ includes a built-in <strong style={{ color: '#C084FC' }}>REST API</strong> that allows
                external applications to manage the router over HTTPS. This is how the African Network platform
                creates vouchers, manages sessions, pushes login pages, and monitors router health — all remotely.
              </p>
              <p style={{ marginTop: 8 }}>
                The REST API is accessed at <code style={{ color: '#4ADE80' }}>https://&lt;ROUTER_IP&gt;:443/rest/...</code>
                and requires Basic Authentication (username + password).
              </p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="REST API Setup (Standalone Script)"
            icon="🔧"
            subtitle="Minimal script to enable REST API only"
            color="#C084FC"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <StepBadge number={1} color="#C084FC" />
                <div>
                  <strong style={{ color: '#FFFFFF' }}>Open WinBox → New Terminal</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <StepBadge number={2} color="#C084FC" />
                <div>
                  <strong style={{ color: '#FFFFFF' }}>Paste the script below</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <StepBadge number={3} color="#C084FC" />
                <div>
                  <strong style={{ color: '#FFFFFF' }}>Test the API</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#CBD5E1' }}>
                    Visit <code style={{ color: '#4ADE80' }}>https://&lt;ROUTER_IP&gt;:443/rest/system/resource</code> in your browser
                  </p>
                </div>
              </div>
            </div>

            <CopyBlock
              label="🔧 REST API Setup Script — Paste in WinBox Terminal"
              language="RouterOS Script"
              code={restApiSetupScript}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Testing the REST API"
            icon="🧪"
            subtitle="How to verify the API is working"
            color="#06B6D4"
            defaultOpen={false}
          >
            <div style={{ padding: '0 8px' }}>
              <CopyBlock
                label="Test from your computer (curl)"
                language="bash"
                code={`# Replace ROUTER_IP, USERNAME, PASSWORD with your values
curl -k -u "api-user:YOUR_PASSWORD" https://ROUTER_IP:443/rest/system/resource

# Expected output: JSON with router info (uptime, CPU, RAM, etc.)

# Test via VPS tunnel:
curl -k -u "api-user:YOUR_PASSWORD" https://187.7.22.89:8443/rest/system/resource`}
              />

              <CopyBlock
                label="Test from the Admin Dashboard"
                language="text"
                code={`1. Go to MikroTik Config tab
2. Enter the Router IP (or VPS IP), Port, Username, Password
3. Click "Test Connection"
4. If green "Connected" badge appears — you're all set!`}
              />
            </div>
          </CollapsibleSection>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* POWER-CUT WATCHDOG                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'watchdog' && (
        <div>
          {/* Problem explanation */}
          <CollapsibleSection
            title="The Problem: MikroTik Clock Reset"
            icon="🕒"
            subtitle="Why routers go offline after power cuts"
            color="#EF4444"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid #7F1D1D',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>🕒 Clock Reset (1970)</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                    MikroTik hAP ax² has no battery RTC. Power loss resets clock to Jan 1, 1970.
                  </p>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid #7F1D1D',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>🔒 WireGuard Rejection</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                    WireGuard drops handshakes as &quot;replay attacks&quot; because the timestamp is decades in the past.
                  </p>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid #7F1D1D',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>⏳ Slow NTP Recovery</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                    Default NTP uses DNS hostnames that may not resolve until the ISP modem finishes booting.
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Solution */}
          <CollapsibleSection
            title="The Solution: Auto-Recovery Watchdog"
            icon="⚡"
            subtitle="What the watchdog script does and how it fixes the problem"
            color="#22C55E"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li><strong style={{ color: '#22C55E' }}>Cloud Time Sync</strong> — Uses MikroTik Cloud (IP-based, no DNS needed) to fix the clock immediately on boot</li>
                <li><strong style={{ color: '#22C55E' }}>Direct IP NTP</strong> — Configures NTP with <code>216.239.35.0</code> and <code>1.1.1.1</code> (no DNS resolution required)</li>
                <li><strong style={{ color: '#22C55E' }}>WireGuard Keepalive</strong> — Sets 25-second persistent keepalive to prevent NAT mapping timeout</li>
                <li><strong style={{ color: '#22C55E' }}>Interface Cycling</strong> — If VPS is unreachable, disables and re-enables the WireGuard tunnel</li>
                <li><strong style={{ color: '#22C55E' }}>Cloud Heartbeat</strong> — Pings the cloud server to report &quot;I&apos;m back online&quot; with current IP</li>
                <li><strong style={{ color: '#22C55E' }}>Runs on Boot + Every 60s</strong> — Triggers immediately after power restoration, then maintains health</li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* The script */}
          <CopyBlock
            label={`⚡ Watchdog Script for ${activeRouterName} — Copy & Paste into WinBox Terminal`}
            language="RouterOS Script"
            code={watchdogOnlyScript}
          />

          {/* Verify installation */}
          <CollapsibleSection
            title="Verify Watchdog Installation"
            icon="✅"
            subtitle="How to confirm the watchdog is running"
            color="#60A5FA"
            defaultOpen={false}
          >
            <CopyBlock
              label="Check if watchdog is installed & running"
              language="RouterOS"
              code={`# Check the scheduled task
/system scheduler print where name="an-power-watchdog"

# Check the script exists
/system script print where name="an-watchdog-script"

# Manually trigger the watchdog to test
/system script run an-watchdog-script

# Check router logs for watchdog activity
/log print where topics~"script"`}
            />
          </CollapsibleSection>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* QUICK RECOVERY — ALREADY ONLINE ROUTERS               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'quick-recovery' && (
        <div>
          {/* When to use */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B', borderLeft: '4px solid #A78BFA',
            borderRadius: 14,
            padding: '18px 22px',
            marginBottom: 20,
          }}>
            <strong style={{ color: '#A78BFA', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>🔧</span> When to Use This Script
            </strong>
            <p style={{ margin: 0, fontSize: 13, color: '#E2E8F0', lineHeight: 1.6 }}>
              Use this for routers that are <strong style={{ color: '#4ADE80' }}>already online and working</strong> — they already have
              REST API, WireGuard, and credentials configured. They just need the <strong style={{ color: '#FBBF24' }}>power-cut
              auto-recovery watchdog</strong> so they come back online in 30-60 seconds instead of 1-3 hours after future blackouts.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              marginTop: 14,
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid #7F1D1D',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <strong style={{ color: '#FCA5A5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⛔ Without Script
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                  Power cut → clock resets to 1970 → WireGuard rejects handshakes → <strong style={{ color: '#EF4444' }}>1 to 3 hours</strong> to recover
                </p>
              </div>
              <div style={{
                background: '#0F172A',
                border: '1px solid #065F46',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <strong style={{ color: '#86EFAC', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✅ With Script
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>
                  Power cut → watchdog syncs clock via direct IP → WireGuard reconnects → <strong style={{ color: '#22C55E' }}>30 to 60 seconds</strong> to recover
                </p>
              </div>
            </div>
          </div>

          {/* What it does NOT touch */}
          <CollapsibleSection
            title="What This Script Does NOT Change"
            icon="ℹ️"
            subtitle="Safe for already-configured routers"
            color="#60A5FA"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>❌ Does <strong>NOT</strong> change your REST API settings (port, user, password)</li>
                <li>❌ Does <strong>NOT</strong> change your WireGuard tunnel config (keys, endpoints)</li>
                <li>❌ Does <strong>NOT</strong> touch SSL certificates, hotspot config, or user profiles</li>
                <li>❌ Does <strong>NOT</strong> modify your IP addresses or routing tables</li>
                <li style={{ color: '#4ADE80' }}>✅ <strong>ONLY</strong> adds: Cloud time sync, direct NTP, WireGuard keepalive, and a boot watchdog script</li>
              </ul>
            </div>
          </CollapsibleSection>

          {/* The script */}
          <CopyBlock
            label={`🔧 Power-Cut Recovery Script for ${activeRouterName} — Copy & Paste into WinBox Terminal`}
            language="RouterOS Script"
            code={watchdogOnlyScript}
          />

          {/* How to apply */}
          <CollapsibleSection
            title="How to Apply (2 Minutes)"
            icon="📋"
            subtitle="Step-by-step for already-online routers"
            color="#F59E0B"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2.2 }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', marginLeft: -20, padding: '6px 0' }}>
                  <StepBadge number="1" color="#A78BFA" />
                  <span>Open <strong>WinBox</strong> and connect to your router (use the same IP/credentials you already have)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', marginLeft: -20, padding: '6px 0' }}>
                  <StepBadge number="2" color="#A78BFA" />
                  <span>Open <strong>New Terminal</strong> (menu on left side)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', marginLeft: -20, padding: '6px 0' }}>
                  <StepBadge number="3" color="#A78BFA" />
                  <span>Click the <strong style={{ color: '#4ADE80' }}>📋 Copy</strong> button above to copy the script</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', marginLeft: -20, padding: '6px 0' }}>
                  <StepBadge number="4" color="#A78BFA" />
                  <span><strong>Right-click</strong> inside the terminal to paste, then press <strong>Enter</strong></span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', marginLeft: -20, padding: '6px 0' }}>
                  <StepBadge number="5" color="#A78BFA" />
                  <span>You should see: <code style={{ color: '#4ADE80' }}>✅ Watchdog active!</code> — that&apos;s it, you&apos;re done!</span>
                </li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* Verify */}
          <CollapsibleSection
            title="Verify It's Working"
            icon="✅"
            subtitle="Run these commands to confirm installation"
            color="#22C55E"
            defaultOpen={false}
          >
            <CopyBlock
              label="Verification Commands"
              language="RouterOS"
              code={`# Check the scheduled task exists
/system scheduler print where name="an-power-watchdog"

# Check the script exists
/system script print where name="an-watchdog-script"

# Manually trigger the watchdog to test
/system script run an-watchdog-script

# Check router logs for watchdog activity
/log print where topics~"script"`}
            />
          </CollapsibleSection>

          {/* Already installed? */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid #1E293B', borderLeft: '4px solid #F59E0B',
            borderRadius: 14,
            padding: '16px 20px',
            marginTop: 8,
          }}>
            <strong style={{ color: '#FBBF24', fontSize: 12 }}>💡 Already Installed?</strong>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#CBD5E1', lineHeight: 1.5 }}>
              Running this script again is <strong style={{ color: '#4ADE80' }}>completely safe</strong> — it removes the old watchdog first before re-creating it.
              You can re-run it anytime to update the heartbeat URL or watchdog behavior.
            </p>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* ADD NEW ROUTER                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeGuide === 'add-router' && (
        <div>
          {/* ── Top Hero Card ── */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderLeft: '4px solid #06B6D4',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 22,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>➕</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
                      Deploying: {newRouterName || `Branch Router ${nextRouterNumber}`}
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: isRouterConfigFinished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isRouterConfigFinished ? '#34D399' : '#FBBF24',
                      border: isRouterConfigFinished ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    }}>
                      {isRouterConfigFinished ? '🟢 Config Complete' : '🟡 In Progress (Pending Key)'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94A3B8' }}>
                    Assigned VPN IP: <code style={{ color: '#38BDF8', fontWeight: 700 }}>{newRouterVpnIp}</code> •
                    VPS Forwarding Port: <code style={{ color: '#F59E0B', fontWeight: 700 }}>{newRouterVpsPort}</code> •
                    API User: <code style={{ color: '#34D399', fontWeight: 700 }}>api-user</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewRouterName(`Branch Router ${nextRouterNumber}`);
                  setNewRouterVpnIp(defaultNextVpnIp);
                  setNewRouterVpsPort(defaultNextVpsPort);
                  generateRandomPassword();
                }}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#94A3B8',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🔄 Reset Defaults
              </button>
            </div>
          </div>

          {/* ── Interactive Synchronizer & Configurator Form ── */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 14,
            padding: '22px 24px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <strong style={{ fontSize: 15, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚡ New Router Dynamic Synchronizer
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94A3B8' }}>
                  Fill in or customize the router details below. <strong style={{ color: '#38BDF8' }}>All scripts across Phase 1, Phase 2 (VPS), Phase 3, Phase 4, and Phase 5 will automatically update and synchronize in real time!</strong>
                </p>
              </div>
            </div>

            {/* ── Saved Presets & Dropdown Bar ── */}
            <div style={{
              background: '#0B0F19',
              border: '1px solid #1E293B',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                <span style={{ fontSize: 14 }}>📁</span>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap' }}>
                  Saved Router Presets:
                </label>
                <select
                  value={activePresetId}
                  onChange={e => handleSelectPreset(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#38BDF8',
                    padding: '6px 10px',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="custom">✨ Active Configuration (Current Draft)</option>
                  {savedPresets.map(p => (
                    <option key={p.id} value={p.id}>
                      📌 {p.name} — Port {p.vpsPort} (IP: {p.vpnIp})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSaveAsPreset}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    borderRadius: 6,
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Save current router configuration so it appears in Locations & Fleet dropdown"
                >
                  💾 Save as Preset
                </button>
                {activePresetId !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(activePresetId)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #7F1D1D',
                      borderRadius: 6,
                      color: '#F87171',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Delete this saved preset"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {presetFeedback && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 8,
                padding: '8px 14px',
                marginBottom: 14,
                fontSize: 12.5,
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>✓</span> {presetFeedback}
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              marginBottom: 16,
            }}>
              {/* Field 1: Router Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  1. Router Name / Branch
                </label>
                <input
                  type="text"
                  value={newRouterName}
                  onChange={e => setNewRouterName(e.target.value)}
                  placeholder="e.g. Branch Router 3"
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#F8FAFC',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  Identifier used on VPS and in your Locations & Fleet list.
                </span>
              </div>

              {/* Field 2: WireGuard VPN IP */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  2. WireGuard Tunnel IP
                </label>
                <input
                  type="text"
                  value={newRouterVpnIp}
                  onChange={e => setNewRouterVpnIp(e.target.value)}
                  placeholder="10.10.10.4"
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#38BDF8',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  Private IP inside WireGuard subnet (Router 1 = .2, Router 2 = .3, Router 3 = .4).
                </span>
              </div>

              {/* Field 3: VPS Port Forward */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  3. VPS Forwarding Port (External)
                </label>
                <input
                  type="text"
                  value={newRouterVpsPort}
                  onChange={e => setNewRouterVpsPort(e.target.value)}
                  placeholder="8731"
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#F59E0B',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  Sequential external port (Router 2 = 8730, Router 3 = 8731, Router 4 = 8732).
                </span>
              </div>

              {/* Field 4: REST API User Password */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1' }}>
                    4. REST API Password (api-user)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    🎲 Generate
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type={showApiPassword ? 'text' : 'password'}
                    value={apiPassword}
                    onChange={e => setApiPassword(e.target.value)}
                    placeholder="Enter password..."
                    style={{
                      flex: 1,
                      background: '#030712',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '9px 12px',
                      color: '#34D399',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiPassword(!showApiPassword)}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#94A3B8',
                      padding: '9px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    title={showApiPassword ? 'Hide password' : 'Show password'}
                  >
                    {showApiPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  Baked directly into the Master 1-Shot Config & Locations registration.
                </span>
              </div>
            </div>

            {/* Field 5 & 6: Public Keys */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
              background: '#0B0F19',
              border: '1px solid #1E293B',
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#A78BFA', marginBottom: 4 }}>
                  🔑 Router WireGuard Public Key (Generated in Phase 1)
                </label>
                <input
                  type="text"
                  value={newRouterPublicKey}
                  onChange={e => setNewRouterPublicKey(e.target.value)}
                  placeholder="Paste router public key here from Phase 1..."
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#A78BFA',
                    fontSize: 12.5,
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Paste from WinBox Terminal in Phase 1 → Phase 2 VPS script will instantly update!
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>
                  🌐 VPS WireGuard Public Key (Optional)
                </label>
                <input
                  type="text"
                  value={vpsPublicKey}
                  onChange={e => setVpsPublicKey(e.target.value)}
                  placeholder="Leave blank or paste VPS public key..."
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#94A3B8',
                    fontSize: 12.5,
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                  If blank, placeholder is shown. Found on VPS in /etc/wireguard/server_public.key.
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE 1: MIKROTIK - CREATE WIREGUARD INTERFACE         */}
          {/* ═══════════════════════════════════════════════════════ */}
          <CollapsibleSection
            title="Phase 1: Create WireGuard on Router (WinBox Terminal)"
            icon="📡"
            subtitle="Run on the NEW MikroTik router to generate its unique WireGuard key"
            color="#C084FC"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>Open <strong>WinBox</strong> and connect to the new router (via MAC address or <code>192.168.88.1</code>).</li>
                <li>Click <strong>&quot;New Terminal&quot;</strong> in the left sidebar menu.</li>
                <li>Copy and paste the command block below into the terminal and press <strong>Enter</strong>:</li>
              </ol>
            </div>

            <CopyBlock
              label="📡 MikroTik — Create wg-vps & Output Public Key"
              language="RouterOS Script"
              code={addRouterPhase1Script}
            />

            <GitbookCallout type="tip" title="Copy Public Key to Generator Above">
              In your WinBox terminal, copy the <code>public-key</code> value that was printed (e.g. <code>p/Xz...=</code>).
              Paste it into the <strong>&quot;Router WireGuard Public Key&quot;</strong> box in the form above.
              <strong> Phase 2 below will instantly update with your router&apos;s real public key!</strong>
            </GitbookCallout>
          </CollapsibleSection>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE 2: VPS - 1-SHOT ZERO-DOWNTIME REGISTRATION      */}
          {/* ═══════════════════════════════════════════════════════ */}
          <CollapsibleSection
            title="Phase 2: Register on Hostinger VPS (1-Shot SSH Bash Script)"
            icon="🖥️"
            subtitle="Zero downtime — authorizes peer live without restarting WireGuard or dropping other routers"
            color="#34A853"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>
                  Open your computer terminal (PowerShell, Terminal, or PuTTY) and SSH into your VPS:
                  <div style={{ margin: '6px 0' }}>
                    <code style={{ color: '#4ADE80', background: '#030712', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                      ssh root@187.7.22.89
                    </code>
                  </div>
                </li>
                <li>
                  Click the <strong>📋 Copy</strong> button below to copy the 1-Shot automated setup script.
                </li>
                <li>
                  Right-click in your VPS SSH terminal to paste and press <strong>Enter</strong>.
                </li>
              </ol>
            </div>

            <CopyBlock
              label={`🖥️ VPS 1-Shot Script — Add ${newRouterName || 'New Router'} (Port ${newRouterVpsPort})`}
              language="bash"
              code={addRouterVpsScript}
            />

            <GitbookCallout type="success" title="Zero Downtime Guaranteed">
              This 1-shot script uses <code>wg set wg0 peer</code> to authorize the new router <strong>live</strong>. It does <strong>NOT restart WireGuard</strong>, so existing online routers (like African Network Wi-Fi on port 8730) will experience <strong>zero downtime</strong>!
            </GitbookCallout>
          </CollapsibleSection>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE 3: MIKROTIK - CONNECT TO VPS & TEST PING         */}
          {/* ═══════════════════════════════════════════════════════ */}
          <CollapsibleSection
            title="Phase 3: Connect to VPS & Verify Tunnel (WinBox Terminal)"
            icon="🔌"
            subtitle="Assigns VPN IP and initiates the outbound handshake to the VPS Hub"
            color="#60A5FA"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>Go back to <strong>WinBox → New Terminal</strong> on the new router.</li>
                <li>Click <strong>📋 Copy</strong> on the script below, paste into the terminal, and press <strong>Enter</strong>:</li>
              </ol>
            </div>

            <CopyBlock
              label={`📡 MikroTik — Connect to VPS Hub & Ping Test (${newRouterVpnIp})`}
              language="RouterOS Script"
              code={addRouterPhase3Script}
            />

            <GitbookCallout type="info" title="Tunnel Verification">
              Look at the ping output in WinBox. If you see replies from <code>10.10.10.1</code> (0% packet loss), your WireGuard tunnel is <strong>100% active and connected</strong> to your Hostinger VPS!
            </GitbookCallout>
          </CollapsibleSection>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE 4: MIKROTIK - MASTER 1-SHOT CONFIG               */}
          {/* ═══════════════════════════════════════════════════════ */}
          <CollapsibleSection
            title="Phase 4: Run Master 1-Shot Config (WinBox Terminal)"
            icon="⚡"
            subtitle="Configures REST API, SSL cert, direct NTP, Cloud DDNS, and auto-recovery watchdog in 1 paste"
            color="#F59E0B"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <div style={{
                background: '#0F1E36',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <span style={{ fontSize: 13, color: '#E2E8F0' }}>
                  The script below has your API password pre-configured as <code style={{ color: '#34D399', fontWeight: 700 }}>{apiPassword}</code>. No manual file editing required!
                </span>
              </div>

              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>Still in <strong>WinBox → New Terminal</strong> on the new router.</li>
                <li>Click <strong>📋 Copy</strong> below, paste into the terminal, and press <strong>Enter</strong>:</li>
              </ol>
            </div>

            <CopyBlock
              label={`⚡ Master 1-Shot Config for ${newRouterName || 'New Router'} (api-user configured)`}
              language="RouterOS Script"
              code={masterConfigScript}
            />

            <GitbookCallout type="tip" title="What this script just configured">
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>✅ <strong>REST API & SSL:</strong> Active on HTTPS port 443 with user <code>api-user</code></li>
                <li>✅ <strong>Cloud DDNS & NTP:</strong> Direct IPs (<code>216.239.35.0</code>) ensure instant time sync on boot</li>
                <li>✅ <strong>WireGuard Keepalive:</strong> 25-second keepalive prevents ISP NAT timeouts</li>
                <li>✅ <strong>Power-Cut Watchdog:</strong> Reconnects router in 30-60 seconds after power outages</li>
              </ul>
            </GitbookCallout>
          </CollapsibleSection>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE 5: ADMIN DASHBOARD - REGISTER IN FLEET          */}
          {/* ═══════════════════════════════════════════════════════ */}
          <CollapsibleSection
            title="Phase 5: Register in Admin Dashboard (Locations & Fleet)"
            icon="🌐"
            subtitle="Add the router to the fleet in your admin dashboard"
            color="#38BDF8"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#E2E8F0', lineHeight: 1.6 }}>
                Open <strong>Locations & Fleet</strong> from the left sidebar and click <strong>➕ Add Location / Router</strong>. Enter these exact values:
              </p>

              {/* Exact Credentials Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}>
                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Location / Router Name</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginTop: 4 }}>
                    {newRouterName || `Branch Router ${nextRouterNumber}`}
                  </div>
                </div>

                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Host / IP Address</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', marginTop: 4, fontFamily: 'monospace' }}>
                    187.7.22.89
                  </div>
                </div>

                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Port</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginTop: 4, fontFamily: 'monospace' }}>
                    {newRouterVpsPort}
                  </div>
                </div>

                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Username</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginTop: 4, fontFamily: 'monospace' }}>
                    api-user
                  </div>
                </div>

                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(apiPassword);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#34D399',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399', marginTop: 4, fontFamily: 'monospace' }}>
                    {apiPassword}
                  </div>
                </div>

                <div style={{ background: '#030712', border: '1px solid #1E293B', borderRadius: 8, padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>SSL & Mode</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', marginTop: 4 }}>
                    Use SSL: Yes • Mode: Direct REST
                  </div>
                </div>
              </div>

              {/* Quick Jump Action Button */}
              <div style={{
                marginBottom: 18,
                padding: '14px 18px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🚀 1-Click Fast Register in Locations &amp; Fleet
                  </strong>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94A3B8' }}>
                    Saves this router profile and opens the Locations &amp; Fleet registration modal with all fields automatically filled in!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isRouterConfigFinished) {
                      const proceed = confirm(
                        '⚠️ Note: You have not pasted the Router Public Key in Phase 1 yet.\n\nDo you want to proceed to Locations & Fleet anyway?'
                      );
                      if (!proceed) return;
                    }
                    const preset = {
                      id: 'deploy_' + Date.now(),
                      name: newRouterName || `Branch Router ${nextRouterNumber}`,
                      vpnIp: newRouterVpnIp,
                      vpsPort: newRouterVpsPort,
                      password: apiPassword,
                      routerPublicKey: newRouterPublicKey,
                      vpsPublicKey: vpsPublicKey,
                      isCompleted: true, // User explicitly finished and confirmed
                    };
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('an_selected_import_router', JSON.stringify(preset));
                      localStorage.setItem('an_auto_open_add_router', 'true');
                    }
                    if (onNavigateTab) {
                      onNavigateTab('locations');
                    } else {
                      alert('Router profile saved! Open Locations & Fleet in the left sidebar to add.');
                    }
                  }}
                  style={{
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: 8,
                    color: '#FFFFFF',
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  🚀 Auto-Fill &amp; Open Locations &amp; Fleet
                </button>
              </div>

              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#E2E8F0', lineHeight: 2 }}>
                <li>Click <strong>&quot;Test Connection&quot;</strong> — the status badge will immediately turn green: <strong style={{ color: '#4ADE80' }}>● Connected (RouterOS v7.x)</strong> with model, CPU load, and uptime!</li>
                <li>Click <strong>&quot;Save Router&quot;</strong>.</li>
                <li>That&apos;s it! The router is now in your fleet and can be managed independently for login pages, vouchers, and plans.</li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* ── Completion Checklist ── */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #065F46',
            borderRadius: 14,
            padding: '20px 24px',
            marginTop: 10,
          }}>
            <strong style={{ color: '#4ADE80', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span>✅</span> Router Deployment Verification Checklist
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {[
                `WireGuard interface wg-vps created on router`,
                `Router public key pasted into form above`,
                `VPS 1-shot script executed via SSH (port ${newRouterVpsPort})`,
                `Ping to VPS Hub 10.10.10.1 succeeded (0% loss)`,
                `Master 1-shot config applied with password: ${apiPassword}`,
                `Registered in Locations & Fleet (${newRouterName || 'New Router'})`,
                `Test Connection showed green ● Connected badge`,
                `Power-cut recovery watchdog verified in WinBox scheduler`,
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#E2E8F0',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: 14, color: '#4ADE80' }}>☑</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

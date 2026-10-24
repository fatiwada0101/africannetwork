'use client';

import { useState, useCallback } from 'react';

// ─── Reusable copy-to-clipboard button ───────────────────────────
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
    <div style={{ position: 'relative', marginBottom: 14 }}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#D4D4D8', display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: '#71717A', fontFamily: 'monospace' }}>{language}</span>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            background: '#0D0D12',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            padding: '14px 16px',
            paddingRight: 70,
            fontSize: 11.5,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            color: '#A7F3D0',
            lineHeight: 1.55,
            overflowX: 'auto',
            maxHeight: 400,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {code}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: copied
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            color: copied ? '#000' : '#D4D4D8',
            fontSize: 11,
            fontWeight: 700,
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  );
}

// ─── Step number badge ───────────────────────────────────────────
function StepBadge({ number, color = '#F59E0B' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 30, borderRadius: '50%',
      background: `${color}22`, color: color,
      fontSize: 14, fontWeight: 900, flexShrink: 0,
      border: `2px solid ${color}55`,
    }}>
      {number}
    </span>
  );
}

// ─── Collapsible section ─────────────────────────────────────────
function CollapsibleSection({ title, icon, subtitle, color = '#F59E0B', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="sa-glass-card"
      style={{
        marginBottom: 20,
        border: `1.5px solid ${color}44`,
        background: `linear-gradient(135deg, ${color}08 0%, rgba(20, 20, 28, 0.8) 100%)`,
      }}
    >
      <div
        className="sa-card-header"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <div>
            <h3 className="sa-card-title" style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            {subtitle && <p className="sa-card-sub" style={{ marginTop: 4 }}>{subtitle}</p>}
          </div>
        </div>
        <span style={{
          fontSize: 18, color: '#888',
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>
          ▼
        </span>
      </div>
      {open && (
        <div style={{ padding: '0 4px 8px', animation: 'fadeIn 0.2s ease' }}>
          {children}
        </div>
      )}
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
}) {
  const [activeGuide, setActiveGuide] = useState('overview');

  const activeRouter = routersList.find(r => r.id === selectedRouterId) || routersList[0] || null;
  const activeSecret = activeRouter?.polling_secret || 'YOUR_ROUTER_SECRET';
  const activeRouterName = activeRouter?.name || 'African Network Router';
  const appHostname = typeof window !== 'undefined' ? window.location.host : 'africannetwork.net';
  const appProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const nextRouterNumber = routersList.length + 1;
  const nextVpnIp = `10.10.10.${nextRouterNumber + 1}`;
  const nextVpsPort = 8443 + ((nextRouterNumber - 1) * 287);

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
:do { /user add name=api-user group=full password="YOUR_STRONG_PASSWORD_HERE" } on-error={
  :log info "User 'api-user' already exists — skipping"
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
  // ADD NEW ROUTER SCRIPTS
  // ═══════════════════════════════════════════════════════
  const addRouterVpsScript = `# ═══════════════════════════════════════════════════════
# Add Router ${nextRouterNumber} to VPS WireGuard
# Run on VPS via SSH
# ═══════════════════════════════════════════════════════

# 1. Stop WireGuard temporarily
systemctl stop wg-quick@wg0

# 2. Add the new peer to /etc/wireguard/wg0.conf
# Add this block at the end of the file:
cat >> /etc/wireguard/wg0.conf << 'EOF'

[Peer]
# Router ${nextRouterNumber}
PublicKey = <NEW_ROUTER_PUBLIC_KEY>
AllowedIPs = ${nextVpnIp}/32
EOF

# 3. Add port forwarding rules to the [Interface] section
# Add these PostUp lines BEFORE the MASQUERADE line:
#   PostUp = iptables -t nat -A PREROUTING -p tcp --dport ${nextVpsPort} -j DNAT --to-destination ${nextVpnIp}:443
#   PostUp = iptables -A FORWARD -p tcp -d ${nextVpnIp} --dport 443 -j ACCEPT
#
# And these PostDown lines:
#   PostDown = iptables -t nat -D PREROUTING -p tcp --dport ${nextVpsPort} -j DNAT --to-destination ${nextVpnIp}:443
#   PostDown = iptables -D FORWARD -p tcp -d ${nextVpnIp} --dport 443 -j ACCEPT

# 4. Open the new port in UFW firewall
ufw allow ${nextVpsPort}/tcp

# 5. Restart WireGuard
systemctl start wg-quick@wg0

# 6. Verify the new peer
wg show`;

  const addRouterMikrotikScript = `# ═══════════════════════════════════════════════════════
# New Router ${nextRouterNumber} — WireGuard Client Setup
# Run on the NEW MikroTik Router via WinBox → Terminal
# ═══════════════════════════════════════════════════════

# 1. Create WireGuard interface
/interface wireguard add name=wg-vps listen-port=0 mtu=1420

# 2. Get this router's public key (COPY THIS for VPS config)
/interface wireguard print where name=wg-vps

# 3. Add VPS as peer
/interface wireguard peers add \\
  interface=wg-vps \\
  public-key="<VPS_PUBLIC_KEY>" \\
  endpoint-address="187.7.22.89" \\
  endpoint-port=51820 \\
  allowed-address=10.10.10.0/24 \\
  persistent-keepalive=25s

# 4. Assign VPN IP address
/ip address add address=${nextVpnIp}/24 interface=wg-vps

# 5. Verify tunnel is up
/ping 10.10.10.1 count=3

:put ""
:put "If ping succeeds, the tunnel is UP!"
:put "VPN IP: ${nextVpnIp}"
:put "VPS Port: ${nextVpsPort}"
:put ""
:put "Next: Run the Master 1-Shot Config script to complete setup."`;

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
  /user add name=api-user group=full password="YOUR_PASSWORD_HERE"
} on-error={
  :log info "User api-user already exists"
}

# 5. Test — from any browser or curl:
#    https://<ROUTER_IP>:443/rest/system/resource
#    Login: api-user / YOUR_PASSWORD_HERE

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

      {/* ── Header Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(168, 85, 247, 0.08), rgba(245, 158, 11, 0.06))',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 16,
          padding: '22px 26px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <span style={{ fontSize: 32 }}>📚</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>
              Setup & Deployment Guide
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#A1A1AA' }}>
              Complete documentation for deploying MikroTik routers with the African Network platform.
              Step-by-step instructions with copy-paste scripts.
            </p>
          </div>
        </div>

        {/* Guide navigation pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {guides.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGuide(g.id)}
              style={{
                background: activeGuide === g.id
                  ? `${g.color}20`
                  : 'rgba(255, 255, 255, 0.04)',
                border: `1.5px solid ${activeGuide === g.id ? `${g.color}55` : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 12.5,
                fontWeight: activeGuide === g.id ? 800 : 600,
                color: activeGuide === g.id ? g.color : '#A1A1AA',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {g.label}
            </button>
          ))}
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
                fontSize: 12.5, color: '#D4D4D8',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>VPS Public Port</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Forwards To</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#60A5FA', fontWeight: 800 }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {routersList.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                    background: `${card.color}08`,
                    border: `1px solid ${card.color}33`,
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
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
                    {card.desc}
                  </p>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#D4D4D8', fontWeight: 600 }}>
                    → {card.action}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Timing comparison */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
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
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <strong style={{ color: '#FCA5A5', fontSize: 12 }}>❌ Without Watchdog</strong>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444', margin: '6px 0 4px' }}>1–3 hours</div>
                <p style={{ margin: 0, fontSize: 11, color: '#A1A1AA', lineHeight: 1.4 }}>
                  Router boots with 1970 clock → WireGuard rejects handshakes → Waits for slow NTP/DNS → Eventually syncs
                </p>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <strong style={{ color: '#86EFAC', fontSize: 12 }}>✅ With Watchdog</strong>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', margin: '6px 0 4px' }}>30–60 sec</div>
                <p style={{ margin: 0, fontSize: 11, color: '#A1A1AA', lineHeight: 1.4 }}>
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
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 14,
            padding: '18px 22px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <div>
                <strong style={{ fontSize: 15, color: '#F59E0B' }}>Master 1-Shot Configuration</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A1A1AA' }}>
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
                  color: '#D4D4D8',
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
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 2 }}>
                <li><strong>WinBox</strong> installed on your computer (<a href="https://mikrotik.com/download" target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA' }}>Download from MikroTik</a>)</li>
                <li><strong>Connect to router</strong> via WinBox (MAC or IP address)</li>
                <li><strong>WireGuard tunnel</strong> already set up between router and VPS (see <span onClick={() => setActiveGuide('add-router')} style={{ color: '#06B6D4', cursor: 'pointer', textDecoration: 'underline' }}>Add New Router</span> guide if not)</li>
                <li>Change <code style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>YOUR_STRONG_PASSWORD_HERE</code> in the script to your actual API password</li>
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
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.5 }}>
                    Launch WinBox → Click on your router&apos;s MAC address → Login as admin
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={2} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Open Terminal</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.5 }}>
                    In WinBox, click <strong>&quot;New Terminal&quot;</strong> in the left menu to open the RouterOS command line
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={3} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Copy & Paste the Script</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.5 }}>
                    Click the &quot;📋 Copy&quot; button below → Right-click in the WinBox terminal → Paste
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <StepBadge number={4} />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Register in Admin Dashboard</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.5 }}>
                    Go to <strong>Locations & Fleet</strong> tab → Add the router with its VPS IP (187.7.22.89), port, and API credentials
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* The actual script */}
          <CopyBlock
            label="⚡ Master 1-Shot Config — Copy & Paste into WinBox Terminal"
            language="RouterOS Script"
            code={masterConfigScript}
          />

          {/* Important notes */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 12,
            padding: '14px 18px',
            marginTop: 8,
          }}>
            <strong style={{ color: '#FCA5A5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span> Important Reminders
            </strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#A1A1AA', lineHeight: 1.6 }}>
              <li>Change <code style={{ color: '#F59E0B' }}>YOUR_STRONG_PASSWORD_HERE</code> to a real strong password</li>
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
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: '#71717A', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: '#D4D4D8', fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
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
            <p style={{ fontSize: 11.5, color: '#A1A1AA', margin: '4px 8px', lineHeight: 1.5 }}>
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
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA' }}>
                    <code style={{ color: '#4ADE80' }}>ssh root@187.7.22.89</code>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <StepBadge number={2} color="#34A853" />
                <div>
                  <strong style={{ fontSize: 14, color: '#FFFFFF' }}>Write the wg0.conf file</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA' }}>
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
                fontSize: 12.5, color: '#D4D4D8',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
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
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
            <div style={{ padding: '0 8px', fontSize: 13, color: '#A1A1AA', lineHeight: 1.6 }}>
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
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#A1A1AA' }}>
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
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>🕒 Clock Reset (1970)</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
                    MikroTik hAP ax² has no battery RTC. Power loss resets clock to Jan 1, 1970.
                  </p>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>🔒 WireGuard Rejection</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
                    WireGuard drops handshakes as &quot;replay attacks&quot; because the timestamp is decades in the past.
                  </p>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <strong style={{ color: '#FCA5A5', fontSize: 12 }}>⏳ Slow NTP Recovery</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
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
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 2 }}>
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
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(139, 92, 246, 0.06))',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            borderRadius: 14,
            padding: '18px 22px',
            marginBottom: 20,
          }}>
            <strong style={{ color: '#A78BFA', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>🔧</span> When to Use This Script
            </strong>
            <p style={{ margin: 0, fontSize: 13, color: '#D4D4D8', lineHeight: 1.6 }}>
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
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <strong style={{ color: '#FCA5A5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⛔ Without Script
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
                  Power cut → clock resets to 1970 → WireGuard rejects handshakes → <strong style={{ color: '#EF4444' }}>1 to 3 hours</strong> to recover
                </p>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <strong style={{ color: '#86EFAC', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✅ With Script
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.4 }}>
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
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#D4D4D8', lineHeight: 2 }}>
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
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 2.2 }}>
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
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 14,
            padding: '16px 20px',
            marginTop: 8,
          }}>
            <strong style={{ color: '#FBBF24', fontSize: 12 }}>💡 Already Installed?</strong>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
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
          <div style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 14,
            padding: '18px 22px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>➕</span>
              <div>
                <strong style={{ fontSize: 15, color: '#06B6D4' }}>Adding Router #{nextRouterNumber} to the Fleet</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A1A1AA' }}>
                  Suggested VPN IP: <code style={{ color: '#4ADE80' }}>{nextVpnIp}</code> •
                  VPS Port: <code style={{ color: '#F59E0B' }}>{nextVpsPort}</code>
                </p>
              </div>
            </div>
          </div>

          {/* Phase 1: VPS Side */}
          <CollapsibleSection
            title="Phase 1: VPS Side (SSH into VPS)"
            icon="🖥️"
            subtitle="Add the new router's WireGuard peer and port forwarding on the VPS"
            color="#34A853"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 1.8 }}>
                <li>SSH into VPS: <code style={{ color: '#4ADE80' }}>ssh root@187.7.22.89</code></li>
                <li>Edit <code>/etc/wireguard/wg0.conf</code> — add new peer + port forward rules</li>
                <li>Open new port in UFW: <code style={{ color: '#4ADE80' }}>ufw allow {nextVpsPort}/tcp</code></li>
                <li>Restart WireGuard: <code style={{ color: '#4ADE80' }}>systemctl restart wg-quick@wg0</code></li>
              </ol>
            </div>

            <CopyBlock
              label={`🖥️ VPS Commands — Add Router #${nextRouterNumber}`}
              language="bash"
              code={addRouterVpsScript}
            />
          </CollapsibleSection>

          {/* Phase 2: Router Side */}
          <CollapsibleSection
            title="Phase 2: MikroTik Router Side (WinBox Terminal)"
            icon="📡"
            subtitle="Configure WireGuard client on the new router"
            color="#C084FC"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 1.8 }}>
                <li>Connect to new router via WinBox</li>
                <li>Open Terminal → paste the WireGuard client setup script</li>
                <li>Copy the router&apos;s public key and add it to VPS wg0.conf (Phase 1)</li>
                <li>Verify tunnel with <code style={{ color: '#4ADE80' }}>/ping 10.10.10.1</code></li>
              </ol>
            </div>

            <CopyBlock
              label={`📡 MikroTik Script — WireGuard Client for Router #${nextRouterNumber}`}
              language="RouterOS Script"
              code={addRouterMikrotikScript}
            />
          </CollapsibleSection>

          {/* Phase 3: Master config */}
          <CollapsibleSection
            title="Phase 3: Run Master Config (WinBox Terminal)"
            icon="⚡"
            subtitle="Apply the master 1-shot config for REST API + watchdog"
            color="#F59E0B"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px', marginBottom: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 1.8 }}>
                <li>Still in WinBox Terminal on the new router</li>
                <li>Go to <span onClick={() => setActiveGuide('master-config')} style={{ color: '#F59E0B', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}>⚡ Master 1-Shot Config</span> and copy the script</li>
                <li>Paste into the terminal — this sets up REST API, NTP, Cloud DDNS, and the watchdog</li>
                <li>Change the API password in the script before pasting!</li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* Phase 4: Admin Dashboard */}
          <CollapsibleSection
            title="Phase 4: Register in Admin Dashboard"
            icon="🌐"
            subtitle="Add the router to the fleet in the admin panel"
            color="#60A5FA"
            defaultOpen={true}
          >
            <div style={{ padding: '0 8px' }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#D4D4D8', lineHeight: 1.8 }}>
                <li>Go to <strong>Locations & Fleet</strong> tab in the admin dashboard</li>
                <li>Click <strong>&quot;Add Location&quot;</strong></li>
                <li>
                  Fill in router details:
                  <ul style={{ paddingLeft: 18, marginTop: 4, lineHeight: 1.8 }}>
                    <li>Name: <code style={{ color: '#60A5FA' }}>Your Location Name</code></li>
                    <li>IP: <code style={{ color: '#60A5FA' }}>187.7.22.89</code> (VPS public IP)</li>
                    <li>Port: <code style={{ color: '#F59E0B' }}>{nextVpsPort}</code></li>
                    <li>Username: <code style={{ color: '#60A5FA' }}>api-user</code></li>
                    <li>Password: <code style={{ color: '#60A5FA' }}>the password you set in the master config</code></li>
                  </ul>
                </li>
                <li>Click <strong>&quot;Test Connection&quot;</strong> — should show green ● Connected</li>
                <li>Click <strong>&quot;Save Router&quot;</strong></li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* Checklist */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 14,
            padding: '18px 22px',
            marginTop: 8,
          }}>
            <strong style={{ color: '#4ADE80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span>✅</span> New Router Checklist
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
              {[
                'WireGuard peer added on VPS wg0.conf',
                'Port forwarding rule added (iptables)',
                'UFW port opened',
                'WireGuard client configured on router',
                'Tunnel verified (ping 10.10.10.1)',
                'Master 1-shot config applied',
                'API password changed from default',
                'Router registered in Locations & Fleet',
                'Test Connection shows green ● Connected',
                'Power-cut watchdog verified (check scheduler)',
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#D4D4D8',
                }}>
                  <span style={{ fontSize: 14, color: '#4ADE80' }}>☐</span>
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

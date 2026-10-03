import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const applyAutoTable = autoTable.default || autoTable;

// Colors
const PRIMARY_GREEN = [52, 168, 83];    // #34A853
const SECONDARY_DARK = [18, 18, 23];    // #121217
const ACCENT_PURPLE = [124, 58, 237];   // #7C3AED
const BG_LIGHT = [248, 249, 250];
const TEXT_MUTED = [120, 120, 130];
const CODE_BG = [26, 26, 36];
const CODE_TEXT = [220, 220, 230];

let pageNum = 1;

function drawHeaderFooter(d, title) {
  const totalWidth = 210;
  const totalHeight = 297;

  // Header line
  d.setDrawColor(...PRIMARY_GREEN);
  d.setLineWidth(0.8);
  d.line(14, 12, totalWidth - 14, 12);

  d.setFont('helvetica', 'bold');
  d.setFontSize(8);
  d.setTextColor(...PRIMARY_GREEN);
  d.text('AFRICAN NETWORK WI-FI PLATFORM', 14, 9);

  d.setFont('helvetica', 'normal');
  d.setTextColor(...TEXT_MUTED);
  d.text(title, totalWidth - 14, 9, { align: 'right' });

  // Footer line
  d.setDrawColor(220, 220, 225);
  d.setLineWidth(0.4);
  d.line(14, totalHeight - 12, totalWidth - 14, totalHeight - 12);

  d.setFontSize(8);
  d.setTextColor(...TEXT_MUTED);
  d.text('Hostinger VPS Multi-MikroTik Integration Guide', 14, totalHeight - 7);
  d.text(`Page ${pageNum}`, totalWidth - 14, totalHeight - 7, { align: 'right' });
}

function addCodeBlock(d, y, lines, caption = '') {
  const margin = 14;
  const width = 182;
  const lineHeight = 4.2;
  const boxHeight = (lines.length * lineHeight) + (caption ? 10 : 6);

  // Check page overflow
  if (y + boxHeight > 275) {
    d.addPage();
    pageNum++;
    drawHeaderFooter(d, 'Code Reference');
    y = 20;
  }

  // Draw background box
  d.setFillColor(...CODE_BG);
  d.roundedRect(margin, y, width, boxHeight, 2, 2, 'F');

  // Caption header
  let textY = y + 4;
  if (caption) {
    d.setFont('helvetica', 'bold');
    d.setFontSize(7.5);
    d.setTextColor(...PRIMARY_GREEN);
    d.text(caption.toUpperCase(), margin + 4, textY);
    d.setDrawColor(60, 60, 75);
    d.setLineWidth(0.3);
    d.line(margin + 4, textY + 2, margin + width - 4, textY + 2);
    textY += 6;
  }

  d.setFont('courier', 'normal');
  d.setFontSize(7.5);
  d.setTextColor(...CODE_TEXT);

  for (const line of lines) {
    d.text(line, margin + 4, textY);
    textY += lineHeight;
  }

  return y + boxHeight + 6;
}

// ==========================================
// PAGE 1: TITLE & ARCHITECTURE
// ==========================================
drawHeaderFooter(doc, 'Architecture & Overview');

let curY = 22;

// Main Document Title Banner
doc.setFillColor(...SECONDARY_DARK);
doc.roundedRect(14, curY, 182, 32, 3, 3, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...PRIMARY_GREEN);
doc.text('Connecting Multiple MikroTik Routers', 20, curY + 12);

doc.setFontSize(11);
doc.setTextColor(255, 255, 255);
doc.text('Via 1 Central Hostinger VPS (Bypassing CGNAT & Private IPs)', 20, curY + 20);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(180, 180, 195);
doc.text('Production Operations & Network Engineering Manual • African Network', 20, curY + 27);

curY += 40;

// Section 1: The Problem
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('1. The Challenge (CGNAT & Private IPs)', 14, curY);
curY += 6;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(50, 50, 60);
const p1 = doc.splitTextToSize(
  'When deploying MikroTik routers on client sites, cellular networks (MTN, Airtel, Glo), Starlink, or local fiber ISPs use Carrier-Grade NAT (CGNAT). The router gets a private WAN IP (e.g. 100.64.x.x or 10.x.x.x). Cloud servers (like Vercel) CANNOT initiate incoming connections to private IPs. Furthermore, MikroTik IP Cloud DDNS fails behind CGNAT because the public IP is shared and inbound ports are blocked by the ISP.',
  182
);
doc.text(p1, 14, curY);
curY += p1.length * 4.4 + 4;

// Section 2: The Solution
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('2. The Solution: 1 Single Hostinger VPS Hub', 14, curY);
curY += 6;

const p2 = doc.splitTextToSize(
  'A single Hostinger Ubuntu VPS with a static public IP acts as a secure WireGuard VPN and port-forwarding hub. Each MikroTik router dials OUT to the VPS on UDP port 51820. Because the connection is outbound, CGNAT and ISP firewalls never block it. The VPS assigns a private tunnel IP (10.100.0.X) to each router and forwards a unique external port (8443, 8444, 8445...) to that router\'s REST API (port 443).',
  182
);
doc.text(p2, 14, curY);
curY += p2.length * 4.4 + 4;

// Architecture Mapping Table
applyAutoTable(doc, {
  startY: curY,
  head: [['Router Name', 'Location', 'WireGuard IP', 'VPS Public Port', 'Router Port', 'Status']],
  body: [
    ['Router 1 (Main Gateway)', 'Kano Branch', '10.100.0.2', '8443', '443 (SSL)', 'Primary Hub'],
    ['Router 2 (Campus Wi-Fi)', 'Abuja Site', '10.100.0.3', '8444', '443 (SSL)', 'Direct REST'],
    ['Router 3 (Hotel / Café)', 'Lagos Site', '10.100.0.4', '8445', '443 (SSL)', 'Direct REST'],
    ['Router N (Any Location)', 'Site N', '10.100.0.N', '8440 + N', '443 (SSL)', 'Unlimited'],
  ],
  headStyles: { fillColor: PRIMARY_GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 8, textColor: [30, 30, 40] },
  alternateRowStyles: { fillColor: [245, 248, 245] },
  margin: { left: 14, right: 14 },
});

curY = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'italic');
doc.setFontSize(8);
doc.setTextColor(...TEXT_MUTED);
doc.text('Capacity: A single $5/mo Hostinger VPS (2GB RAM, 1 vCPU) can easily manage 50+ MikroTik routers.', 14, curY);

// ==========================================
// PAGE 2: VPS SETUP & MIKROTIK COMMANDS
// ==========================================
doc.addPage();
pageNum++;
drawHeaderFooter(doc, 'VPS & Router Configuration');

curY = 22;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('3. Step 1: Initial Hostinger VPS Setup (Run Once)', 14, curY);
curY += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(60, 60, 70);
doc.text('SSH into your Hostinger VPS as root and execute this automated setup script:', 14, curY);
curY += 5;

curY = addCodeBlock(doc, curY, [
  '# 1. Update and install WireGuard & firewall tools',
  'apt-get update && apt-get install -y wireguard iptables-persistent ufw',
  '',
  '# 2. Enable kernel IPv4 forwarding',
  'sysctl -w net.ipv4.ip_forward=1',
  'sed -i "s/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/" /etc/sysctl.conf',
  '',
  '# 3. Generate Server Keypair in /etc/wireguard',
  'mkdir -p /etc/wireguard && cd /etc/wireguard && umask 077',
  'wg genkey | tee server_private.key | wg pubkey > server_public.key',
  '',
  '# 4. Create WireGuard Server Config (/etc/wireguard/wg0.conf)',
  'cat <<EOF > /etc/wireguard/wg0.conf',
  '[Interface]',
  'Address = 10.100.0.1/24',
  'ListenPort = 51820',
  'PrivateKey = $(cat server_private.key)',
  'PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE',
  'PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE',
  'EOF',
  '',
  '# 5. Enable and start WireGuard daemon',
  'systemctl enable wg-quick@wg0 && systemctl start wg-quick@wg0',
  '',
  '# 6. Open WireGuard & Router Ports in UFW Firewall',
  'ufw allow 22/tcp && ufw allow 51820/udp && ufw allow 8443:8499/tcp && ufw --force enable',
  '',
  '# Print VPS Public Key (SAVE THIS VALUE!):',
  'cat /etc/wireguard/server_public.key',
], 'Hostinger VPS - WireGuard Hub Setup Script');

curY += 2;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('4. Step 2: Configure MikroTik Router (In WinBox / Terminal)', 14, curY);
curY += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(60, 60, 70);
doc.text('Open WinBox on the router, click Terminal, and paste these commands:', 14, curY);
curY += 5;

curY = addCodeBlock(doc, curY, [
  '# 1. Create WireGuard interface on Router',
  '/interface wireguard add name=wg-vps listen-port=13231 mtu=1420',
  '',
  '# 2. Assign tunnel IP (Use 10.100.0.2 for Router 1, 10.100.0.3 for Router 2, etc.)',
  '/ip address add address=10.100.0.2/24 interface=wg-vps',
  '',
  '# 3. Add Hostinger VPS as WireGuard Peer',
  '/interface wireguard peers add interface=wg-vps \\',
  '    endpoint-address="YOUR_VPS_PUBLIC_IP" \\',
  '    endpoint-port=51820 \\',
  '    public-key="PASTE_VPS_SERVER_PUBLIC_KEY" \\',
  '    allowed-address=10.100.0.0/24 \\',
  '    persistent-keepalive=25s',
  '',
  '# 4. Enable RouterOS REST API on HTTPS (443)',
  '/ip service set www-ssl port=443 disabled=no',
  '',
  '# 5. Create Cloud API User for African Network',
  '/user group add name=cloud-api policy=api,rest-api,read,write,test',
  '/user add name=africannetwork group=cloud-api password="YourSecureRouterPassword123!"',
  '',
  '# 6. Output Router Public Key (COPY THIS KEY!):',
  '/interface wireguard print',
], 'MikroTik RouterOS v7 - WireGuard Client Commands');

// ==========================================
// PAGE 3: REGISTERING & DASHBOARD INTEGRATION
// ==========================================
doc.addPage();
pageNum++;
drawHeaderFooter(doc, 'Super Admin Dashboard Integration');

curY = 22;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('5. Step 3: Register Router Peer on Hostinger VPS', 14, curY);
curY += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(60, 60, 70);
doc.text('Run this on the Hostinger VPS terminal to authorize the router and route port 8443:', 14, curY);
curY += 5;

curY = addCodeBlock(doc, curY, [
  '# Variables for Router 1 (Adjust for Router 2, 3...)',
  'ROUTER_PUBLIC_KEY="PASTE_ROUTER_PUBLIC_KEY_FROM_STEP_2"',
  'ROUTER_IP="10.100.0.2"',
  'VPS_PORT="8443"',
  '',
  '# Authorize peer on running WireGuard interface',
  'wg set wg0 peer "$ROUTER_PUBLIC_KEY" allowed-ips "$ROUTER_IP/32"',
  '',
  '# Persist peer in /etc/wireguard/wg0.conf',
  'cat <<EOF >> /etc/wireguard/wg0.conf',
  '',
  '[Peer]',
  'PublicKey = $ROUTER_PUBLIC_KEY',
  'AllowedIPs = $ROUTER_IP/32',
  'EOF',
  '',
  '# Forward incoming VPS_PORT traffic to Router REST port 443',
  'iptables -t nat -A PREROUTING -p tcp --dport $VPS_PORT -j DNAT --to-destination $ROUTER_IP:443',
  'iptables -A FORWARD -p tcp -d $ROUTER_IP --dport 443 -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT',
  '',
  '# Save iptables rules so they persist across reboot',
  'netfilter-persistent save',
], 'Hostinger VPS - Register Peer & Port Forwarding');

curY += 4;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...SECONDARY_DARK);
doc.text('6. Step 4: Add Router in African Network Dashboard', 14, curY);
curY += 6;

applyAutoTable(doc, {
  startY: curY,
  head: [['Form Field', 'Value to Enter', 'Explanation']],
  body: [
    ['Router Name', 'Kano Main Gateway', 'Human-friendly label shown in dashboard'],
    ['IP Address', 'YOUR_VPS_PUBLIC_IP', 'Hostinger VPS Static Public IPv4 Address'],
    ['Port', '8443', 'The external port forwarded to this router'],
    ['Username', 'africannetwork', 'The dedicated cloud API user created in Step 2'],
    ['Password', 'YourSecureRouterPassword123!', 'The secure password created in Step 2'],
    ['Use SSL', 'Yes (Checked)', 'Uses HTTPS REST protocol (port 443)'],
    ['DNS Name', 'asuktech.net', 'Hotspot login redirect domain'],
    ['Hotspot Server', 'hotspot1', 'Default hotspot server identity on router'],
  ],
  headStyles: { fillColor: ACCENT_PURPLE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 8, textColor: [30, 30, 40] },
  alternateRowStyles: { fillColor: [248, 245, 255] },
  margin: { left: 14, right: 14 },
});

curY = doc.lastAutoTable.finalY + 8;

// Section 7: Verification Checklist
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...SECONDARY_DARK);
doc.text('7. Verification & Health Checklist', 14, curY);
curY += 6;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(40, 40, 50);

const checks = [
  '✔ Test 1 (Ping from VPS): Run `ping 10.100.0.2` on VPS. Latency should be 20-50ms.',
  '✔ Test 2 (REST API via Curl): Run `curl -k -u africannetwork:Pass https://VPS_IP:8443/rest/system/resource`',
  '✔ Test 3 (Dashboard Connection): In /super-admin -> Locations, click "Test Connection" -> Green badge.',
  '✔ Keepalive: "persistent-keepalive=25s" ensures the tunnel stays active 24/7 through mobile/cellular NAT.',
  '✔ Adding Router 2: Repeat with IP 10.100.0.3, VPS Port 8444. Repeat for Router 3 with IP 10.100.0.4, Port 8445.',
];

for (const check of checks) {
  doc.text(check, 14, curY);
  curY += 5;
}

// Generate PDF files
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

// Save in docs/ and in workspace root
const outDocsPath = path.resolve('docs/Multi_MikroTik_Hostinger_VPS_Guide.pdf');
const outRootPath = path.resolve('../Multi_MikroTik_Hostinger_VPS_Guide.pdf');

fs.writeFileSync(outDocsPath, pdfBuffer);
fs.writeFileSync(outRootPath, pdfBuffer);

console.log('PDF generated successfully!');
console.log('Saved to:', outDocsPath);
console.log('Saved to:', outRootPath);
console.log('PDF file size:', (pdfBuffer.length / 1024).toFixed(1), 'KB');

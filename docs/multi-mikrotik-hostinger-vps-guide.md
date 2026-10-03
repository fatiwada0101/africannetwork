# 🌐 Connecting Multiple MikroTik Routers to African Network via 1 Hostinger VPS

A complete production engineering guide for bypassing Carrier-Grade NAT (CGNAT), dynamic IPs, and restrictive ISP firewalls by using a single Hostinger VPS as a central VPN & reverse-proxy hub for unlimited MikroTik routers.

---

## 📌 1. The Challenge & Architecture Overview

### The Problem
- Most cellular providers (MTN, Airtel, Glo), Starlink, and local fiber ISPs deploy **CGNAT (Carrier-Grade NAT)**.
- Routers deployed behind CGNAT receive private WAN IPs (`100.64.0.0/10` or `10.x.x.x`), meaning they **cannot be reached from the internet or cloud apps (such as Vercel)**.
- MikroTik IP Cloud (`/ip cloud`) fails behind CGNAT because the public IP is shared among thousands of ISP subscribers and incoming ports are blocked.

### The Solution: 1 Hostinger VPS as a Central Hub
```
                          ┌──────────────────────────┐
                          │   African Network App    │
                          │   (Vercel / Cloud App)   │
                          └─────────────┬────────────┘
                                        │ REST API Requests
                                        ▼
                          ┌──────────────────────────┐
                          │  Hostinger VPS (Ubuntu)  │
                          │  Static Public IPv4:     │
                          │     [ VPS_PUBLIC_IP ]    │
                          │                          │
                          │  WireGuard Hub:          │
                          │  10.100.0.1/24           │
                          │                          │
                          │  Port 8443 ──> 10.100.0.2│ (Router 1)
                          │  Port 8444 ──> 10.100.0.3│ (Router 2)
                          │  Port 8445 ──> 10.100.0.4│ (Router 3)
                          └──────┬───────────┬───────┘
                     WireGuard   │           │   WireGuard
                      Tunnel     │           │    Tunnel
            ┌────────────────────┘           └────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  MikroTik Router 1 (Site A)  │              │  MikroTik Router 2 (Site B)  │
│  IP: 10.100.0.2              │              │  IP: 10.100.0.3              │
│  Behind MTN/Airtel CGNAT     │              │  Behind Starlink / Fiber     │
│  REST API: Port 443 / 80     │              │  REST API: Port 443 / 80     │
└──────────────────────────────┘              └──────────────────────────────┘
```

**Why This Works 100% of the Time**:
- The MikroTik router **initiates the outbound connection** to your Hostinger VPS on UDP port 51820.
- Outbound connections are never blocked by ISPs or CGNAT.
- Once the WireGuard tunnel is established, your VPS can talk directly to each router via its private tunnel IP (`10.100.0.2`, `10.100.0.3`, etc.).
- The VPS forwards incoming requests from African Network to the respective router.

---

## 🚀 2. Hostinger VPS Initial Setup (Run Once)

Order any standard Hostinger VPS (e.g., KVM 1 or KVM 2 running **Ubuntu 22.04 or 24.04**).

### Step 2.1: Log into your VPS via SSH
```bash
ssh root@YOUR_VPS_PUBLIC_IP
```

### Step 2.2: Automated Hub Setup Script
Run the following script on your VPS. It installs WireGuard, generates the server keys, enables IP forwarding, and configures the firewall:

```bash
#!/bin/bash
set -e

echo "=== Setting up African Network MikroTik Hub on Hostinger VPS ==="

# 1. Update and install WireGuard & iptables-persistent
apt-get update && apt-get install -y wireguard iptables-persistent ufw

# 2. Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf

# 3. Generate Server Keys
mkdir -p /etc/wireguard
cd /etc/wireguard
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key

SERVER_PRIV=$(cat server_private.key)
SERVER_PUB=$(cat server_public.key)

# 4. Create WireGuard Server Interface (wg0)
cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
Address = 10.100.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIV

# PostUp rules for NAT and forwarding
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

# 5. Enable and Start WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# 6. Allow ports through firewall
ufw allow 22/tcp       # SSH
ufw allow 51820/udp   # WireGuard VPN
ufw allow 8443:8499/tcp # MikroTik Router Forwarding Ports
ufw --force enable

echo "=== VPS Hub Initialized Successfully ==="
echo "VPS WireGuard Public Key: $SERVER_PUB"
echo "VPS WireGuard Listen Port: 51820"
```

> [!NOTE]
> Save the **VPS WireGuard Public Key** displayed at the end. You will use it when configuring each MikroTik router.

---

## 🛠️ 3. Adding a MikroTik Router (Repeat for Each Router)

Whenever you buy or deploy a new MikroTik router (RouterOS v7+):

### Summary of IP & Port Mapping Pattern
| Router | Location | WireGuard IP | VPS External Port | Target Router Port |
| :--- | :--- | :--- | :--- | :--- |
| **Router 1** | Main Branch | `10.100.0.2` | `8443` | `443` (REST SSL) |
| **Router 2** | Campus / Cafe | `10.100.0.3` | `8444` | `443` (REST SSL) |
| **Router 3** | Hotel / Site C | `10.100.0.4` | `8445` | `443` (REST SSL) |
| **Router N** | Site N | `10.100.0.N` | `8440 + N` | `443` (REST SSL) |

---

### Step 3.1: Configure the MikroTik Router (WinBox / Terminal)

Open WinBox, click **Terminal**, and run the following commands (replace `YOUR_VPS_PUBLIC_IP` and `YOUR_VPS_SERVER_PUBLIC_KEY` with your actual VPS details):

```routeros
# ==========================================
# 1. CREATE WIREGUARD INTERFACE ON ROUTER
# ==========================================
/interface wireguard add name=wg-vps listen-port=13231 mtu=1420

# Get this router's public key (print it out)
/interface wireguard print

# ==========================================
# 2. ASSIGN IP ADDRESS (For Router 1 use 10.100.0.2/24, Router 2 use 10.100.0.3/24, etc.)
# ==========================================
/ip address add address=10.100.0.2/24 interface=wg-vps

# ==========================================
# 3. ADD VPS AS WIREGUARD PEER
# ==========================================
/interface wireguard peers add interface=wg-vps \
    endpoint-address="YOUR_VPS_PUBLIC_IP" \
    endpoint-port=51820 \
    public-key="YOUR_VPS_SERVER_PUBLIC_KEY" \
    allowed-address=10.100.0.0/24 \
    persistent-keepalive=25s

# ==========================================
# 4. ENABLE REST API & WWW-SSL SERVICES
# ==========================================
/ip service set www-ssl port=443 disabled=no
/ip service set www port=80 disabled=no

# ==========================================
# 5. CREATE A DEDICATED CLOUD API USER
# ==========================================
/user group add name=cloud-api policy=api,rest-api,read,write,test
/user add name=africannetwork group=cloud-api password="YourSecureRouterPassword123!"
```

Copy the router's **public key** displayed from `/interface wireguard print`.

---

### Step 3.2: Register the Router on your Hostinger VPS

Back on your VPS SSH terminal, add the router as an authorized peer and configure port forwarding:

```bash
# Set variables
ROUTER_PUBLIC_KEY="<PASTE_ROUTER_PUBLIC_KEY_HERE>"
ROUTER_IP="10.100.0.2"   # 10.100.0.3 for router 2, etc.
VPS_PORT="8443"          # 8444 for router 2, etc.

# 1. Add Peer to WireGuard
wg set wg0 peer "$ROUTER_PUBLIC_KEY" allowed-ips "$ROUTER_IP/32"

# 2. Append Peer to permanent wg0.conf
cat <<EOF >> /etc/wireguard/wg0.conf

[Peer]
PublicKey = $ROUTER_PUBLIC_KEY
AllowedIPs = $ROUTER_IP/32
EOF

# 3. Add iptables Port Forwarding (from VPS port to Router REST API port 443)
iptables -t nat -A PREROUTING -p tcp --dport $VPS_PORT -j DNAT --to-destination $ROUTER_IP:443
iptables -A FORWARD -p tcp -d $ROUTER_IP --dport 443 -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT

# 4. Persist iptables rules
netfilter-persistent save
```

---

## 🖥️ 4. Adding the Router to African Network Super Admin

Now open your web application and configure the router in seconds:

1. Open your browser and navigate to:
   ```
   https://yourdomain.com/super-admin
   ```
2. Log in with your admin credentials.
3. In the sidebar menu, click **Locations & Fleet** (or **MikroTik Config** if configuring the default router).
4. Click **➕ Add New Router**:
   - **Router Name**: `Main Branch Gateway (Kano)`
   - **IP Address**: `YOUR_VPS_PUBLIC_IP`
   - **Port**: `8443` *(or the port assigned to this router)*
   - **REST API Username**: `africannetwork`
   - **Password**: `YourSecureRouterPassword123!`
   - **Use SSL**: `Yes`
   - **Hotspot DNS Name**: `asuktech.net` *(or your configured DNS)*
   - **Hotspot Server Name**: `hotspot1`
5. Click **Test Connection**:
   - The status badge will immediately turn green: **● Online (v7.x)** with model, CPU load, and uptime telemetry.
6. Click **Save Router**.

---

## ⚡ 5. Verification & Testing

### Test 1: Ping the Router from VPS
On your Hostinger VPS terminal:
```bash
ping -c 3 10.100.0.2
```
If you get replies (`64 bytes from 10.100.0.2...`), the WireGuard tunnel is 100% active.

### Test 2: Query RouterOS REST API via VPS Port
From your computer or VPS:
```bash
curl -k -u africannetwork:YourSecureRouterPassword123! https://YOUR_VPS_PUBLIC_IP:8443/rest/system/resource
```
You will receive JSON containing the router's architecture, CPU load, memory, and uptime.

---

## 🔒 6. Security Best Practices

1. **Firewall Access List**:
   In MikroTik `/ip firewall filter`, allow TCP port 443 only from `10.100.0.0/24` (the WireGuard subnet). This prevents unauthorized devices on the local LAN from tampering with the REST API.
2. **Dedicated User**:
   Never use the root `admin` account with an empty password. Always use the dedicated `africannetwork` user with a strong password.
3. **Keepalive (25s)**:
   Keep `persistent-keepalive=25s` in the MikroTik WireGuard peer. This prevents mobile carrier NAT tables from dropping the idle connection.

---

## 📈 7. Scaling to 50+ Routers Checklist

| Step | Action | Time Required |
| :--- | :--- | :--- |
| 1 | Create WireGuard interface on new router | 30 seconds |
| 2 | Assign IP `10.100.0.X/24` | 10 seconds |
| 3 | Add VPS as peer with keepalive=25s | 20 seconds |
| 4 | Add router peer on VPS + port forward rule | 30 seconds |
| 5 | Register router in African Network Super Admin | 30 seconds |
| **Total** | **Ready for production voucher issuance** | **< 2 minutes** |

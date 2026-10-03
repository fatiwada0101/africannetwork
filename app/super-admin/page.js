'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { THEME_PALETTES, useBranding } from '../context/BrandingContext';
import {
  TrendingUpIcon,
  WifiIcon,
  ShieldIcon,
  CpuIcon,
  WalletIcon,
  RefreshIcon,
  TrashIcon,
  EditPencilIcon,
  CheckIcon,
  PlusIcon,
  LogOutIcon,
  TicketIcon,
  UsersIcon,
  NetworkIcon,
  ActivityIcon,
  SearchIcon,
  ServerIcon,
  ClockIcon,
  ZapIcon,
  ThermometerIcon,
  GlobeIcon,
  PrinterIcon,
  DownloadIcon,
  LayoutIcon,
  SmartphoneIcon,
  MonitorIcon,
  DatabaseIcon,
} from '../components/Icons';
import MikroTikSetupGuide from '../components/MikroTikSetupGuide';
import MikroTikDiagnosticsAndLogs from '../components/MikroTikDiagnosticsAndLogs';
import WindowsProgressBar from '../components/WindowsProgressBar';
import DatabaseSchemaTab from '../components/DatabaseSchemaTab';
import DashboardTab from './components/DashboardTab';
import FinanceTab from './components/FinanceTab';
import LiveSessionsTab from './components/LiveSessionsTab';
import VoucherFactoryTab from './components/VoucherFactoryTab';
import FallbackVouchersTab from './components/FallbackVouchersTab';
import RouterUsersTab from './components/RouterUsersTab';
import HotspotProfilesTab from './components/HotspotProfilesTab';
import PlansTab from './components/PlansTab';
import NetworkHealthTab from './components/NetworkHealthTab';
import BrandingTab from './components/BrandingTab';
import LoginDesignTab from './components/LoginDesignTab';
import WalledGardenTab from './components/WalledGardenTab';
import MikroTikConfigTab from './components/MikroTikConfigTab';
import PaymentGatewayTab from './components/PaymentGatewayTab';
import ChangeHistoryTab from './components/ChangeHistoryTab';
import LocationsTab from './components/LocationsTab';
import TicketsTab from './components/TicketsTab';
import ResellersTab from './components/ResellersTab';
import AnalyticsTab from './components/AnalyticsTab';
import TenantsTab from './components/TenantsTab';


const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUpIcon },
  { id: 'finance', label: 'Finance', icon: WalletIcon },
  { id: 'analytics', label: 'Analytics & BI', icon: TrendingUpIcon },
  { id: 'sessions', label: 'Live Sessions', icon: WifiIcon },
  { id: 'vouchers', label: 'Voucher Factory', icon: TicketIcon },
  { id: 'fallback-vouchers', label: 'Fallback Pool', icon: ShieldIcon },
  { id: 'router-users', label: 'Router Users', icon: UsersIcon },
  { id: 'profiles', label: 'Hotspot Profiles', icon: ShieldIcon },
  { id: 'plans', label: 'Internet Plans', icon: WalletIcon },
  { id: 'network', label: 'Network Health', icon: ActivityIcon },
  { id: 'resellers', label: 'Resellers & Agents', icon: UsersIcon },
  { id: 'locations', label: 'Locations & Fleet', icon: GlobeIcon },
  { id: 'tickets', label: 'Support Tickets', icon: UsersIcon },
  { id: 'tenants', label: 'SaaS Tenants', icon: ServerIcon },
  { id: 'branding', label: 'Branding & Theme', icon: EditPencilIcon },
  { id: 'login-design', label: 'Login Design', icon: LayoutIcon },
  { id: 'walled-garden', label: 'Walled Garden', icon: GlobeIcon },
  { id: 'mikrotik', label: 'MikroTik Config', icon: CpuIcon },
  { id: 'payments', label: 'Payment Gateway', icon: ServerIcon },
  { id: 'history', label: 'Change History', icon: ClockIcon },
  { id: 'database', label: 'Database & Schema', icon: DatabaseIcon },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const { isDark, toggleMode } = useBranding();

  // Authentication
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [token, setToken] = useState('');

  // UI
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dashboard & Analytics
  const [stats, setStats] = useState({
    revenue: 0, vouchers: 0, activeSessions: 0, walletLiability: 0,
    dailySales: [], planDistribution: [], recentVouchers: [],
  });
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});

  // MikroTik Config
  const [mikrotikForm, setMikrotikForm] = useState({
    ip: '192.168.88.1',
    user: 'admin',
    pass: '',
    port: '443',
    use_ssl: true,
    hotspot_url: 'asuktech.net',
    wifi_ssid: 'African Network Wi-Fi',
  });
  const [syncingHotspot, setSyncingHotspot] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [flutterwaveForm, setFlutterwaveForm] = useState({
    public_key: '', secret_key: '', webhook_secret: '', enabled: false,
  });
  const [monnifyForm, setMonnifyForm] = useState({
    api_key: '', secret_key: '', contract_code: '', client_secret: '', enabled: false, is_test: true,
  });
  const [activeGateway, setActiveGateway] = useState('flutterwave');

  // Branding
  const [brandingForm, setBrandingForm] = useState({
    app_name: 'African Network', logo_url: '', theme: 'violet', app_url: '',
  });

  const [webhookCopied, setWebhookCopied] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Auto Setup
  const [autoSetupLoading, setAutoSetupLoading] = useState(false);
  const [autoSetupResult, setAutoSetupResult] = useState(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [pushingLogin, setPushingLogin] = useState(false);

  // Windows Progress Bar States
  const [autoSetupProgress, setAutoSetupProgress] = useState({
    active: false,
    percent: 0,
    title: '',
    subtitle: '',
    status: 'normal', // 'normal' | 'warning' | 'error' | 'success'
    itemCount: '',
    elapsedText: '',
    canRetry: false,
  });
  const autoSetupAbortRef = useRef(null);

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

  // Polling Mode
  const [pollingConfig, setPollingConfig] = useState({
    enabled: false, secret: '', interval: 10,
  });
  const [pollingStatus, setPollingStatus] = useState(null);
  const [pollingScriptCopied, setPollingScriptCopied] = useState(false);
  const [pollingSecretCopied, setPollingSecretCopied] = useState(false);

  // Hotspot Sharing
  const [hotspotSettings, setHotspotSettings] = useState({
    sharing_enabled: false, default_devices: 1, default_upload_speed: '12M', default_download_speed: '12M',
    expiry_mode: 'elapsed', // 'elapsed' = countdown continues when offline, 'paused' = countdown pauses when offline
  });

  // Plan Management
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    id: '', name: '', speed: '', price: '', duration: '', popular: false, sort_order: 0,
    devices: 1, upload_speed: '12M', download_speed: '12M',
  });

  // Voucher Generator
  const [voucherGen, setVoucherGen] = useState({
    quantity: 10,
    prefix: '',
    code_format: 'numbers_only',
    code_length: 5,
    profile: 'default',
    expiry_type: 'daily',
    custom_duration: '1d',
    data_limit: 'unlimited',
    custom_data_limit: '',
    price: 100,
    plan_name: '1 Day Pass',
    devices: 1,
    upload_speed: '12M',
    download_speed: '12M',
  });
  const [voucherFactoryTab, setVoucherFactoryTab] = useState('generator'); // 'generator' | 'batches'
  const [batchHistory, setBatchHistory] = useState([]);
  const [batchHistoryLoading, setBatchHistoryLoading] = useState(false);
  const [selectedPlanPreset, setSelectedPlanPreset] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);
  const [genResult, setGenResult] = useState(null);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherSort, setVoucherSort] = useState('default');
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherPageSize, setVoucherPageSize] = useState(20);
  const [printScope, setPrintScope] = useState('all');

  // Voucher Card Customization
  const [cardOptions, setCardOptions] = useState({
    style: 'branded', cols: 2, rows: 4,
    showSsid: true, showPrice: true, showExpiry: true,
    showDataLimit: true, showSerial: true,
  });
  const [cardExporting, setCardExporting] = useState(false);

  // Login Design (Portal Templates)
  const [portalTemplate, setPortalTemplate] = useState('midnight-glass');
  const [portalConfig, setPortalConfig] = useState({
    logoUrl: '', businessName: '', contactFooter: '', primaryColor: '', buyUrl: '',
  });

  const [portalPushing, setPortalPushing] = useState(false);
  const [portalPreviewMode, setPortalPreviewMode] = useState('phone');
  const [portalPreviewKey, setPortalPreviewKey] = useState(0);
  const [portalConfigLoaded, setPortalConfigLoaded] = useState(false);

  // Walled Garden
  const [walledGardenEntries, setWalledGardenEntries] = useState([]);
  const [wgLoading, setWgLoading] = useState(false);
  const [wgSyncing, setWgSyncing] = useState(false);
  const [wgCustomUrl, setWgCustomUrl] = useState('');
  const [wgCustomComment, setWgCustomComment] = useState('');

  // Change History & Rollback
  const [changeHistory, setChangeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyRollbacking, setHistoryRollbacking] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Router Users
  const [routerUsers, setRouterUsers] = useState([]);
  const [routerUsersLoading, setRouterUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [userEditForm, setUserEditForm] = useState({ 'limit-uptime': '', profile: '' });

  // Hotspot Profiles
  const [routerProfiles, setRouterProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '', 'rate-limit': '', 'shared-users': '1',
    'session-timeout': '', 'idle-timeout': '', 'keepalive-timeout': '',
  });

  // Network Health
  const [networkData, setNetworkData] = useState({
    health: [], leases: [], logs: [], interfaces: [],
  });
  const [networkLoading, setNetworkLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const actionLockRef = useRef(false);

  // Misc
  const [copiedPin, setCopiedPin] = useState('');
  const [rebootLoading, setRebootLoading] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);


  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); }, []);
  const formatPrice = useCallback((a) => '₦' + Number(a || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);
  const formatBytes = (bytes) => {
    if (!bytes || bytes === '0') return '0 B';
    const n = Number(bytes);
    if (isNaN(n)) return bytes;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  };

  const adminHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Basic ${token}`,
  }), [token]);

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem('sa_token');
    if (saved) { setToken(saved); setAuthed(true); }
  }, []);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
      const res = await fetch('/api/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Invalid credentials'); return; }
      sessionStorage.setItem('sa_token', data.token);
      setToken(data.token);
      setAuthed(true);
      showToast('Welcome to Super Admin Dashboard');
    } catch { setAuthError('Unable to connect to server'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sa_token');
    setAuthed(false); setToken(''); setUsername(''); setPassword('');
  };

  // ── Data Fetchers ──────────────────────────────────────────

  const fetchCoreData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, settingsRes, plansRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: adminHeaders() }),
        fetch('/api/super-admin/settings', { headers: adminHeaders() }),
        fetch('/api/super-admin/plans?all=true', { headers: adminHeaders() }),
        fetch('/api/mikrotik/active-sessions', { headers: adminHeaders() }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(prev => ({
          ...prev, revenue: d.revenue || 0, vouchers: d.vouchers || 0,
          totalGenerated: d.totalGenerated || 0, trendPct: d.trendPct || 0,
          walletLiability: d.walletLiability || 0,
          dailySales: d.dailySales || [], planDistribution: d.planDistribution || [],
          recentVouchers: d.recentVouchers || [],
        }));
      }

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        if (s.mikrotik) setMikrotikForm(prev => ({ ...prev, ...s.mikrotik }));
        if (s.flutterwave) setFlutterwaveForm(prev => ({ ...prev, ...s.flutterwave }));
        if (s.monnify) setMonnifyForm(prev => ({ ...prev, ...s.monnify }));
        if (s.payment_gateway) setActiveGateway(s.payment_gateway.active || 'flutterwave');
        if (s.branding) setBrandingForm(prev => ({ ...prev, ...s.branding }));
        if (s.hotspot_settings) setHotspotSettings(prev => ({ ...prev, ...s.hotspot_settings }));
        if (s.polling_config) setPollingConfig(prev => ({ ...prev, ...s.polling_config }));
      }

      if (plansRes.ok) setPlans(await plansRes.json());

      if (sessionsRes.ok) {
        const sd = await sessionsRes.json();
        const list = sd.sessions || [];
        setSessions(list);
        setStats(prev => ({ ...prev, activeSessions: list.length }));
      }
    } catch (err) { console.error('Core data fetch error:', err); }
    finally { setLoading(false); }
  }, [token, adminHeaders]);

  const fetchRouterUsers = useCallback(async () => {
    if (!token) return;
    setRouterUsersLoading(true);
    try {
      const res = await fetch('/api/mikrotik/hotspot-users', { headers: adminHeaders() });
      if (res.ok) {
        const d = await res.json();
        setRouterUsers(d.users || []);
      }
    } catch (err) { console.error('Router users error:', err); }
    finally { setRouterUsersLoading(false); }
  }, [token, adminHeaders]);

  const fetchRouterProfiles = useCallback(async () => {
    if (!token) return;
    setProfilesLoading(true);
    try {
      const res = await fetch('/api/mikrotik/hotspot-profiles', { headers: adminHeaders() });
      if (res.ok) {
        const d = await res.json();
        setRouterProfiles(d.profiles || []);
      }
    } catch (err) { console.error('Router profiles error:', err); }
    finally { setProfilesLoading(false); }
  }, [token, adminHeaders]);

  const fetchNetworkHealth = useCallback(async () => {
    if (!token) return;
    setNetworkLoading(true);
    try {
      const res = await fetch('/api/mikrotik/system-health', { headers: adminHeaders() });
      if (res.ok) {
        const d = await res.json();
        setNetworkData({
          health: d.health || [], leases: d.leases || [],
          logs: d.logs || [], interfaces: d.interfaces || [],
        });
      }
    } catch (err) { console.error('Network health error:', err); }
    finally { setNetworkLoading(false); }
  }, [token, adminHeaders]);

  const fetchWalledGarden = useCallback(async () => {
    setWgLoading(true);
    try {
      const res = await fetch('/api/mikrotik/walled-garden', { headers: adminHeaders() });
      const data = await res.json();
      if (res.ok && data.entries) {
        setWalledGardenEntries(data.entries);
      }
    } catch (err) {
      console.error('Walled garden fetch error:', err);
    } finally { setWgLoading(false); }
  }, [adminHeaders]);

  const fetchBatchHistory = useCallback(async () => {
    if (!token) return;
    setBatchHistoryLoading(true);
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', { headers: adminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBatchHistory(data.batches || []);
      }
    } catch (err) {
      console.error('Batch history error:', err);
    } finally {
      setBatchHistoryLoading(false);
    }
  }, [token, adminHeaders]);

  const fetchChangeHistory = useCallback(async (cat) => {
    const category = cat !== undefined ? cat : historyFilter;
    setHistoryLoading(true);
    try {
      const url = category && category !== 'all'
        ? `/api/super-admin/change-history?category=${encodeURIComponent(category)}&limit=100`
        : '/api/super-admin/change-history?limit=100';
      const res = await fetch(url, { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        setChangeHistory(data.entries || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilter, adminHeaders]);

  const handleTestMikrotik = useCallback(async (silent = false) => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/mikrotik/test-connection', {
        headers: adminHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      setTestResult(data);
      if (!silent) {
        if (data.connected) showToast('✅ Router Connected!');
        else showToast(data.error ? `⚠️ ${data.error}` : '⚠️ Connection failed');
      }
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
      const msg = isTimeout ? 'Connection timed out after 10s. Check router IP and port.' : err.message;
      setTestResult({ connected: false, error: msg });
      if (!silent) showToast(`Network error: ${msg}`);
    } finally { setTestLoading(false); }
  }, [adminHeaders]);

  const handleRestartMikrotik = useCallback(async () => {
    setRebootLoading(true);
    setShowRebootModal(false);
    showToast('🔄 Sending reboot command to MikroTik router via REST API...');

    try {
      const res = await fetch('/api/mikrotik/reboot', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✅ Router reboot initiated! Hardware is restarting (back online in ~30–45s).');
        setTestResult({ connected: false, error: 'Router is currently rebooting...' });

        // Auto-poll connection after router reboots
        setTimeout(() => { handleTestMikrotik(true); }, 25000);
        setTimeout(() => { handleTestMikrotik(false); }, 40000);
      } else {
        showToast(`❌ Reboot failed: ${data.error || 'Unknown router error'}`);
      }
    } catch (err) {
      showToast(`Network error triggering reboot: ${err.message}`);
    } finally {
      setRebootLoading(false);
    }
  }, [adminHeaders, handleTestMikrotik, showToast]);

  const handleRestoreDefaults = useCallback(async () => {
    setRestoreLoading(true);
    showToast('🛡️ Restoring clean factory hotspot & default login page...');

    try {
      const res = await fetch('/api/mikrotik/restore-defaults', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          wifi_ssid: mikrotikForm.wifi_ssid || 'Hotspot',
          business_name: mikrotikForm.wifi_ssid || 'Internet Hotspot',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreResult(data);
        setShowRestoreModal(false);
        showToast('✅ Factory default login page & hotspot settings restored! Cloud access remains 100% active.');
        handleTestMikrotik(true);
        setPortalTemplate('factory-default');
        setPortalConfig({
          logoUrl: '',
          businessName: mikrotikForm.wifi_ssid || 'Internet Hotspot',
          contactFooter: '',
          primaryColor: '',
          buyUrl: '',
        });
        setPortalPreviewKey(k => k + 1);
      } else {
        showToast(`❌ Restore failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Network error restoring defaults: ${err.message}`);
    } finally {
      setRestoreLoading(false);
    }
  }, [adminHeaders, mikrotikForm.wifi_ssid, handleTestMikrotik, showToast]);

  // Initial load
  useEffect(() => {
    if (authed && token) {
      fetchCoreData();
      handleTestMikrotik(true);
    }
  }, [authed, token, fetchCoreData]);

  // Tab-specific data loading
  useEffect(() => {
    if (!authed || !token) return;
    if (activeTab === 'router-users') fetchRouterUsers();
    else if (activeTab === 'profiles') fetchRouterProfiles();
    else if (activeTab === 'network') fetchNetworkHealth();
    else if (activeTab === 'walled-garden') fetchWalledGarden();
    else if (activeTab === 'vouchers') fetchBatchHistory();
    else if (activeTab === 'history') fetchChangeHistory();
    else if (activeTab === 'login-design' && !portalConfigLoaded) {
      // Load saved portal template config on first visit
      fetch('/api/super-admin/settings', { headers: adminHeaders() })
        .then(r => r.json())
        .then(data => {
          const cfg = data?.portal_template;
          if (cfg && typeof cfg === 'object') {
            if (cfg.templateId) setPortalTemplate(cfg.templateId);
            setPortalConfig({
              logoUrl: cfg.logoUrl || '',
              businessName: cfg.businessName || '',
              contactFooter: cfg.contactFooter || '',
              primaryColor: cfg.primaryColor || '',
              buyUrl: cfg.buyUrl || '',
            });
          }
          setPortalConfigLoaded(true);
        })
        .catch(() => setPortalConfigLoaded(true));
    }
  }, [activeTab, authed, token, fetchRouterUsers, fetchRouterProfiles, fetchNetworkHealth, fetchWalledGarden, fetchBatchHistory, fetchChangeHistory, portalConfigLoaded, adminHeaders]);

  // Auto-refresh login design preview when template or config changes (debounced)
  useEffect(() => {
    if (activeTab !== 'login-design') return;
    const t = setTimeout(() => setPortalPreviewKey(k => k + 1), 600);
    return () => clearTimeout(t);
  }, [portalTemplate, portalConfig.logoUrl, portalConfig.businessName, portalConfig.contactFooter, portalConfig.primaryColor, portalConfig.buyUrl, activeTab]);


  // ── Action Handlers ────────────────────────────────────────

  const saveMikrotik = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      let cleanIp = (mikrotikForm.ip || '').trim();
      let cleanPort = mikrotikForm.port || '443';
      let useSsl = mikrotikForm.use_ssl;

      if (/^https?:\/\//i.test(cleanIp)) {
        if (cleanIp.toLowerCase().startsWith('http://')) useSsl = false;
        if (cleanIp.toLowerCase().startsWith('https://')) useSsl = true;
        cleanIp = cleanIp.replace(/^https?:\/\//i, '');
      }
      cleanIp = cleanIp.replace(/\/.*$/, '').trim();
      if (cleanIp.includes(':')) {
        const colonIdx = cleanIp.lastIndexOf(':');
        const pPort = cleanIp.substring(colonIdx + 1).trim();
        if (/^\d+$/.test(pPort)) {
          cleanIp = cleanIp.substring(0, colonIdx).trim();
          cleanPort = pPort;
        }
      }

      const updatedForm = {
        ...mikrotikForm,
        ip: cleanIp,
        port: cleanPort,
        use_ssl: useSsl,
        configured: true,
      };
      setMikrotikForm(updatedForm);

      const res = await fetch('/api/super-admin/settings', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({ key: 'mikrotik', value: updatedForm }),
      });
      if (res.ok) { showToast('✅ MikroTik settings saved!'); handleTestMikrotik(); }
      else showToast('❌ Failed to save');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const handleSyncHotspot = async () => {
    if (syncingHotspot) return;
    setSyncingHotspot(true);
    try {
      const res = await fetch('/api/mikrotik/sync-hotspot', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          dns_name: mikrotikForm.hotspot_url,
          wifi_ssid: mikrotikForm.wifi_ssid,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ ${data.message || 'Hotspot domain configured on router!'}`);
      } else {
        showToast(data.error || 'Failed to sync hotspot domain');
      }
    } catch (e) {
      showToast('Network error syncing hotspot');
    } finally {
      setSyncingHotspot(false);
    }
  };

  const saveFlutterwave = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({ key: 'flutterwave', value: flutterwaveForm }),
      });
      if (res.ok) showToast('✅ Flutterwave saved!');
      else showToast('❌ Failed to save');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const saveMonnify = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({ key: 'monnify', value: monnifyForm }),
      });
      if (res.ok) showToast('Monnify saved!');
      else {
        const result = await res.json();
        const details = Object.values(result.details || {}).flat().join('; ');
        showToast(details || result.error || 'Failed to save Monnify');
      }
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const saveActiveGateway = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({ key: 'payment_gateway', value: { active: activeGateway } }),
      });
      if (res.ok) showToast('Active gateway set to ' + (activeGateway === 'monnify' ? 'Monnify' : 'Flutterwave'));
      else showToast('Failed to save');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  // Plan CRUD
  const savePlan = async () => {
    if (actionLockRef.current) return;
    if (!planForm.id || !planForm.name || !planForm.price || !planForm.duration) {
      showToast('Fill all required plan fields'); return;
    }
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'POST', headers: adminHeaders(), body: JSON.stringify(planForm),
      });
      if (res.ok) {
        showToast(editingPlan ? 'Plan updated!' : 'Plan created!');
        setEditingPlan(null);
        setPlanForm({ id: '', name: '', speed: '', price: '', duration: '', popular: false, sort_order: 0, devices: 1, upload_speed: '12M', download_speed: '12M' });
        fetchCoreData();
      } else showToast('Failed to save plan');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const deletePlan = async (id) => {
    if (actionLockRef.current) return;
    if (!confirm('Delete this internet plan?')) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'DELETE', headers: adminHeaders(), body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast('Plan deleted'); fetchCoreData(); }
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const startEditPlan = (p) => {
    setEditingPlan(p.id);
    setPlanForm({ id: p.id, name: p.name, speed: p.speed || '', price: p.price, duration: p.duration, popular: p.popular || false, sort_order: p.sort_order || 0, devices: p.devices || 1, upload_speed: p.upload_speed || '12M', download_speed: p.download_speed || '12M' });
  };

  // Session kick
  const kickUser = async (sessionId, username) => {
    if (actionLockRef.current) return;
    if (!confirm(`Disconnect "${username}"?`)) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/mikrotik/kick-user', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.ok) { showToast(`Disconnected: ${username}`); fetchCoreData(); }
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };


  // Quick Preset Loader from Existing Plan
  const handleQuickLoadPlan = (planId) => {
    setSelectedPlanPreset(planId);
    if (!planId) return;
    const p = plans.find(plan => String(plan.id) === String(planId));
    if (!p) return;

    let expType = 'daily';
    let customDur = '';
    const d = (p.duration || '').toLowerCase();
    if (d === '1h') expType = '1h';
    else if (d === '3h') expType = '3h';
    else if (d === '6h') expType = '6h';
    else if (d === '12h') expType = '12h';
    else if (d === '24h' || d === '1d' || d === 'daily') expType = 'daily';
    else if (d === '7d' || d === 'weekly') expType = 'weekly';
    else if (d === '30d' || d === 'monthly') expType = 'monthly';
    else {
      expType = 'custom';
      customDur = p.duration || '1d';
    }

    setVoucherGen(prev => ({
      ...prev,
      plan_name: p.name || prev.plan_name,
      price: p.price !== undefined ? p.price : prev.price,
      profile: p.profile_name || 'default',
      devices: p.devices || 1,
      upload_speed: p.upload_speed || '12M',
      download_speed: p.download_speed || '12M',
      expiry_type: expType,
      custom_duration: customDur,
      data_limit: p.data_limit || prev.data_limit || 'unlimited',
    }));
    showToast(`⚡ Loaded preset: ${p.name} (₦${p.price})`);
  };

  // Voucher Generator
  const handleGenerateVouchers = async () => {
    setGenLoading(true);
    setGenResult(null);
    setGeneratedVouchers([]);
    setVoucherSearch('');
    setVoucherSort('default');
    setVoucherPage(1);

    const effectiveDataLimit = voucherGen.data_limit === 'custom' 
      ? (voucherGen.custom_data_limit?.trim() || 'unlimited')
      : voucherGen.data_limit;

    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ...voucherGen,
          data_limit: effectiveDataLimit,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenResult(data);
        setGeneratedVouchers(data.vouchers || []);
        if (data.generated === 0 && data.failed > 0) {
          const firstErr = data.errors?.[0]?.error || 'Unknown error';
          showToast(`❌ All ${data.failed} vouchers failed: ${firstErr}`);
        } else if (data.failed > 0) {
          showToast(`⚠️ Generated ${data.generated} vouchers (${data.failed} failed: ${data.errors?.[0]?.error || 'unknown'})`);
        } else {
          showToast(`✅ Generated ${data.generated} vouchers successfully!`);
        }
        fetchCoreData();
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.details || data.error || 'Generation failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
    finally { setGenLoading(false); }
  };

  // Delete individual generated voucher
  const handleDeleteGeneratedVoucher = async (voucher) => {
    const code = voucher.code || voucher.voucher_code;
    if (!confirm(`Delete voucher "${code}"? This removes it from both the database and router.`)) return;
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedVouchers(prev => prev.filter(v => v.id !== voucher.id));
        showToast(`🗑️ Deleted voucher ${code} (${data.router_removed} removed from router)`);
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.error || 'Delete failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
  };

  // Delete entire batch
  const handleDeleteBatch = async (batchId, count) => {
    if (!confirm(`Delete ALL ${count || ''} vouchers in batch "${batchId}"?\n\nThis removes them from the database and the router. This action cannot be undone.`)) return;
    try {
      const res = await fetch('/api/mikrotik/generate-vouchers', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ batch_id: batchId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🗑️ Deleted batch ${batchId}: ${data.deleted} vouchers removed (${data.router_removed} from router)`);
        // If current view shows this batch, clear it
        if (genResult?.batch_id === batchId) {
          setGenResult(null);
          setGeneratedVouchers([]);
        }
        fetchBatchHistory();
      } else {
        showToast('❌ ' + (data.error || 'Batch delete failed'));
      }
    } catch (err) { showToast('Error: ' + err.message); }
  };

  // Load Past Batch into Card Studio
  const handleLoadBatch = async (batchId) => {
    setGenLoading(true);
    try {
      const res = await fetch(`/api/mikrotik/generate-vouchers?batch_id=${encodeURIComponent(batchId)}`, {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const vList = data.vouchers || [];
        setGenResult({
          batch_id: batchId,
          generated: vList.length,
          failed: 0,
          expiry_label: vList[0]?.duration || 'Custom',
          limit_uptime: vList[0]?.duration || '1d',
          data_limit: vList[0]?.data_limit || 'unlimited',
        });
        setGeneratedVouchers(vList);
        if (vList[0]) {
          setVoucherGen(prev => ({
            ...prev,
            plan_name: vList[0].profile_name || prev.plan_name,
            price: vList[0].price !== undefined ? vList[0].price : prev.price,
            data_limit: vList[0].data_limit || prev.data_limit,
          }));
        }
        setVoucherFactoryTab('generator');
        showToast(`Loaded Batch ${batchId} (${vList.length} vouchers)`);
      } else {
        showToast('Failed to load batch vouchers');
      }
    } catch (err) {
      showToast('Error loading batch: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  // CSV Export Handler
  const handleExportCsv = (vouchersList, customFileName) => {
    if (!vouchersList || vouchersList.length === 0) return showToast('No vouchers to export');
    const outName = customFileName || `vouchers_${genResult?.batch_id || 'export'}.csv`;
    const headers = ['Serial #', 'Voucher Code', 'Plan Name', 'Price (NGN)', 'Duration/Expiry', 'Data Limit', 'Batch ID', 'Direct Login Link'];
    const rows = vouchersList.map((v, i) => [
      v.serial_number || (i + 1),
      `"${v.code || v.voucher_code || ''}"`,
      `"${v.plan_name || voucherGen.plan_name || ''}"`,
      v.price !== undefined ? v.price : voucherGen.price,
      `"${v.expiry || genResult?.expiry_label || v.duration || ''}"`,
      `"${v.data_limit || voucherGen.data_limit || 'unlimited'}"`,
      `"${v.batch_id || genResult?.batch_id || ''}"`,
      `"${v.qr_url || `http://${mikrotikForm.hotspot_url || 'asuktech.net'}/login?code=${v.code || v.voucher_code}`}"`,
    ]);
    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', outName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`📊 CSV exported (${vouchersList.length} vouchers)`);
  };

  // ═══ Voucher Card Export Handlers with Search, Sort & Scope ═══
  const getProcessedVouchers = useCallback(() => {
    let list = [...generatedVouchers];
    if (voucherSearch.trim()) {
      const q = voucherSearch.trim().toLowerCase();
      list = list.filter(v => (v.code || v.voucher_code || '').toLowerCase().includes(q) || (v.expiry || v.duration || '').toLowerCase().includes(q));
    }
    if (voucherSort === 'code-asc') {
      list.sort((a, b) => (a.code || a.voucher_code || '').localeCompare(b.code || b.voucher_code || ''));
    } else if (voucherSort === 'code-desc') {
      list.sort((a, b) => (b.code || b.voucher_code || '').localeCompare(a.code || a.voucher_code || ''));
    } else if (voucherSort === 'expiry') {
      list.sort((a, b) => (a.expiry || a.duration || '').localeCompare(b.expiry || b.duration || ''));
    }
    return list;
  }, [generatedVouchers, voucherSearch, voucherSort]);

  const getTargetVouchersForExport = useCallback(() => {
    const list = getProcessedVouchers();
    if (printScope === 'page' && voucherPageSize !== 'all') {
      const size = Number(voucherPageSize) || 20;
      return list.slice((voucherPage - 1) * size, voucherPage * size);
    }
    return list;
  }, [getProcessedVouchers, printScope, voucherPageSize, voucherPage]);

  const handlePrintCards = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to print');
    setCardExporting(true);
    try {
      const { printVoucherCards } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      await printVoucherCards(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`🖨️ Print dialog opened (${cardVouchers.length} cards)`);
    } catch (err) { showToast('Print error: ' + err.message); }
    finally { setCardExporting(false); }
  };

  const handleDownloadCardsPdf = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to download');
    setCardExporting(true);
    try {
      const { downloadVoucherSheetPdf } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      await downloadVoucherSheetPdf(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`📄 PDF downloaded (${cardVouchers.length} cards)`);
    } catch (err) { showToast('PDF error: ' + err.message); }
    finally { setCardExporting(false); }
  };

  const handleDownloadCardsImage = async () => {
    const targetVouchers = getTargetVouchersForExport();
    if (targetVouchers.length === 0) return showToast('No vouchers to download');
    setCardExporting(true);
    try {
      const { downloadVoucherSheetImage } = await import('@/lib/voucherCardGenerator');
      const cardVouchers = targetVouchers.map((v, idx) => ({
        code: v.code || v.voucher_code,
        serial_number: v.serial_number || (idx + 1),
        expiry: v.expiry || genResult?.expiry_label || v.duration || '',
        data_limit: v.data_limit || voucherGen.data_limit,
        batch_id: v.batch_id || genResult?.batch_id,
        plan_name: v.plan_name || voucherGen.plan_name,
        price: v.price !== undefined ? v.price : voucherGen.price,
      }));
      downloadVoucherSheetImage(cardVouchers, {
        ...cardOptions,
        brandName: brandingForm.app_name || 'African Network Wi-Fi',
        ssid: mikrotikForm.wifi_ssid || 'African Network Wi-Fi',
      });
      showToast(`🖼️ Image downloaded (${cardVouchers.length} cards)`);
    } catch (err) { showToast('Image error: ' + err.message); }
    finally { setCardExporting(false); }
  };


  // ═══ Walled Garden Handlers & Domain Definitions ═══
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
    // Digital Banks & Fintechs
    { domain: '*.opayweb.com', label: 'OPay Web Portal' },
    { domain: '*.opay.com', label: 'OPay Mobile & API' },
    { domain: '*.operapay.com', label: 'OPay Services' },
    { domain: '*.palmpay.com', label: 'PalmPay Web' },
    { domain: '*.palmpay.co', label: 'PalmPay API' },
    { domain: '*.palmpay.app', label: 'PalmPay App Engine' },
    { domain: '*.moniepoint.com', label: 'Moniepoint Banking' },
    { domain: '*.teamapt.com', label: 'TeamApt / Moniepoint' },
    { domain: '*.kuda.com', label: 'Kuda Bank Web' },
    { domain: '*.kudabank.com', label: 'Kuda Bank Portal' },
    { domain: '*.piggyvest.com', label: 'Piggyvest' },
    { domain: '*.pocketapp.com', label: 'Pocket by Piggyvest' },
    { domain: '*.vbank.ng', label: 'VBank by VFD' },
    { domain: '*.vfdtech.ng', label: 'VFD Tech Infra' },
    { domain: '*.getcarbon.co', label: 'Carbon Finance' },
    { domain: '*.carbon.ng', label: 'Carbon NG' },
    { domain: '*.fairmoney.io', label: 'FairMoney Bank' },
    { domain: '*.fairmoney.ng', label: 'FairMoney NG' },
    { domain: '*.chippercash.com', label: 'Chipper Cash' },
    // Commercial Banks
    { domain: '*.gtbank.com', label: 'GTBank' },
    { domain: '*.gtworld.com', label: 'GTWorld Mobile' },
    { domain: '*.accessbankplc.com', label: 'Access Bank' },
    { domain: '*.accessmore.com', label: 'AccessMore App' },
    { domain: '*.zenithbank.com', label: 'Zenith Bank' },
    { domain: '*.zenithbank.com.ng', label: 'Zenith Bank NG' },
    { domain: '*.firstbanknigeria.com', label: 'First Bank' },
    { domain: '*.firstmonie.com', label: 'FirstMonie Agent & App' },
    { domain: '*.ubagroup.com', label: 'UBA Group' },
    { domain: '*.uba.com', label: 'UBA Portal' },
    { domain: '*.stanbicibtc.com', label: 'Stanbic IBTC' },
    { domain: '*.stanbic.com', label: 'Stanbic Portal' },
    { domain: '*.fidelitybank.ng', label: 'Fidelity Bank' },
    { domain: '*.fidelitybank.com', label: 'Fidelity Portal' },
    { domain: '*.sterlingbank.com', label: 'Sterling Bank' },
    { domain: '*.sterling.ng', label: 'Sterling NG' },
    { domain: '*.onebank.ng', label: 'OneBank by Sterling' },
    { domain: '*.fcmb.com', label: 'FCMB' },
    { domain: '*.unionbankng.com', label: 'Union Bank' },
    { domain: '*.unionbank.com', label: 'Union Bank Portal' },
    { domain: '*.polarisbanklimited.com', label: 'Polaris Bank' },
    { domain: '*.polaris.com.ng', label: 'Polaris Bank NG' },
    { domain: '*.vult.ng', label: 'VULTe by Polaris' },
    { domain: '*.alat.ng', label: 'ALAT by Wema' },
    { domain: '*.wemabank.com', label: 'Wema Bank' },
    { domain: '*.keystonebankng.com', label: 'Keystone Bank' },
    { domain: '*.jaizbankplc.com', label: 'Jaiz Bank' },
    { domain: '*.tajbank.com', label: 'Taj Bank' },
    { domain: '*.lotusbank.com', label: 'Lotus Bank' },
    { domain: '*.premiumtrustbank.com', label: 'PremiumTrust Bank' },
    { domain: '*.optimusbank.com', label: 'Optimus Bank' },
    { domain: '*.signaturebankng.com', label: 'Signature Bank' },
  ];

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

  const handleRollback = async (entry) => {
    if (!confirm(`Roll back this change?\n\n"${entry.summary}"\n\nThis will restore previous settings and re-apply them to the router if applicable.`)) {
      return;
    }
    setHistoryRollbacking(entry.id);
    try {
      const res = await fetch('/api/super-admin/change-history', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ ${data.message || 'Rollback applied successfully!'}`);
        await fetchChangeHistory();
        if (entry.category === 'walled-garden') fetchWalledGarden();
        if (entry.category === 'mikrotik-config' || entry.category === 'branding' || entry.category === 'payment-gateway') {
          fetchCoreData();
        }
        if (entry.category === 'login-design') {
          setPortalConfigLoaded(false);
        }
      } else {
        showToast(`❌ Rollback failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setHistoryRollbacking(null);
    }
  };


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

  const handleAddCustomUrl = async () => {
    if (!wgCustomUrl.trim()) return showToast('Enter a domain');
    await handleAddWalledGarden(wgCustomUrl.trim(), 'custom', wgCustomComment.trim() || wgCustomUrl.trim());
    setWgCustomUrl('');
    setWgCustomComment('');
  };

  // ── Auto Setup Runner with Windows Progress Bar & Network Timeout ──
  const handleRunAutoSetup = async () => {
    if (autoSetupLoading) return;
    setAutoSetupLoading(true);
    setAutoSetupResult(null);

    const startTime = Date.now();
    let timerInterval = null;

    const updateElapsed = () => `${Math.floor((Date.now() - startTime) / 1000)}s elapsed`;

    setAutoSetupProgress({
      active: true,
      percent: 5,
      title: 'Auto Setup Router',
      subtitle: 'Step 1/6: Validating and saving MikroTik connection settings...',
      status: 'normal',
      itemCount: 'Step 1 of 6',
      elapsedText: '0s elapsed',
      canRetry: false,
    });

    timerInterval = setInterval(() => {
      setAutoSetupProgress(prev => {
        if (!prev.active || prev.status === 'success' || prev.status === 'error') return prev;
        const sec = Math.floor((Date.now() - startTime) / 1000);
        const isSlow = sec > 9;
        return {
          ...prev,
          elapsedText: `${sec}s elapsed`,
          status: isSlow && prev.status !== 'error' ? 'warning' : prev.status,
          subtitle: isSlow && prev.status !== 'error' && !prev.subtitle.includes('(Slow network')
            ? `${prev.subtitle} (Slow network detected — waiting for router...)`
            : prev.subtitle,
        };
      });
    }, 1000);

    const abortController = new AbortController();
    autoSetupAbortRef.current = abortController;

    try {
      // Step 1: Save settings
      await saveMikrotik();

      // Step 2: Save hotspot settings
      setAutoSetupProgress(prev => ({
        ...prev,
        percent: 18,
        subtitle: 'Step 2/6: Persisting hotspot sharing and timer configurations...',
        itemCount: 'Step 2 of 6',
        elapsedText: updateElapsed(),
      }));

      await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hotspot_settings', value: hotspotSettings }),
        signal: AbortSignal.timeout(10000),
      });

      // Step 3: Test connection
      setAutoSetupProgress(prev => ({
        ...prev,
        percent: 32,
        subtitle: 'Step 3/6: Testing REST API connection to router...',
        itemCount: 'Step 3 of 6',
        elapsedText: updateElapsed(),
      }));

      const testRes = await fetch('/api/mikrotik/test-connection', {
        headers: adminHeaders(),
        signal: AbortSignal.timeout(12000),
      });
      const testData = await testRes.json();
      setTestResult(testData);

      if (!testData.connected) {
        throw new Error(testData.error || 'Cannot reach router — check IP, port, and credentials');
      }

      // Step 4: Auto-configure everything on the router
      setAutoSetupProgress(prev => ({
        ...prev,
        percent: 48,
        subtitle: 'Step 4/6: Configuring DNS, Hotspot Server, and Bandwidth Profiles...',
        itemCount: 'Step 4 of 6',
        elapsedText: updateElapsed(),
      }));

      const stageTimer1 = setTimeout(() => {
        setAutoSetupProgress(prev => prev.active && prev.status !== 'error' ? {
          ...prev,
          percent: 70,
          subtitle: 'Step 5/6: Whitelisting Core, Banking & Payment Walled Garden domains...',
          itemCount: 'Step 5 of 6',
          elapsedText: updateElapsed(),
        } : prev);
      }, 3500);

      const stageTimer2 = setTimeout(() => {
        setAutoSetupProgress(prev => prev.active && prev.status !== 'error' ? {
          ...prev,
          percent: 88,
          subtitle: 'Step 6/6: Generating and uploading custom captive portal login template...',
          itemCount: 'Step 6 of 6',
          elapsedText: updateElapsed(),
        } : prev);
      }, 7500);

      const res = await fetch('/api/mikrotik/auto-setup', {
        method: 'POST',
        headers: adminHeaders(),
        signal: abortController.signal,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await res.json();
      setAutoSetupResult(data);

      if (!res.ok || data.error) {
        throw new Error(data.details || data.error || 'Auto-setup encountered an error on the router');
      }

      setAutoSetupProgress({
        active: true,
        percent: 100,
        title: 'Auto Setup Completed!',
        subtitle: data.summary || 'All router services configured successfully with zero errors.',
        status: 'success',
        itemCount: `${data.results?.length || 7} Steps Verified`,
        elapsedText: updateElapsed(),
        canRetry: false,
      });

      showToast(data.summary || '✅ Router configured successfully!');
      fetchCoreData();
    } catch (e) {
      const isTimeout = e.name === 'TimeoutError' || e.message?.includes('timeout') || e.message?.includes('abort');
      const errorMsg = isTimeout
        ? 'Connection timed out. Router might be slow, rebooting, or unreachable on the network.'
        : e.message;

      setAutoSetupProgress(prev => ({
        ...prev,
        active: true,
        status: 'error',
        subtitle: `❌ ${errorMsg}`,
        elapsedText: updateElapsed(),
        canRetry: true,
      }));

      showToast(`❌ Setup Error: ${errorMsg}`);
    } finally {
      if (timerInterval) clearInterval(timerInterval);
      setAutoSetupLoading(false);
      autoSetupAbortRef.current = null;
    }
  };

  const handleCancelAutoSetup = () => {
    if (autoSetupAbortRef.current) {
      autoSetupAbortRef.current.abort();
      showToast('Auto-setup cancelled');
    }
  };

  // ── Push Login Page with Windows Progress Bar ──
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

  // Router User Management
  const handleDeleteRouterUser = async (userId, name) => {
    if (actionLockRef.current) return;
    if (!confirm(`Delete router user "${name}"? This removes the voucher from MikroTik.`)) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/mikrotik/hotspot-users', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) { showToast(`Deleted: ${name}`); fetchRouterUsers(); }
      else showToast('Failed to delete');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const handleUpdateRouterUser = async () => {
    if (actionLockRef.current) return;
    if (!editingUser) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const body = { user_id: editingUser };
      if (userEditForm['limit-uptime']) body['limit-uptime'] = userEditForm['limit-uptime'];
      if (userEditForm.profile) body.profile = userEditForm.profile;

      const res = await fetch('/api/mikrotik/hotspot-users', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast('User updated on router!');
        setEditingUser(null);
        fetchRouterUsers();
      } else showToast('Update failed');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  // Hotspot Profile Management
  const handleSaveProfile = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      if (editingProfile) {
        // Update existing
        const res = await fetch('/api/mikrotik/hotspot-profiles', {
          method: 'PATCH',
          headers: adminHeaders(),
          body: JSON.stringify({ profile_id: editingProfile, ...profileForm }),
        });
        if (res.ok) {
          showToast('Profile updated!');
          setEditingProfile(null);
          setProfileForm({ name: '', 'rate-limit': '', 'shared-users': '1', 'session-timeout': '', 'idle-timeout': '', 'keepalive-timeout': '' });
          fetchRouterProfiles();
        } else showToast('Update failed');
      } else {
        // Create new
        if (!profileForm.name) { showToast('Profile name required'); return; }
        const res = await fetch('/api/mikrotik/hotspot-profiles', {
          method: 'PUT',
          headers: adminHeaders(),
          body: JSON.stringify(profileForm),
        });
        if (res.ok) {
          showToast('Profile created on router!');
          setProfileForm({ name: '', 'rate-limit': '', 'shared-users': '1', 'session-timeout': '', 'idle-timeout': '', 'keepalive-timeout': '' });
          fetchRouterProfiles();
        } else showToast('Creation failed');
      }
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const handleDeleteProfile = async (profileId, name) => {
    if (actionLockRef.current) return;
    if (!confirm(`Delete profile "${name}" from the router?`)) return;
    actionLockRef.current = true;
    setActionBusy(true);
    try {
      const res = await fetch('/api/mikrotik/hotspot-profiles', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (res.ok) { showToast('Profile deleted'); fetchRouterProfiles(); }
      else showToast('Delete failed');
    } catch { showToast('Network error'); }
    finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  };

  const startEditProfile = (p) => {
    setEditingProfile(p['.id']);
    setProfileForm({
      name: p.name || '',
      'rate-limit': p['rate-limit'] || '',
      'shared-users': p['shared-users'] || '1',
      'session-timeout': p['session-timeout'] || '',
      'idle-timeout': p['idle-timeout'] || '',
      'keepalive-timeout': p['keepalive-timeout'] || '',
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedPin(code);
    showToast(`Copied: ${code}`);
    setTimeout(() => setCopiedPin(''), 2000);
  };

  const copyAllVouchers = () => {
    const text = generatedVouchers.map(v => v.code).join('\n');
    navigator.clipboard.writeText(text);
    showToast(`Copied ${generatedVouchers.length} codes`);
  };

  // Filtered router users
  const filteredUsers = routerUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
      (u.profile || '').toLowerCase().includes(q) ||
      (u.comment || '').toLowerCase().includes(q);
  });

  const maxDayRevenue = stats.dailySales.reduce((max, d) => Math.max(max, d.revenue), 100);

  // ═══════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════
  if (!authed) {
    return (
      <div className="sa-login-wrap">
        <div className="sa-login-card">
          <div className="sa-login-badge-wrap">
            <div className="sa-login-avatar-ring">
              <ShieldIcon size={28} color="#34A853" />
            </div>
            <span className="sa-badge sa-badge-obsidian">Super Admin Gateway</span>
          </div>
          <h1 className="sa-login-title">African Network</h1>
          <p className="sa-login-sub">MikroTik RouterOS &amp; Hotspot Administration</p>
          {authError && <div className="sa-error-alert">{authError}</div>}
          <form onSubmit={handleLogin} className="sa-login-form">
            <div className="sa-input-group">
              <label>Administrator Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" required />
            </div>
            <div className="sa-input-group">
              <label>Administrator Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" required />
            </div>
            <button type="submit" className="sa-login-submit" disabled={authLoading}>
              {authLoading ? 'Verifying...' : 'Authenticate & Enter'}
            </button>
          </form>
          <div className="sa-login-footer-info">
            <span>Secured with RouterOS REST API &amp; Supabase</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN ADMIN INTERFACE
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="sa-shell">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sa-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sa-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sa-brand-section">
          <div className="sa-brand-icon-box">
            <WifiIcon size={22} color="#FFFFFF" />
          </div>
          {!sidebarCollapsed && (
            <div className="sa-brand-text">
              <span className="sa-brand-name">African Network</span>
              <span className="sa-brand-badge">Super Admin</span>
            </div>
          )}
          <button className="sa-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
              {sidebarCollapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />}
            </svg>
          </button>
        </div>

        <nav className="sa-nav-menu">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} className={`sa-nav-button ${active ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
                <div className="sa-nav-icon-wrap">
                  <Icon size={18} color={active ? '#34A853' : '#8E8E93'} />
                </div>
                <span className="sa-nav-label">{tab.label}</span>
                {tab.id === 'sessions' && sessions.length > 0 && (
                  <span className="sa-nav-pill-count">{sessions.length}</span>
                )}
                {tab.id === 'router-users' && routerUsers.length > 0 && (
                  <span className="sa-nav-pill-count">{routerUsers.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sa-sidebar-bottom">
          <div className="sa-router-pill-status">
            <span className={`sa-status-dot ${testResult?.connected ? 'online' : 'offline'}`} />
            <span className="sa-router-pill-text">
              {testResult?.connected ? 'RouterOS Online' : 'Router Offline'}
            </span>
          </div>
          <button className="sa-logout-button" onClick={handleLogout}>
            <LogOutIcon size={18} color="#EF4444" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="sa-main-content">
        <header className="sa-header-bar">
          <div className="sa-header-left">
            <button className="sa-mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#121217" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1 className="sa-page-title">{TABS.find(t => t.id === activeTab)?.label}</h1>
            <p className="sa-page-subtitle">Real-time Hotspot &amp; Network Analytics</p>
          </div>
          <div className="sa-header-right">
            <button className="sa-action-btn sa-btn-outline" onClick={toggleMode} title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <span>{isDark ? '🌙 Dark' : '☀️ Light'}</span>
            </button>
            <button className="sa-action-btn sa-btn-outline" onClick={() => router.push('/')} title="User App">
              <WifiIcon size={16} color="#121217" /><span>User App</span>
            </button>
            <button className="sa-action-btn sa-btn-refresh" onClick={fetchCoreData} disabled={loading}>
              <RefreshIcon size={16} color="#34A853" /><span>{loading ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <div className="sa-admin-avatar-pill">
              <span className="sa-admin-avatar">A</span>
              <span className="sa-admin-name">Admin</span>
            </div>
          </div>
        </header>

        {/* ═══ TAB: DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            formatPrice={formatPrice}
            routerUsers={routerUsers}
            maxDayRevenue={maxDayRevenue}
            plans={plans}
            setActiveTab={setActiveTab}
            sessions={sessions}
            formatBytes={formatBytes}
            kickUser={kickUser}
            handleTestMikrotik={handleTestMikrotik}
            testLoading={testLoading}
            testResult={testResult}
            mikrotikForm={mikrotikForm}
            flutterwaveForm={flutterwaveForm}
            copyCode={copyCode}
            copiedPin={copiedPin}
          />
        )}

        {/* ═══ TAB: FINANCE ═══ */}
        {activeTab === 'finance' && (
          <div className="sa-tab-body">
            <FinanceTab adminHeaders={adminHeaders} formatPrice={formatPrice} showToast={showToast} />
          </div>
        )}

        {/* ═══ TAB: LIVE SESSIONS ═══ */}
        {activeTab === 'sessions' && (
          <LiveSessionsTab
            sessions={sessions}
            formatBytes={formatBytes}
            kickUser={kickUser}
          />
        )}

        {/* ═══ TAB: VOUCHER FACTORY ═══ */}
        {activeTab === 'vouchers' && (
          <VoucherFactoryTab
            plans={plans}
            formatPrice={formatPrice}
            adminHeaders={adminHeaders}
            showToast={showToast}
            mikrotikForm={mikrotikForm}
            brandingForm={brandingForm}
            fetchCoreData={fetchCoreData}
          />
        )}

        {/* ═══ TAB: FALLBACK VOUCHER POOL ═══ */}
        {activeTab === 'fallback-vouchers' && (
          <FallbackVouchersTab
            adminHeaders={adminHeaders}
            showToast={showToast}
            plans={plans}
          />
        )}

        {/* ═══ TAB: ROUTER USERS ═══ */}
        {activeTab === 'router-users' && (
          <RouterUsersTab
            routerUsers={routerUsers}
            routerUsersLoading={routerUsersLoading}
            fetchRouterUsers={fetchRouterUsers}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            userEditForm={userEditForm}
            setUserEditForm={setUserEditForm}
            handleUpdateRouterUser={handleUpdateRouterUser}
            handleDeleteRouterUser={handleDeleteRouterUser}
            filteredUsers={filteredUsers}
          />
        )}

        {/* ═══ TAB: HOTSPOT PROFILES ═══ */}
        {activeTab === 'profiles' && (
          <HotspotProfilesTab
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            handleSaveProfile={handleSaveProfile}
            fetchRouterProfiles={fetchRouterProfiles}
            profilesLoading={profilesLoading}
            routerProfiles={routerProfiles}
            startEditProfile={startEditProfile}
            handleDeleteProfile={handleDeleteProfile}
          />
        )}

        {/* ═══ TAB: INTERNET PLANS ═══ */}
        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            editingPlan={editingPlan}
            setEditingPlan={setEditingPlan}
            planForm={planForm}
            setPlanForm={setPlanForm}
            savePlan={savePlan}
            startEditPlan={startEditPlan}
            deletePlan={deletePlan}
            formatPrice={formatPrice}
          />
        )}

        {/* ═══ TAB: NETWORK HEALTH ═══ */}
        {activeTab === 'network' && (
          <NetworkHealthTab
            networkData={networkData}
            fetchNetworkHealth={fetchNetworkHealth}
            networkLoading={networkLoading}
            formatBytes={formatBytes}
          />
        )}

        {/* ═══ TAB: WALLED GARDEN ═══ */}
        {activeTab === 'walled-garden' && (
          <WalledGardenTab
            adminHeaders={adminHeaders}
            showToast={showToast}
            walledGardenEntries={walledGardenEntries}
            fetchWalledGarden={fetchWalledGarden}
            wgLoading={wgLoading}
            brandingForm={brandingForm}
          />
        )}

        {/* ═══ TAB: MIKROTIK CONFIG ═══ */}
        {activeTab === 'mikrotik' && (
          <MikroTikConfigTab
            mikrotikForm={mikrotikForm}
            setMikrotikForm={setMikrotikForm}
            saveMikrotik={saveMikrotik}
            handleTestMikrotik={handleTestMikrotik}
            testLoading={testLoading}
            testResult={testResult}
            setTestResult={setTestResult}
            hotspotSettings={hotspotSettings}
            setHotspotSettings={setHotspotSettings}
            pollingConfig={pollingConfig}
            syncingHotspot={syncingHotspot}
            handleSyncHotspot={handleSyncHotspot}
            adminHeaders={adminHeaders}
            showToast={showToast}
            handleRestartMikrotik={handleRestartMikrotik}
            rebootLoading={rebootLoading}
            handleRestoreDefaults={handleRestoreDefaults}
            restoreLoading={restoreLoading}
            restoreResult={restoreResult}
            handleRunAutoSetup={handleRunAutoSetup}
            handleCancelAutoSetup={handleCancelAutoSetup}
            autoSetupLoading={autoSetupLoading}
            autoSetupProgress={autoSetupProgress}
            setAutoSetupProgress={setAutoSetupProgress}
            autoSetupResult={autoSetupResult}
            portalConfig={portalConfig}
            brandingForm={brandingForm}
            portalPushProgress={portalPushProgress}
            setPortalPushProgress={setPortalPushProgress}
            handlePushLoginPageWithProgress={handlePushLoginPageWithProgress}
            portalPushing={portalPushing}
          />
        )}

        {/* ═══ TAB: BRANDING & THEME ═══ */}
        {activeTab === 'branding' && (
          <BrandingTab
            brandingForm={brandingForm}
            setBrandingForm={setBrandingForm}
            adminHeaders={adminHeaders}
            showToast={showToast}
          />
        )}

        {/* ═══ TAB: LOGIN DESIGN (PORTAL TEMPLATES) ═══ */}
        {activeTab === 'login-design' && (
          <LoginDesignTab
            mikrotikForm={mikrotikForm}
            brandingForm={brandingForm}
            adminHeaders={adminHeaders}
            showToast={showToast}
            fetchChangeHistory={fetchChangeHistory}
          />
        )}

        {/* ═══ TAB: PAYMENT GATEWAY ═══ */}
        {activeTab === 'payments' && (
          <PaymentGatewayTab
            activeGateway={activeGateway}
            setActiveGateway={setActiveGateway}
            saveActiveGateway={saveActiveGateway}
            flutterwaveForm={flutterwaveForm}
            setFlutterwaveForm={setFlutterwaveForm}
            saveFlutterwave={saveFlutterwave}
            monnifyForm={monnifyForm}
            setMonnifyForm={setMonnifyForm}
            saveMonnify={saveMonnify}
            webhookCopied={webhookCopied}
            setWebhookCopied={setWebhookCopied}
            showToast={showToast}
          />
        )}

        {/* ═══ TAB: CHANGE HISTORY & ROLLBACK ═══ */}
        {activeTab === 'history' && (
          <ChangeHistoryTab
            fetchChangeHistory={fetchChangeHistory}
            historyLoading={historyLoading}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            changeHistory={changeHistory}
            expandedHistoryId={expandedHistoryId}
            setExpandedHistoryId={setExpandedHistoryId}
            handleRollback={handleRollback}
            historyRollbacking={historyRollbacking}
          />
        )}

        {/* ═══ TAB: LOCATIONS & FLEET ═══ */}
        {activeTab === 'locations' && (
          <LocationsTab adminHeaders={adminHeaders} showToast={showToast} />
        )}

        {/* ═══ TAB: SUPPORT TICKETS (Feature 4.3) ═══ */}
        {activeTab === 'tickets' && (
          <TicketsTab authHeaders={adminHeaders} />
        )}

        {/* ═══ TAB: RESELLERS & AGENTS (Feature 4.1) ═══ */}
        {activeTab === 'resellers' && (
          <ResellersTab authHeaders={adminHeaders} />
        )}

        {/* ═══ TAB: ADVANCED ANALYTICS (Feature 4.5) ═══ */}
        {activeTab === 'analytics' && (
          <AnalyticsTab authHeaders={adminHeaders} />
        )}

        {/* ═══ TAB: SAAS TENANTS (Feature 5.5) ═══ */}
        {activeTab === 'tenants' && (
          <TenantsTab authHeaders={adminHeaders} />
        )}

        {/* ═══ TAB: DATABASE & SCHEMA ═══ */}
        {activeTab === 'database' && (
          <DatabaseSchemaTab adminHeaders={adminHeaders} showToast={showToast} />
        )}
      </main>


      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

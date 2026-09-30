'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import {
  ChevronLeftIcon,
  WifiIcon,
  ShieldIcon,
  WalletIcon,
  PrinterIcon,
  DownloadIcon,
  RefreshIcon,
  ArrowUpRightIcon,
  CheckIcon
} from '../components/Icons';

export default function ResellerDashboardPage() {
  const router = useRouter();
  const { user, profile, wallet, refreshWallet, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState('');

  // Commissions & stats
  const [commissionsData, setCommissionsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Latest generated batch
  const [batchResult, setBatchResult] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const formatPrice = (amount) =>
    '₦' +
    Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Guard: if not authenticated or not a reseller, redirect
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
  }, [user, authLoading, router]);

  // Fetch plans & commission data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const [plansRes, comRes] = await Promise.all([
        fetch('/api/super-admin/plans'),
        fetch(`/api/reseller/commissions?userId=${user.id}`).catch(() => null)
      ]);

      if (plansRes.ok) {
        const pData = await plansRes.json();
        setPlans(pData || []);
        if (pData.length > 0 && !selectedPlanId) {
          setSelectedPlanId(pData[0].id);
        }
      }

      if (comRes && comRes.ok) {
        const cData = await comRes.json();
        setCommissionsData(cData);
      }
    } catch (err) {
      console.error('Error fetching reseller dashboard data:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [user, selectedPlanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const discountPercent = profile?.reseller_discount ? Number(profile.reseller_discount) : 15;
  const isResellerOrAdmin = profile?.role === 'reseller' || profile?.role === 'admin';

  // Selected plan pricing math
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const retailUnitPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const wholesaleUnitPrice = Math.round(retailUnitPrice * (1 - discountPercent / 100));
  const totalWholesaleCost = wholesaleUnitPrice * quantity;
  const totalRetailValue = retailUnitPrice * quantity;
  const totalProfitMargin = totalRetailValue - totalWholesaleCost;

  const handleBulkPurchase = async () => {
    if (!selectedPlanId || quantity < 1) {
      showToast('Please select a plan and quantity');
      return;
    }

    const currentWallet = wallet ? Number(wallet.balance) : 0;
    if (currentWallet < totalWholesaleCost) {
      showToast(`Insufficient balance. You need ${formatPrice(totalWholesaleCost)} in your wallet.`);
      return;
    }

    setPurchasing(true);
    try {
      const res = await fetch('/api/reseller/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId: selectedPlanId,
          quantity: Number(quantity)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to purchase wholesale vouchers');
      }

      setBatchResult(data);
      refreshWallet();
      fetchData();
      showToast(`🎉 Successfully generated ${data.quantity} vouchers!`);
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const handlePrintBatch = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!batchResult?.vouchers) return;
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Voucher Code,Plan,Status\n' +
      batchResult.vouchers.map(v => `"${v.code}","${v.plan_name}","ACTIVE"`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vouchers_batch_${batchResult.batch_id || Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const currentBalance = wallet ? parseFloat(wallet.balance) : 0;

  return (
    <div className="app-shell" style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Screen Topbar */}
      <div className="screen-topbar">
        <Link href="/" className="circle-icon-btn" aria-label="Back to home">
          <ChevronLeftIcon size={20} color="var(--text-primary, #fff)" />
        </Link>
        <h1 className="screen-title">Reseller Portal</h1>
        <button
          onClick={fetchData}
          className="circle-icon-btn"
          aria-label="Refresh data"
          style={{ background: 'transparent' }}
        >
          <RefreshIcon size={18} color="var(--text-primary, #fff)" />
        </button>
      </div>

      {/* Agent Identification Card */}
      <div style={{
        marginTop: '16px',
        padding: '20px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(168, 85, 247, 0.12))',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                {profile?.full_name || user?.email}
              </h2>
              <span style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ✓ {isResellerOrAdmin ? 'Authorized Agent' : 'Standard Account'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0' }}>
              Wholesale Tier: <strong style={{ color: '#3b82f6' }}>{discountPercent}% Wholesale Margin</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agent Wallet</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
              {formatPrice(currentBalance)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/wallet"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              background: '#3b82f6',
              color: '#fff',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            + Top Up Wallet
          </Link>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                const link = `${window.location.origin}/auth?ref=${profile?.referral_code || ''}`;
                navigator.clipboard.writeText(link);
                showToast('Referral link copied!');
              }
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔗 Copy Referral Link
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{
        marginTop: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px'
      }}>
        <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Vouchers Sold</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {commissionsData?.summary?.total_vouchers_sold || 0}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wholesale Profit</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {formatPrice(commissionsData?.summary?.total_commissions_earned || 0)}
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--card-bg, #1a1b23)', border: '1px solid var(--border-color, #2d3139)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Commission Payout</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>
            {formatPrice(commissionsData?.summary?.pending_payout || 0)}
          </div>
        </div>
      </div>

      {/* Bulk Voucher Generator Panel */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        borderRadius: '20px',
        background: 'var(--card-bg, #1a1b23)',
        border: '1px solid var(--border-color, #2d3139)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#fff' }}>
              Wholesale Bulk Generator
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Generate PIN batches with automatic wholesale margin deducted from wallet
            </p>
          </div>
          <div style={{
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {discountPercent}% Wholesale Rate
          </div>
        </div>

        {/* Plan Select */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Select Wi-Fi Pass Tier
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color, #2d3139)',
              color: '#fff',
              fontSize: '13px'
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — Retail {formatPrice(p.price)} ({p.duration})
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Select */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Batch Quantity (Vouchers to Generate)
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[5, 10, 25, 50].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuantity(q)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid ' + (quantity === q ? '#3b82f6' : 'var(--border-color, #2d3139)'),
                  background: quantity === q ? '#3b82f6' : 'transparent',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {q} Passes
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, 100)))}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color, #2d3139)',
              color: '#fff',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Live Calculation Preview Card */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Retail Customer Value:</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{formatPrice(totalRetailValue)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Wholesale Unit Price ({discountPercent}% off):</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{formatPrice(wholesaleUnitPrice)} / pass</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontWeight: 700, color: '#fff' }}>Your Cost (Deducted from Wallet):</span>
            <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '15px' }}>{formatPrice(totalWholesaleCost)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Your Guaranteed Profit:</span>
            <span style={{ color: '#10b981', fontWeight: 800 }}>+{formatPrice(totalProfitMargin)}</span>
          </div>
        </div>

        <button
          onClick={handleBulkPurchase}
          disabled={purchasing || plans.length === 0}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {purchasing ? 'Generating Vouchers...' : `Purchase ${quantity} Vouchers for ${formatPrice(totalWholesaleCost)} →`}
        </button>
      </div>

      {/* Latest Batch Result Modal & Printable Slips */}
      {batchResult && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          borderRadius: '20px',
          background: 'var(--card-bg, #1a1b23)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', margin: 0 }}>
                ✓ Generated Batch: {batchResult.quantity} Vouchers
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Batch ID: {batchResult.batch_id} • Profit pocketed: +{formatPrice(batchResult.total_saved)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePrintBatch}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Print Slips
              </button>
              <button
                onClick={handleExportCsv}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color, #2d3139)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📥 CSV
              </button>
            </div>
          </div>

          {/* Printable Voucher Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '8px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px'
          }}>
            {batchResult.vouchers.map((v, i) => (
              <div
                key={v.id || i}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--card-bg, #1a1b23)',
                  border: '1px dashed rgba(59, 130, 246, 0.4)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {v.plan_name}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#10b981',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  margin: '4px 0'
                }}>
                  {v.code}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  SSID: AfricanNetwork-Hotspot
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

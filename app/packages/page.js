'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import CheckoutModal from '../components/CheckoutModal';
import RoamingBanner from '../components/RoamingBanner';
import {
  ChevronLeftIcon,
  ShieldIcon,
  WifiIcon,
  ArrowUpRightIcon,
  CheckIcon,
} from '../components/Icons';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Passes' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'unlimited', label: 'Unlimited' },
];

export default function PackagesPage() {
  const router = useRouter();
  const { user, refreshWallet } = useAuth();

  const [plans, setPlans] = useState([]);
  const [schedulerRules, setSchedulerRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState('');

  const formatPrice = (amount) =>
    '₦' +
    Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getPlanPricing = (plan) => {
    if (!schedulerRules || schedulerRules.length === 0) {
      return { price: plan.price, isDiscounted: false, originalPrice: plan.price, badge: null };
    }
    const topRule = [...schedulerRules].sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))[0];
    const discount = topRule.discount_percent || 0;
    const effective = Math.round(plan.price * (1 - discount / 100));
    return {
      price: effective,
      isDiscounted: discount > 0,
      originalPrice: plan.price,
      badge: topRule.badge
    };
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [plansRes, schedRes] = await Promise.all([
          fetch('/api/super-admin/plans'),
          fetch('/api/settings/scheduler').catch(() => null)
        ]);
        if (plansRes.ok) {
          const data = await plansRes.json();
          setPlans(data);
        }
        if (schedRes && schedRes.ok) {
          const sData = await schedRes.json();
          if (sData.active_rules) {
            setSchedulerRules(sData.active_rules);
          }
        }
      } catch (err) {
        console.error('Error loading plans or scheduler:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  // Filter plans based on active capsule filter
  const filteredPlans = useMemo(() => {
    if (activeFilter === 'all') return plans;
    if (activeFilter === 'hourly') {
      return plans.filter((p) => {
        const d = (p.duration || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        return d.includes('hour') || n.includes('hour') || d.includes('hr');
      });
    }
    if (activeFilter === 'daily') {
      return plans.filter((p) => {
        const d = (p.duration || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        return d.includes('day') || n.includes('day') || d.includes('24h');
      });
    }
    if (activeFilter === 'unlimited') {
      return plans.filter((p) => {
        const s = (p.speed || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        return s.includes('unlimited') || n.includes('unlimited') || p.popular;
      });
    }
    return plans;
  }, [plans, activeFilter]);

  // Find a flagship / popular plan for the top hero banner
  const featuredPlan = useMemo(() => {
    return plans.find((p) => p.popular) || plans[0] || null;
  }, [plans]);

  return (
    <div className="app-shell">
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        plan={selectedPlan}
        onSuccess={() => {
          if (user) refreshWallet();
          showToast('Pass voucher activated!');
        }}
      />

      {/* Screen Topbar */}
      <div className="screen-topbar">
        <button
          className="circle-icon-btn"
          onClick={() => router.push('/')}
          aria-label="Back to home"
        >
          <ChevronLeftIcon size={20} color="#121217" />
        </button>

        <h1 className="screen-title">Wi-Fi Passes</h1>

        <div style={{ width: '40px' }} />
      </div>

      <RoamingBanner onVoucherResumed={() => router.push('/status')} />

      {/* Featured Flagship Pass Hero */}
      {featuredPlan && (
        <div className="packages-hero-card">
          <div className="packages-hero-tag">
            <span>⚡ Most Popular Choice</span>
          </div>

          <h2 className="packages-hero-title">{featuredPlan.name}</h2>
          <p className="packages-hero-sub">
            {featuredPlan.speed || 'High-Speed 12 Mbps'} • {featuredPlan.devices || 1} Device{(featuredPlan.devices || 1) > 1 ? 's' : ''} • {featuredPlan.duration}
          </p>

          <div className="packages-hero-bottom">
            <div className="packages-hero-price">
              {formatPrice(featuredPlan.price)}
            </div>

            <button
              className="packages-hero-btn"
              onClick={() => handleSelectPlan(featuredPlan)}
            >
              + Buy Pass Now
            </button>
          </div>
        </div>
      )}

      {/* Category Segmented Capsule Filter */}
      <div className="packages-filter-wrap">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            className={`packages-filter-pill ${activeFilter === cat.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Passes Grid */}
      {loading ? (
        <div className="pass-card-modern" style={{ textAlign: 'center', padding: '36px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Loading live router passes...
          </p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="pass-card-modern" style={{ textAlign: 'center', padding: '36px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            No passes found in this category.
          </p>
        </div>
      ) : (
        <div className="pass-grid-list">
          {filteredPlans.map((plan) => {
            const pricing = getPlanPricing(plan);
            const planToBuy = pricing.isDiscounted ? { ...plan, price: pricing.price } : plan;
            return (
              <div
                key={plan.id}
                className="pass-card-modern"
                onClick={() => handleSelectPlan(planToBuy)}
              >
                <div className="pass-card-top">
                  <div className="pass-badge-group">
                    <div className="pass-wifi-icon-badge">
                      <WifiIcon size={20} color="#7257FF" />
                    </div>
                    <span className={`pass-tag-pill ${plan.popular ? 'popular' : ''}`}>
                      {plan.duration}
                    </span>
                    {pricing.badge && (
                      <span className="pass-tag-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        {pricing.badge}
                      </span>
                    )}
                  </div>

                  {pricing.isDiscounted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                        {formatPrice(pricing.originalPrice)}
                      </span>
                      <div className="pass-price-large" style={{ color: '#10B981' }}>
                        {formatPrice(pricing.price)}
                      </div>
                    </div>
                  ) : (
                    <div className="pass-price-large">{formatPrice(plan.price)}</div>
                  )}
                </div>

                <div className="pass-card-mid">
                  <h3 className="pass-card-title">{plan.name}</h3>
                  <p className="pass-card-specs">
                    {plan.speed || 'Unlimited Bandwidth'} • {plan.devices || 1} Device{(plan.devices || 1) > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="pass-card-bottom">
                  <div className="pass-instant-tag">
                    <CheckIcon size={14} color="#10B981" />
                    <span>Instant MikroTik Pin</span>
                  </div>

                  <button
                    type="button"
                    className="pass-buy-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(planToBuy);
                    }}
                  >
                    <span>Select</span>
                    <ArrowUpRightIcon size={14} color="#FFFFFF" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

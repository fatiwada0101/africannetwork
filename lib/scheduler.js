/**
 * Bandwidth & Pricing Scheduler Engine (Phase 4.2)
 * Manages time-based dynamic pricing (Happy Hour, off-peak, weekend boosts)
 * Timezone: West Africa Time (WAT, UTC+1 / Nigeria)
 */

export const DEFAULT_SCHEDULER_RULES = [
  {
    id: 'happy_hour',
    name: 'Happy Hour Special',
    enabled: true,
    discount_percent: 20,
    start_hour: 20, // 8 PM WAT
    end_hour: 23,   // 11 PM WAT
    days: [1, 2, 3, 4, 5], // Monday - Friday
    badge: '⚡ Happy Hour (20% OFF)',
    speed_boost_mbps: 0
  },
  {
    id: 'weekend_booster',
    name: 'Weekend Data Booster',
    enabled: true,
    discount_percent: 15,
    start_hour: 0,
    end_hour: 24,
    days: [0, 6], // Saturday & Sunday
    badge: '🎉 Weekend Special (15% OFF)',
    speed_boost_mbps: 5
  },
  {
    id: 'night_owl',
    name: 'Night Owl Special',
    enabled: true,
    discount_percent: 30,
    start_hour: 0, // 12 AM WAT
    end_hour: 5,   // 5 AM WAT
    days: [0, 1, 2, 3, 4, 5, 6],
    badge: '🌙 Night Owl (30% OFF)',
    speed_boost_mbps: 10
  }
];

/**
 * Get current Nigerian time (WAT = UTC+1)
 */
export function getWatDate(baseDate = new Date()) {
  const utc = baseDate.getTime() + (baseDate.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 1)); // UTC+1
}

/**
 * Check whether a scheduler rule is currently active
 */
export function isRuleActive(rule, date = new Date()) {
  if (!rule || !rule.enabled) return false;
  
  const watDate = getWatDate(date);
  const day = watDate.getDay();
  const hour = watDate.getHours();

  if (Array.isArray(rule.days) && !rule.days.includes(day)) {
    return false;
  }

  if (rule.start_hour <= rule.end_hour) {
    return hour >= rule.start_hour && hour < rule.end_hour;
  } else {
    // Overnight window (e.g. 22:00 to 04:00)
    return hour >= rule.start_hour || hour < rule.end_hour;
  }
}

/**
 * Return all currently active rules
 */
export function getActiveRules(rules = DEFAULT_SCHEDULER_RULES, date = new Date()) {
  const list = Array.isArray(rules) ? rules : DEFAULT_SCHEDULER_RULES;
  return list.filter(r => isRuleActive(r, date));
}

/**
 * Apply highest active discount to a plan
 */
export function applyScheduledPricing(plan, rules = DEFAULT_SCHEDULER_RULES, date = new Date()) {
  if (!plan || typeof plan.price !== 'number') return plan;

  const activeRules = getActiveRules(rules, date);
  if (activeRules.length === 0) {
    return {
      ...plan,
      original_price: plan.price,
      effective_price: plan.price,
      is_discounted: false,
      active_rule: null
    };
  }

  // Sort by highest discount
  const topRule = [...activeRules].sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))[0];
  const discountPercent = Math.min(topRule.discount_percent || 0, 90);
  const effectivePrice = Math.max(0, Math.round(plan.price * (1 - discountPercent / 100)));

  return {
    ...plan,
    original_price: plan.price,
    effective_price: effectivePrice,
    discount_percent: discountPercent,
    is_discounted: discountPercent > 0,
    active_rule: {
      id: topRule.id,
      name: topRule.name,
      badge: topRule.badge,
      speed_boost_mbps: topRule.speed_boost_mbps || 0
    }
  };
}

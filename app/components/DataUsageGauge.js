'use client';

import { ZapIcon, ArrowDownLeftIcon, ArrowUpRightIcon, ShieldIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

export default function DataUsageGauge({
  totalDataFormatted = '0 MB',
  downloadFormatted = '0 MB',
  uploadFormatted = '0 MB',
  bytesLimitFormatted = 'Unlimited',
  percentDataUsed = null,
  isDataLow = false,
  isConnected = false,
}) {
  const { t } = useLanguage();
  const isCapped = percentDataUsed !== null && percentDataUsed !== undefined;

  return (
    <div
      style={{
        background: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border, #E5E7EB)',
        borderRadius: '16px',
        padding: '16px 20px',
        margin: '16px 0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>📊</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary, #121217)' }}>
            {t('data_used')}
          </span>
        </div>

        {isDataLow ? (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '999px',
              background: '#FEE2E2',
              color: '#B91C1C',
            }}
          >
            ⚠️ 80%+ Used
          </span>
        ) : isCapped ? (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(114, 87, 255, 0.1)',
              color: '#34A853',
            }}
          >
            {percentDataUsed}% used
          </span>
        ) : (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
            }}
          >
            ⚡ {t('unlimited')}
          </span>
        )}
      </div>

      {/* Primary Consumption Metric */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #121217)' }}>
          {totalDataFormatted}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary, #71717a)' }}>
          {isCapped ? `of ${bytesLimitFormatted} cap` : 'consumed'}
        </span>
      </div>

      {/* Progress Bar (if capped) */}
      {isCapped && (
        <div
          style={{
            height: '8px',
            background: 'var(--bg, #F3F4F6)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(3, percentDataUsed))}%`,
              background: isDataLow
                ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                : 'linear-gradient(90deg, #34A853 0%, #10B981 100%)',
              borderRadius: '999px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      )}

      {/* Breakdown: Download vs Upload */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle, #F3F4F6)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary, #6B7280)' }}>
          <ArrowDownLeftIcon size={13} color="#10B981" />
          <span>↓ Download:</span>
          <strong style={{ color: 'var(--text-primary, #121217)' }}>{downloadFormatted}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary, #6B7280)' }}>
          <ArrowUpRightIcon size={13} color="#34A853" />
          <span>↑ Upload:</span>
          <strong style={{ color: 'var(--text-primary, #121217)' }}>{uploadFormatted}</strong>
        </div>
      </div>
    </div>
  );
}

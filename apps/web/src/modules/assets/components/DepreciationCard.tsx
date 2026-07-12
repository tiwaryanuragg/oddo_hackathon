import React from 'react';
import { TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import type { DepreciationInfo } from '../api/assets.api';

interface DepreciationCardProps {
  data?:    DepreciationInfo;
  loading:  boolean;
}

function fmt(n: number | null, dec = 0): string {
  if (n === null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCurrency(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function DepreciationCard({ data, loading }: DepreciationCardProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!data) return null;

  const percent = data.depreciationPercent ?? 0;
  const isFullyDep = data.isFullyDepreciated;

  const barColor = isFullyDep
    ? 'var(--color-danger)'
    : percent > 75
    ? 'var(--color-warning)'
    : 'var(--color-success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Fully deprecated warning */}
      {isFullyDep && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 500 }}>
            This asset is fully depreciated — book value is ₹0
          </span>
        </div>
      )}

      {/* Key metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <MetricBox
          label="Purchase Cost"
          value={fmtCurrency(data.purchaseCost)}
          icon={<TrendingDown size={16} />}
          color="var(--color-accent)"
        />
        <MetricBox
          label="Current Book Value"
          value={fmtCurrency(data.currentBookValue)}
          icon={isFullyDep ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          color={isFullyDep ? 'var(--color-danger)' : 'var(--color-success)'}
        />
        <MetricBox
          label="Total Depreciation"
          value={fmtCurrency(data.totalDepreciation)}
          icon={<TrendingDown size={16} />}
          color="var(--color-warning)"
        />
        <MetricBox
          label="Remaining Life"
          value={data.remainingLifeMonths !== null ? `${fmt(data.remainingLifeMonths, 1)} mo` : '—'}
          icon={<Clock size={16} />}
          color="var(--color-info)"
        />
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Depreciation Progress
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: barColor }}>
            {fmt(percent, 1)}%
          </span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-bg-elevated)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(percent, 100)}%`,
              borderRadius: 'var(--radius-full)',
              background: barColor,
              transition: 'width 0.8s ease',
              boxShadow: `0 0 8px ${barColor}60`,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Purchase Date'}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            End of Life ({data.usefulLifeMonths} months)
          </span>
        </div>
      </div>

      {/* Annual rate */}
      <div
        style={{
          padding: 'var(--space-4)',
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Annual Depreciation Rate (Straight-Line)
        </span>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {fmt(data.annualDepreciationRate, 1)}%
        </span>
      </div>
    </div>
  );
}

function MetricBox({
  label, value, icon, color,
}: {
  label: string; value: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div
      style={{
        padding: 'var(--space-4)',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

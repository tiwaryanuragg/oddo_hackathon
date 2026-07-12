import React from 'react';
import { AssetStatus, AssetCondition } from '@assetflow/shared';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'muted';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: React.CSSProperties;
}

const variantMap: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  border: 'rgba(16, 185, 129, 0.25)' },
  warning: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  border: 'rgba(245, 158, 11, 0.25)' },
  danger:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   border: 'rgba(239, 68, 68, 0.25)'  },
  info:    { bg: 'var(--color-info-bg)',     color: 'var(--color-info)',     border: 'rgba(6, 182, 212, 0.25)'  },
  purple:  { bg: 'var(--color-purple-bg)',   color: 'var(--color-purple)',   border: 'rgba(139, 92, 246, 0.25)' },
  default: { bg: 'var(--color-accent-light)',color: 'var(--color-accent)',   border: 'rgba(59, 130, 246, 0.25)' },
  muted:   { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
};

export function Badge({ children, variant = 'default', size = 'sm', dot = false, style }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: v.color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

// ─── Semantic status badges ────────────────────────────────────────────────

const STATUS_BADGE_MAP: Record<AssetStatus, { label: string; variant: BadgeVariant }> = {
  [AssetStatus.DRAFT]:          { label: 'Draft',         variant: 'muted'   },
  [AssetStatus.AVAILABLE]:      { label: 'Available',     variant: 'success' },
  [AssetStatus.RESERVED]:       { label: 'Reserved',      variant: 'info'    },
  [AssetStatus.ALLOCATED]:      { label: 'Allocated',     variant: 'default' },
  [AssetStatus.IN_MAINTENANCE]: { label: 'Maintenance',   variant: 'warning' },
  [AssetStatus.UNDER_AUDIT]:    { label: 'Under Audit',   variant: 'purple'  },
  [AssetStatus.RETIRED]:        { label: 'Retired',       variant: 'danger'  },
  [AssetStatus.LOST]:           { label: 'Lost',          variant: 'danger'  },
};

const CONDITION_BADGE_MAP: Record<AssetCondition, { label: string; variant: BadgeVariant }> = {
  [AssetCondition.NEW]:     { label: 'New',     variant: 'success' },
  [AssetCondition.GOOD]:    { label: 'Good',    variant: 'info'    },
  [AssetCondition.FAIR]:    { label: 'Fair',    variant: 'warning' },
  [AssetCondition.POOR]:    { label: 'Poor',    variant: 'danger'  },
  [AssetCondition.DAMAGED]: { label: 'Damaged', variant: 'danger'  },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const { label, variant } = STATUS_BADGE_MAP[status] ?? { label: status, variant: 'muted' };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  const { label, variant } = CONDITION_BADGE_MAP[condition] ?? { label: condition, variant: 'muted' };
  return <Badge variant={variant}>{label}</Badge>;
}

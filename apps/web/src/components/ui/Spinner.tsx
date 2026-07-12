import React from 'react';

// ─── Spinner ──────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 20, color = 'var(--color-accent)' }: SpinnerProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
      aria-label="Loading"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?:  string | number;
  height?: string | number;
  borderRadius?: string;
  style?:  React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 'var(--radius-sm)',
        background: 'linear-gradient(90deg, var(--color-bg-elevated) 25%, var(--color-bg-overlay) 50%, var(--color-bg-elevated) 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style,
      }}
    />
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ borderBottom: '1px solid var(--color-border)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: '14px 16px' }}>
              <Skeleton height={14} width={c === 0 ? '60%' : c === cols - 1 ? '40%' : '80%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Card Skeleton ────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
      }}
    >
      <Skeleton height={18} width="60%" />
      <Skeleton height={12} width="40%" />
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={12} />
        <Skeleton height={12} width="85%" />
        <Skeleton height={12} width="70%" />
      </div>
    </div>
  );
}

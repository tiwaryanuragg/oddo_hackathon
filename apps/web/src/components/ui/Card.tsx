import React from 'react';

interface CardProps {
  children:    React.ReactNode;
  title?:      string;
  subtitle?:   string;
  headerRight?: React.ReactNode;
  footer?:     React.ReactNode;
  padding?:    boolean;
  hoverable?:  boolean;
  style?:      React.CSSProperties;
  className?:  string;
}

export function Card({
  children, title, subtitle, headerRight, footer,
  padding = true, hoverable = false, style,
}: CardProps) {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: hoverable ? 'border-color var(--transition-fast), box-shadow var(--transition-fast)' : undefined,
        ...style,
      }}
      onMouseEnter={hoverable ? (e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      } : undefined}
    >
      {(title || headerRight) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            {title && (
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </div>
      )}

      <div style={padding ? { padding: 'var(--space-6)' } : undefined}>
        {children}
      </div>

      {footer && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  label:    string;
  value:    React.ReactNode;
  icon?:    React.ReactNode;
  delta?:   { value: string; positive: boolean };
  color?:   string;
  style?:   React.CSSProperties;
}

export function StatCard({ label, value, icon, delta, color = 'var(--color-accent)', style }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Subtle glow */}
      <div
        style={{
          position: 'absolute', top: 0, right: 0,
          width: 100, height: 100,
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${color}18`,
              borderRadius: 'var(--radius-md)',
              color,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      {delta && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            color: delta.positive ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {delta.positive ? '↑' : '↓'} {delta.value}
        </span>
      )}
    </div>
  );
}

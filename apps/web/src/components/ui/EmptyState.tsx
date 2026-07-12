import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      { label: string; onClick: () => void; icon?: React.ReactNode };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease both',
      }}
    >
      {icon && (
        <div
          style={{
            width: 72, height: 72,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: 380, lineHeight: 1.7 }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} leftIcon={action.icon} size="md">
          {action.label}
        </Button>
      )}
    </div>
  );
}

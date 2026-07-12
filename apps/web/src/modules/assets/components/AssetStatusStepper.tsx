import { AssetStatus } from '@assetflow/shared';

const STEPS: { status: AssetStatus; label: string }[] = [
  { status: AssetStatus.DRAFT,          label: 'Draft'       },
  { status: AssetStatus.AVAILABLE,      label: 'Available'   },
  { status: AssetStatus.ALLOCATED,      label: 'Allocated'   },
  { status: AssetStatus.IN_MAINTENANCE, label: 'Maintenance' },
  { status: AssetStatus.RETIRED,        label: 'Retired'     },
];

const STATUS_COLORS: Partial<Record<AssetStatus, string>> = {
  [AssetStatus.DRAFT]:          'var(--color-text-muted)',
  [AssetStatus.AVAILABLE]:      'var(--color-success)',
  [AssetStatus.RESERVED]:       'var(--color-info)',
  [AssetStatus.ALLOCATED]:      'var(--color-accent)',
  [AssetStatus.IN_MAINTENANCE]: 'var(--color-warning)',
  [AssetStatus.UNDER_AUDIT]:    'var(--color-purple)',
  [AssetStatus.RETIRED]:        'var(--color-danger)',
  [AssetStatus.LOST]:           'var(--color-danger)',
};

interface AssetStatusStepperProps {
  currentStatus: AssetStatus;
}

function getStepIndex(status: AssetStatus): number {
  // Terminal states
  if (status === AssetStatus.RETIRED || status === AssetStatus.LOST) return STEPS.length - 1;
  if (status === AssetStatus.RESERVED || status === AssetStatus.UNDER_AUDIT) return 1; // treat as available level
  return STEPS.findIndex((s) => s.status === status);
}

export function AssetStatusStepper({ currentStatus }: AssetStatusStepperProps) {
  const currentIndex = getStepIndex(currentStatus);
  const accentColor  = STATUS_COLORS[currentStatus] ?? 'var(--color-accent)';

  // For terminal states show a different view
  const isTerminal = currentStatus === AssetStatus.RETIRED || currentStatus === AssetStatus.LOST;

  return (
    <div style={{ padding: 'var(--space-5) 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
        {/* Connecting line */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            right: 20,
            height: 2,
            background: 'var(--color-border)',
            zIndex: 0,
          }}
        />
        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            height: 2,
            width: isTerminal ? 'calc(100% - 40px)' : `${(currentIndex / (STEPS.length - 1)) * (100)}%`,
            background: accentColor,
            transition: 'width 0.5s ease',
            zIndex: 1,
          }}
        />

        {STEPS.map((step, idx) => {
          const isActive  = idx === (isTerminal ? STEPS.length - 1 : currentIndex);
          const isPast    = idx < (isTerminal ? STEPS.length - 1 : currentIndex);
          const stepColor = isActive ? accentColor : isPast ? accentColor : 'var(--color-border)';

          return (
            <div
              key={step.status}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
                zIndex: 2,
              }}
            >
              {/* Circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: `2px solid ${stepColor}`,
                  background: isPast || isActive ? stepColor : 'var(--color-bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: isPast || isActive ? '#fff' : 'var(--color-text-muted)',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? `0 0 12px ${accentColor}60` : 'none',
                }}
              >
                {isPast ? '✓' : idx + 1}
              </div>
              {/* Label */}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? accentColor : isPast ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {isActive && isTerminal ? currentStatus.replace('_', ' ') : step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current status callout */}
      <div
        style={{
          marginTop: 'var(--space-5)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
            animation: 'pulse 2s ease infinite',
          }}
        />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: accentColor }}>
          Current Status: {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
}

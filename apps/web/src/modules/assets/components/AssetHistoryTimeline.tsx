import React from 'react';
import { AssetEventType, AssetStatus } from '@assetflow/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { AssetEvent } from '../api/assets.api';
import {
  PackagePlus, RefreshCw, ArrowLeftRight, Archive, Wrench,
  RotateCcw, Calendar, AlertTriangle, ClipboardCheck,
} from 'lucide-react';

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  [AssetEventType.CREATED]:              { icon: <PackagePlus size={14} />,   color: 'var(--color-success)',  label: 'Asset Created'            },
  [AssetEventType.UPDATED]:              { icon: <RefreshCw size={14} />,     color: 'var(--color-info)',     label: 'Details Updated'          },
  [AssetEventType.STATUS_CHANGED]:       { icon: <ArrowLeftRight size={14} />,color: 'var(--color-accent)',   label: 'Status Changed'           },
  [AssetEventType.ALLOCATED]:            { icon: <ArrowLeftRight size={14} />,color: 'var(--color-accent)',   label: 'Asset Allocated'          },
  [AssetEventType.TRANSFERRED]:          { icon: <ArrowLeftRight size={14} />,color: 'var(--color-purple)',   label: 'Asset Transferred'        },
  [AssetEventType.RETURNED]:             { icon: <RotateCcw size={14} />,     color: 'var(--color-warning)',  label: 'Asset Returned'           },
  [AssetEventType.BOOKED]:               { icon: <Calendar size={14} />,      color: 'var(--color-info)',     label: 'Asset Booked'             },
  [AssetEventType.MAINTENANCE_STARTED]:  { icon: <Wrench size={14} />,        color: 'var(--color-warning)',  label: 'Maintenance Started'      },
  [AssetEventType.MAINTENANCE_COMPLETED]:{ icon: <Wrench size={14} />,        color: 'var(--color-success)',  label: 'Maintenance Completed'    },
  [AssetEventType.AUDITED]:              { icon: <ClipboardCheck size={14} />,color: 'var(--color-purple)',   label: 'Asset Audited'            },
  [AssetEventType.RETIRED]:              { icon: <Archive size={14} />,       color: 'var(--color-danger)',   label: 'Asset Retired'            },
};

const STATUS_LABELS: Partial<Record<AssetStatus, string>> = {
  [AssetStatus.DRAFT]:          'Draft',
  [AssetStatus.AVAILABLE]:      'Available',
  [AssetStatus.RESERVED]:       'Reserved',
  [AssetStatus.ALLOCATED]:      'Allocated',
  [AssetStatus.IN_MAINTENANCE]: 'In Maintenance',
  [AssetStatus.UNDER_AUDIT]:    'Under Audit',
  [AssetStatus.RETIRED]:        'Retired',
  [AssetStatus.LOST]:           'Lost',
};

function formatTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

interface AssetHistoryTimelineProps {
  events:  AssetEvent[];
  loading: boolean;
}

export function AssetHistoryTimeline({ events, loading }: AssetHistoryTimelineProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!events.length) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} />}
        title="No history yet"
        description="Events will appear here as the asset goes through its lifecycle."
      />
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 'var(--space-8)' }}>
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 15,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'linear-gradient(to bottom, var(--color-accent), var(--color-border))',
          opacity: 0.4,
        }}
      />

      {events.map((event, idx) => {
        const cfg = EVENT_CONFIG[event.type] ?? {
          icon: <AlertTriangle size={14} />,
          color: 'var(--color-text-muted)',
          label: event.type,
        };
        const { date, time } = formatTime(event.createdAt);

        return (
          <div
            key={event.id}
            style={{
              position: 'relative',
              marginBottom: idx < events.length - 1 ? 'var(--space-6)' : 0,
              animation: `fadeIn 0.3s ease ${idx * 0.05}s both`,
            }}
          >
            {/* Timeline dot */}
            <div
              style={{
                position: 'absolute',
                left: -22,
                top: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${cfg.color}20`,
                border: `2px solid ${cfg.color}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: cfg.color,
              }}
            >
              {cfg.icon}
            </div>

            {/* Content card */}
            <div
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: cfg.color }}>
                    {cfg.label}
                  </span>

                  {/* Status transition arrow */}
                  {event.fromStatus && event.toStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-bg-surface)',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {STATUS_LABELS[event.fromStatus] ?? event.fromStatus}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>→</span>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: `${cfg.color}15`,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}30`,
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABELS[event.toStatus] ?? event.toStatus}
                      </span>
                    </div>
                  )}

                  {event.note && (
                    <p style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      {event.note}
                    </p>
                  )}
                </div>

                {/* Actor + time */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{date}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{time}</div>
                  {event.actor && (
                    <div style={{ marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      by {event.actor.firstName} {event.actor.lastName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

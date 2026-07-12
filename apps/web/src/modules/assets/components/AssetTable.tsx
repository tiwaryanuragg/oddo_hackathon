import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Tag, MapPin } from 'lucide-react';
import { StatusBadge, ConditionBadge } from '../../../components/ui/Badge';
import { TableSkeleton } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';
import type { Asset, PaginatedAssets } from '../api/assets.api';

interface AssetTableProps {
  data?:     PaginatedAssets;
  loading:   boolean;
  page:      number;
  onPage:    (p: number) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TH_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  whiteSpace: 'nowrap',
};

const TD_STYLE: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

export function AssetTable({ data, loading, page, onPage }: AssetTableProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)' }}>
              <th style={TH_STYLE}>Asset Tag</th>
              <th style={TH_STYLE}>Name</th>
              <th style={TH_STYLE}>Category</th>
              <th style={TH_STYLE}>Status</th>
              <th style={TH_STYLE}>Condition</th>
              <th style={TH_STYLE}>Location</th>
              <th style={TH_STYLE}>Current Value</th>
              <th style={TH_STYLE}>Assigned To</th>
              <th style={TH_STYLE}>Added</th>
              <th style={{ ...TH_STYLE, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={8} cols={10} />
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon={<Tag size={28} />}
                    title="No assets found"
                    description="Adjust your filters or register a new asset to get started."
                  />
                </td>
              </tr>
            ) : (
              data.items.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onView={() => navigate(`/assets/${asset.id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pagination.total > 0 && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }}
        >
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            onPage={onPage}
            hasNext={data.pagination.hasNext}
            hasPrev={data.pagination.hasPrev}
            total={data.pagination.total}
            limit={data.pagination.limit}
          />
        </div>
      )}
    </div>
  );
}

function AssetRow({ asset, onView }: { asset: Asset; onView: () => void }) {
  const [hover, setHover] = React.useState(false);

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'var(--color-bg-elevated)' : 'transparent',
        transition: 'background var(--transition-fast)',
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease both',
      }}
      onClick={onView}
    >
      {/* Asset Tag */}
      <td style={TD_STYLE}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-accent)',
            background: 'var(--color-accent-light)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.04em',
          }}
        >
          {asset.assetTag}
        </span>
      </td>

      {/* Name */}
      <td style={{ ...TD_STYLE, maxWidth: 200 }}>
        <div className="truncate" style={{ fontWeight: 500 }}>{asset.name}</div>
        {(asset.manufacturer || asset.model) && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {[asset.manufacturer, asset.model].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>

      {/* Category */}
      <td style={{ ...TD_STYLE, color: 'var(--color-text-secondary)' }}>
        {asset.category.name}
      </td>

      {/* Status */}
      <td style={TD_STYLE}><StatusBadge status={asset.status} /></td>

      {/* Condition */}
      <td style={TD_STYLE}><ConditionBadge condition={asset.condition} /></td>

      {/* Location */}
      <td style={{ ...TD_STYLE, color: 'var(--color-text-secondary)' }}>
        {asset.location ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} />
            <span className="truncate" style={{ maxWidth: 120 }}>{asset.location}</span>
          </span>
        ) : '—'}
      </td>

      {/* Current Value */}
      <td style={{ ...TD_STYLE, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
        {formatCurrency(asset.currentValue)}
      </td>

      {/* Assigned To */}
      <td style={TD_STYLE}>
        {asset.assignedTo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}
            >
              {asset.assignedTo.firstName[0]}{asset.assignedTo.lastName[0]}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {asset.assignedTo.firstName} {asset.assignedTo.lastName}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Unassigned</span>
        )}
      </td>

      {/* Date */}
      <td style={{ ...TD_STYLE, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
        {formatDate(asset.createdAt)}
      </td>

      {/* Actions */}
      <td style={{ ...TD_STYLE, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onView}
          aria-label="View asset"
          title="View details"
          style={{
            width: 32, height: 32,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-accent-light)';
            e.currentTarget.style.color = 'var(--color-accent)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
}

import { useState } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { AssetStatus, AssetCondition } from '@assetflow/shared';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import type { AssetListFilters } from '../api/assets.api';

interface AssetFiltersProps {
  filters:   AssetListFilters;
  onChange:  (filters: AssetListFilters) => void;
  categories?: { value: string; label: string }[];
  departments?: { value: string; label: string }[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: AssetStatus.DRAFT,          label: 'Draft'         },
  { value: AssetStatus.AVAILABLE,      label: 'Available'     },
  { value: AssetStatus.RESERVED,       label: 'Reserved'      },
  { value: AssetStatus.ALLOCATED,      label: 'Allocated'     },
  { value: AssetStatus.IN_MAINTENANCE, label: 'Maintenance'   },
  { value: AssetStatus.UNDER_AUDIT,    label: 'Under Audit'   },
  { value: AssetStatus.RETIRED,        label: 'Retired'       },
  { value: AssetStatus.LOST,           label: 'Lost'          },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'All Conditions' },
  { value: AssetCondition.NEW,     label: 'New'     },
  { value: AssetCondition.GOOD,    label: 'Good'    },
  { value: AssetCondition.FAIR,    label: 'Fair'    },
  { value: AssetCondition.POOR,    label: 'Poor'    },
  { value: AssetCondition.DAMAGED, label: 'Damaged' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added'     },
  { value: 'name',      label: 'Name'           },
  { value: 'assetTag',  label: 'Asset Tag'      },
  { value: 'status',    label: 'Status'         },
  { value: 'condition', label: 'Condition'      },
  { value: 'currentValue', label: 'Value'       },
  { value: 'purchaseDate', label: 'Purchase Date'},
];

const EMPTY: AssetListFilters = { page: 1, limit: 20, sortBy: 'createdAt', sortDir: 'desc' };

function hasActiveFilters(f: AssetListFilters): boolean {
  return Boolean(
    f.search || f.status || f.condition || f.categoryId || f.departmentId ||
    f.purchasedAfter || f.purchasedBefore,
  );
}

export function AssetFilters({ filters, onChange, categories = [], departments = [] }: AssetFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const active = hasActiveFilters(filters);

  const set = (partial: Partial<AssetListFilters>) =>
    onChange({ ...filters, ...partial, page: 1 });

  const reset = () => onChange(EMPTY);

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Primary bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <Input
            id="asset-search"
            placeholder="Search by name, tag, serial, manufacturer…"
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
            leftIcon={<Search size={15} />}
            rightIcon={
              filters.search ? (
                <button
                  onClick={() => set({ search: undefined })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                >
                  <X size={14} />
                </button>
              ) : null
            }
          />
        </div>

        {/* Status quick filter */}
        <div style={{ flex: '0 0 160px' }}>
          <Select
            id="asset-status-filter"
            options={STATUS_OPTIONS}
            value={filters.status ?? ''}
            onChange={(e) => set({ status: e.target.value || undefined })}
            fullWidth
          />
        </div>

        {/* Sort */}
        <div style={{ flex: '0 0 160px' }}>
          <Select
            id="asset-sort"
            options={SORT_OPTIONS}
            value={filters.sortBy ?? 'createdAt'}
            onChange={(e) => set({ sortBy: e.target.value })}
            fullWidth
          />
        </div>

        {/* Sort dir */}
        <button
          onClick={() => set({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          aria-label="Toggle sort direction"
          title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
          style={{
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>

        {/* Advanced toggle */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<SlidersHorizontal size={14} />}
          onClick={() => setExpanded((p) => !p)}
          style={expanded ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
        >
          Filters{active ? ' •' : ''}
        </Button>

        {active && (
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={reset}>
            Clear
          </Button>
        )}
      </div>

      {/* Advanced filters row */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-4) var(--space-5)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 'var(--space-3)',
            animation: 'fadeIn 0.2s ease both',
          }}
        >
          <Select
            id="asset-condition-filter"
            label="Condition"
            options={CONDITION_OPTIONS}
            value={filters.condition ?? ''}
            onChange={(e) => set({ condition: e.target.value || undefined })}
          />
          <Select
            id="asset-category-filter"
            label="Category"
            placeholder="All Categories"
            options={categories}
            value={filters.categoryId ?? ''}
            onChange={(e) => set({ categoryId: e.target.value || undefined })}
          />
          <Select
            id="asset-department-filter"
            label="Department"
            placeholder="All Departments"
            options={departments}
            value={filters.departmentId ?? ''}
            onChange={(e) => set({ departmentId: e.target.value || undefined })}
          />
          <Input
            id="asset-purchased-after"
            label="Purchased After"
            type="date"
            value={filters.purchasedAfter ?? ''}
            onChange={(e) => set({ purchasedAfter: e.target.value || undefined })}
          />
          <Input
            id="asset-purchased-before"
            label="Purchased Before"
            type="date"
            value={filters.purchasedBefore ?? ''}
            onChange={(e) => set({ purchasedBefore: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}

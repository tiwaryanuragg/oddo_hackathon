import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatCard } from '../../../components/ui/Card';
import { AssetFilters } from '../components/AssetFilters';
import { AssetTable } from '../components/AssetTable';
import { useAssets } from '../hooks/use-assets';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import type { AssetListFilters } from '../api/assets.api';

const DEFAULT_FILTERS: AssetListFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

interface CategoryOption { id: string; name: string }
interface DeptOption     { id: string; name: string; code: string }

export function AssetListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AssetListFilters>(DEFAULT_FILTERS);

  // Fetch supporting data for filter dropdowns
  const { data: catData } = useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: CategoryOption[] }>('/categories?view=flat');
      return r.data.data;
    },
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: DeptOption[] }>('/departments');
      return r.data.data;
    },
  });

  const { data, isLoading } = useAssets(filters);

  const categoryOptions = (catData ?? []).map((c) => ({ value: c.id, label: c.name }));
  const deptOptions     = (deptData ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }));

  // Compute stats from list data
  const total     = data?.pagination.total ?? 0;
  const available = data?.items.filter((a) => a.status === 'AVAILABLE').length ?? 0;
  const allocated = data?.items.filter((a) => a.status === 'ALLOCATED').length ?? 0;
  const maintenance = data?.items.filter((a) => a.status === 'IN_MAINTENANCE').length ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        padding: 'var(--space-6)',
        animation: 'fadeIn 0.3s ease both',
      }}
    >
      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Asset Registry
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage all organizational assets, lifecycle, and QR tracking
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => navigate('/assets/register')}
          id="register-asset-btn"
        >
          Register Asset
        </Button>
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard
          label="Total Assets"
          value={total}
          icon={<Package size={18} />}
          color="var(--color-accent)"
        />
        <StatCard
          label="Available"
          value={available}
          icon={<Package size={18} />}
          color="var(--color-success)"
        />
        <StatCard
          label="Allocated"
          value={allocated}
          icon={<Package size={18} />}
          color="var(--color-info)"
        />
        <StatCard
          label="In Maintenance"
          value={maintenance}
          icon={<Package size={18} />}
          color="var(--color-warning)"
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <AssetFilters
        filters={filters}
        onChange={setFilters}
        categories={categoryOptions}
        departments={deptOptions}
      />

      {/* ── Table ────────────────────────────────────────────── */}
      <AssetTable
        data={data}
        loading={isLoading}
        page={filters.page ?? 1}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  PackageCheck,
  RotateCcw,
  Plus,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Pagination } from '../../../components/ui/Pagination';
import { useAllocations, useTransfers, useReturns } from '../hooks/use-allocations';
import { AllocationStatus, TransferStatus, ReturnStatus } from '@assetflow/shared';
import type { AllocationFilters, TransferFilters, ReturnFilters } from '../api/allocation.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`;
}

const ALLOC_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ACTIVE:           { color: 'var(--color-success)',    bg: 'var(--color-success-bg)' },
  RETURN_REQUESTED: { color: 'var(--color-warning)',    bg: 'var(--color-warning-bg)' },
  RETURNED:         { color: 'var(--color-info)',       bg: 'var(--color-info-bg)' },
  OVERDUE:          { color: 'var(--color-danger)',     bg: 'var(--color-danger-bg)' },
  REVOKED:          { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' },
};

const TRANSFER_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING:   { color: 'var(--color-warning)',    bg: 'var(--color-warning-bg)' },
  APPROVED:  { color: 'var(--color-success)',    bg: 'var(--color-success-bg)' },
  REJECTED:  { color: 'var(--color-danger)',     bg: 'var(--color-danger-bg)' },
  CANCELLED: { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' },
  COMPLETED: { color: 'var(--color-info)',       bg: 'var(--color-info-bg)' },
};

const RETURN_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  REQUESTED: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  APPROVED:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  REJECTED:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
  COMPLETED: { color: 'var(--color-info)',    bg: 'var(--color-info-bg)' },
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-md)',
        background: `${color}1a`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

type TabId = 'allocations' | 'transfers' | 'returns';

function TabBar({ active, onChange, counts }: {
  active: TabId; onChange: (t: TabId) => void; counts: Record<TabId, number>;
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'allocations', label: 'Allocations',       icon: <PackageCheck size={15} /> },
    { id: 'transfers',   label: 'Transfer Requests', icon: <ArrowLeftRight size={15} /> },
    { id: 'returns',     label: 'Return Requests',   icon: <RotateCcw size={15} /> },
  ];

  return (
    <div style={{
      display: 'flex', gap: 4, background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 4,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
            fontWeight: active === tab.id ? 600 : 400,
            background: active === tab.id ? 'var(--color-accent)' : 'transparent',
            color: active === tab.id ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {tab.icon} {tab.label}
          {counts[tab.id] > 0 && (
            <span style={{
              background: active === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-elevated)',
              color: active === tab.id ? '#fff' : 'var(--color-text-muted)',
              borderRadius: 'var(--radius-full)', padding: '1px 7px',
              fontSize: 'var(--text-xs)', fontWeight: 600,
            }}>
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 'var(--text-xs)',
  fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.06em', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '12px 16px', fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

function StatusPill({ label, colors }: { label: string; colors: { color: string; bg: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
      borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600,
      color: colors.color, background: colors.bg,
    }}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Allocations Tab ──────────────────────────────────────────────────────────

function AllocationsTab({ onIssue }: { onIssue: () => void }) {
  const [filters, setFilters] = useState<AllocationFilters>({ page: 1, limit: 15 });
  const { data, isLoading } = useAllocations(filters);
  const navigate = useNavigate();

  const pg = data?.pagination;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)', pointerEvents: 'none',
          }} />
          <input
            placeholder="Search allocations…"
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)', outline: 'none',
            }}
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({
            ...f,
            status: (e.target.value as AllocationStatus) || undefined,
            page: 1,
          }))}
          style={{
            padding: '8px 12px', background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {Object.values(AllocationStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={onIssue} id="issue-alloc-btn">
          Issue Allocation
        </Button>
      </div>

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        ) : !data?.items.length ? (
          <EmptyState title="No allocations found" description="Issue an allocation to assign an asset to an employee." icon={<PackageCheck size={40} />} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Asset', 'Holder', 'Issued By', 'Allocated On', 'Due Date', 'Status', ''].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/allocations/${a.id}`)}
                  style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{a.asset.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{a.asset.assetTag}</div>
                  </td>
                  <td style={TD}>
                    <div>{fullName(a.holder)}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{a.holder.email}</div>
                  </td>
                  <td style={TD}>{fullName(a.issuedBy)}</td>
                  <td style={TD}>{formatDate(a.allocatedAt)}</td>
                  <td style={TD}>
                    {a.dueDate ? (
                      <span style={{ color: new Date(a.dueDate) < new Date() ? 'var(--color-danger)' : 'inherit' }}>
                        {formatDate(a.dueDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={TD}><StatusPill label={a.status} colors={ALLOC_STATUS_COLORS[a.status] ?? { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' }} /></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button
                      style={{ padding: '4px 12px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/allocations/${a.id}`); }}
                    >View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pg && pg.totalPages > 1 && (
        <Pagination
          page={pg.page} totalPages={pg.totalPages}
          hasNext={pg.hasNext} hasPrev={pg.hasPrev}
          total={pg.total} limit={pg.limit}
          onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}
    </div>
  );
}

// ─── Transfers Tab ────────────────────────────────────────────────────────────

function TransfersTab() {
  const [filters, setFilters] = useState<TransferFilters>({ page: 1, limit: 15 });
  const { data, isLoading } = useTransfers(filters);
  const navigate = useNavigate();
  const pg = data?.pagination;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({
            ...f,
            status: (e.target.value as TransferStatus) || undefined,
            page: 1,
          }))}
          style={{
            padding: '8px 12px', background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {Object.values(TransferStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        ) : !data?.items.length ? (
          <EmptyState title="No transfer requests" description="Transfer requests will appear here when users request asset reassignment." icon={<ArrowLeftRight size={40} />} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Asset', 'From', 'To', 'Requested By', 'Date', 'Status', ''].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/allocations/transfers/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{t.asset.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{t.asset.assetTag}</div>
                  </td>
                  <td style={TD}>{fullName(t.fromUser)}</td>
                  <td style={TD}>{fullName(t.toUser)}</td>
                  <td style={TD}>{fullName(t.requestedBy)}</td>
                  <td style={TD}>{formatDate(t.createdAt)}</td>
                  <td style={TD}><StatusPill label={t.status} colors={TRANSFER_STATUS_COLORS[t.status] ?? { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' }} /></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    {t.status === TransferStatus.PENDING && (
                      <button
                        style={{ padding: '4px 10px', background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/allocations/transfers/${t.id}`); }}
                      >Review</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pg && pg.totalPages > 1 && (
        <Pagination
          page={pg.page} totalPages={pg.totalPages}
          hasNext={pg.hasNext} hasPrev={pg.hasPrev}
          total={pg.total} limit={pg.limit}
          onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}
    </div>
  );
}

// ─── Returns Tab ──────────────────────────────────────────────────────────────

function ReturnsTab() {
  const [filters, setFilters] = useState<ReturnFilters>({ page: 1, limit: 15 });
  const { data, isLoading } = useReturns(filters);
  const navigate = useNavigate();
  const pg = data?.pagination;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({
            ...f,
            status: (e.target.value as ReturnStatus) || undefined,
            page: 1,
          }))}
          style={{
            padding: '8px 12px', background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {Object.values(ReturnStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        ) : !data?.items.length ? (
          <EmptyState title="No return requests" description="Return requests submitted by employees will appear here." icon={<RotateCcw size={40} />} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Asset', 'Holder', 'Condition', 'Submitted By', 'Date', 'Status', ''].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/allocations/returns/${r.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{r.allocation?.asset.name ?? '—'}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.allocation?.asset.assetTag ?? '—'}</div>
                  </td>
                  <td style={TD}>{r.allocation ? fullName(r.allocation.holder) : '—'}</td>
                  <td style={TD}>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-elevated)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {r.reportedCondition}
                    </span>
                  </td>
                  <td style={TD}>{fullName(r.submittedBy)}</td>
                  <td style={TD}>{formatDate(r.createdAt)}</td>
                  <td style={TD}><StatusPill label={r.status} colors={RETURN_STATUS_COLORS[r.status] ?? { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' }} /></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    {r.status === ReturnStatus.REQUESTED && (
                      <button
                        style={{ padding: '4px 10px', background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/allocations/returns/${r.id}`); }}
                      >Process</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pg && pg.totalPages > 1 && (
        <Pagination
          page={pg.page} totalPages={pg.totalPages}
          hasNext={pg.hasNext} hasPrev={pg.hasPrev}
          total={pg.total} limit={pg.limit}
          onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AllocationListPage() {
  const [activeTab, setActiveTab] = useState<TabId>('allocations');
  const navigate = useNavigate();

  const { data: allocData }      = useAllocations({ status: AllocationStatus.ACTIVE,           page: 1, limit: 1 });
  const { data: pendingTransfers } = useTransfers({ status: TransferStatus.PENDING,             page: 1, limit: 1 });
  const { data: pendingReturns }   = useReturns({ status: ReturnStatus.REQUESTED,              page: 1, limit: 1 });

  const activeCount   = allocData?.pagination.total ?? 0;
  const transferCount = pendingTransfers?.pagination.total ?? 0;
  const returnCount   = pendingReturns?.pagination.total ?? 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
      padding: 'var(--space-6)', animation: 'fadeIn 0.3s ease both',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Allocation Management
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage asset allocations, transfers between employees, and return requests
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus size={16} />} onClick={() => navigate('/allocations/issue')} id="issue-allocation-header-btn">
          Issue Allocation
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard label="Active Allocations" value={activeCount}   icon={<PackageCheck size={20} />}   color="var(--color-success)" />
        <StatCard label="Pending Transfers"  value={transferCount} icon={<ArrowLeftRight size={20} />} color="var(--color-warning)" />
        <StatCard label="Pending Returns"    value={returnCount}   icon={<RotateCcw size={20} />}      color="var(--color-info)" />
      </div>

      {/* Attention banner */}
      {(transferCount > 0 || returnCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: 'var(--color-warning-bg)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)',
          color: 'var(--color-warning)', fontSize: 'var(--text-sm)',
        }}>
          <AlertTriangle size={16} />
          <span>
            {[
              transferCount > 0 && `${transferCount} transfer request${transferCount > 1 ? 's' : ''} awaiting approval`,
              returnCount > 0 && `${returnCount} return request${returnCount > 1 ? 's' : ''} awaiting processing`,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      <TabBar active={activeTab} onChange={setActiveTab} counts={{ allocations: activeCount, transfers: transferCount, returns: returnCount }} />

      <div style={{ animation: 'fadeIn 0.2s ease both' }}>
        {activeTab === 'allocations' && <AllocationsTab onIssue={() => navigate('/allocations/issue')} />}
        {activeTab === 'transfers'   && <TransfersTab />}
        {activeTab === 'returns'     && <ReturnsTab />}
      </div>
    </div>
  );
}

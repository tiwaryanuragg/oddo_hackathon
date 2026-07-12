import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, QrCode, Archive, AlertTriangle,
  MapPin, Tag, User, Building2, Calendar, DollarSign, Info,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge, StatusBadge, ConditionBadge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Select, Textarea } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { AssetStatusStepper } from '../components/AssetStatusStepper';
import { AssetHistoryTimeline } from '../components/AssetHistoryTimeline';
import { QrCodeModal } from '../components/QrCodeModal';
import { DepreciationCard } from '../components/DepreciationCard';
import { AssetForm } from '../components/AssetForm';
import {
  useAsset, useAssetHistory, useAssetDepreciation,
  useUpdateAsset, useChangeAssetStatus, useRetireAsset,
} from '../hooks/use-assets';
import { useToast } from '../../../components/ui/Toast';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { AssetStatus } from '@assetflow/shared';
import type { AxiosError } from 'axios';
import type { UpdateAssetPayload } from '../api/assets.api';

type TabId = 'overview' | 'history' | 'qr' | 'depreciation';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',     label: 'Overview'     },
  { id: 'history',      label: 'History'      },
  { id: 'qr',           label: 'QR Code'      },
  { id: 'depreciation', label: 'Depreciation' },
];

const STATUS_OPTIONS = [
  { value: AssetStatus.AVAILABLE,      label: 'Available'     },
  { value: AssetStatus.IN_MAINTENANCE, label: 'In Maintenance'},
  { value: AssetStatus.UNDER_AUDIT,    label: 'Under Audit'   },
  { value: AssetStatus.LOST,           label: 'Lost'          },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(val: number | null): string {
  if (val === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
}

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const toast     = useToast();

  const [activeTab,  setActiveTab]  = useState<TabId>('overview');
  const [showQr,     setShowQr]     = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showRetire, setShowRetire] = useState(false);

  const [newStatus,   setNewStatus]   = useState('');
  const [statusNote,  setStatusNote]  = useState('');
  const [retireReason, setRetireReason] = useState('');

  const { data: asset, isLoading } = useAsset(id);
  const { data: events, isLoading: historyLoading }       = useAssetHistory(activeTab === 'history' ? id : undefined);
  const { data: depreciation, isLoading: depLoading }     = useAssetDepreciation(activeTab === 'depreciation' ? id : undefined);

  const updateMutation      = useUpdateAsset(id!);
  const changeStatusMutation = useChangeAssetStatus(id!);
  const retireMutation      = useRetireAsset(id!);

  const { data: catData } = useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => (await apiClient.get<{ data: { id: string; name: string }[] }>('/categories?view=flat')).data.data,
  });
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await apiClient.get<{ data: { id: string; name: string; code: string }[] }>('/departments')).data.data,
  });

  const categoryOptions = (catData ?? []).map((c) => ({ value: c.id, label: c.name }));
  const deptOptions     = (deptData ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }));

  const handleUpdate = async (values: UpdateAssetPayload) => {
    try {
      await updateMutation.mutateAsync(values);
      toast.success('Asset updated!');
      setShowEdit(false);
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      toast.error('Update failed', e.response?.data?.message);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      await changeStatusMutation.mutateAsync({ status: newStatus as AssetStatus, note: statusNote || undefined });
      toast.success('Status updated!', `Asset is now ${newStatus.replace(/_/g, ' ')}`);
      setShowStatus(false);
      setNewStatus('');
      setStatusNote('');
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      toast.error('Failed to update status', e.response?.data?.message);
    }
  };

  const handleRetire = async () => {
    if (retireReason.length < 10) {
      toast.warning('Reason too short', 'Please provide at least 10 characters.');
      return;
    }
    try {
      await retireMutation.mutateAsync({ reason: retireReason });
      toast.success('Asset retired', `${asset?.assetTag} has been retired.`);
      setShowRetire(false);
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      toast.error('Failed to retire', e.response?.data?.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
        <AlertTriangle size={32} />
        <p style={{ marginTop: 12 }}>Asset not found or you don't have permission to view it.</p>
        <Button variant="ghost" onClick={() => navigate('/assets')} style={{ marginTop: 16 }}>
          Back to Assets
        </Button>
      </div>
    );
  }

  const isRetired = asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.LOST;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
        padding: 'var(--space-6)', animation: 'fadeIn 0.3s ease both',
      }}
    >
      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/assets')}>
            Assets
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{asset.name}</h1>
              <span
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700,
                  color: 'var(--color-accent)', background: 'var(--color-accent-light)',
                  padding: '3px 10px', borderRadius: 'var(--radius-sm)', letterSpacing: '0.06em',
                }}
              >
                {asset.assetTag}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 6 }}>
              <StatusBadge status={asset.status} />
              <ConditionBadge condition={asset.condition} />
              {asset.category && <Badge variant="muted">{asset.category.name}</Badge>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" leftIcon={<QrCode size={14} />} onClick={() => setShowQr(true)}>
            QR Code
          </Button>
          {!isRetired && (
            <>
              <Button variant="secondary" size="sm" leftIcon={<Edit2 size={14} />} onClick={() => setShowEdit(true)}>
                Edit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowStatus(true)}>
                Change Status
              </Button>
              <Button variant="danger" size="sm" leftIcon={<Archive size={14} />} onClick={() => setShowRetire(true)}>
                Retire
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── Status Stepper ───────────────────────────────────── */}
      <Card padding>
        <AssetStatusStepper currentStatus={asset.status} />
      </Card>

      {/* ─── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)', animation: 'fadeIn 0.2s ease both' }}>
          {/* Main details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {asset.description && (
              <Card title="Description">
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 'var(--text-sm)' }}>
                  {asset.description}
                </p>
              </Card>
            )}

            <Card title="Asset Details">
              <DetailGrid>
                <DetailItem icon={<Tag size={14} />} label="Serial Number" value={asset.serialNumber ?? '—'} mono />
                <DetailItem icon={<Info size={14} />} label="Manufacturer" value={asset.manufacturer ?? '—'} />
                <DetailItem icon={<Info size={14} />} label="Model" value={asset.model ?? '—'} />
                <DetailItem icon={<MapPin size={14} />} label="Location" value={asset.location ?? '—'} />
                <DetailItem icon={<Building2 size={14} />} label="Department" value={asset.department?.name ?? '—'} />
                <DetailItem icon={<User size={14} />} label="Registered By" value={`${asset.registeredBy.firstName} ${asset.registeredBy.lastName}`} />
                <DetailItem icon={<Calendar size={14} />} label="Registered On" value={formatDate(asset.createdAt)} />
              </DetailGrid>
            </Card>

            <Card title="Financial">
              <DetailGrid>
                <DetailItem icon={<DollarSign size={14} />} label="Purchase Cost" value={formatCurrency(asset.purchaseCost)} mono />
                <DetailItem icon={<DollarSign size={14} />} label="Current Value" value={formatCurrency(asset.currentValue)} mono />
                <DetailItem icon={<Calendar size={14} />} label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                <DetailItem icon={<Calendar size={14} />} label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} />
              </DetailGrid>
            </Card>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Assigned to */}
            <Card title="Assigned To">
              {asset.assignedTo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {asset.assignedTo.firstName[0]}{asset.assignedTo.lastName[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {asset.assignedTo.email}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Unassigned</p>
              )}
            </Card>

            {/* Counts */}
            <Card title="Activity Summary">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Events logged',  value: asset.eventCount      },
                  { label: 'Allocations',    value: asset.allocationCount  },
                  { label: 'Maintenance requests', value: asset.maintenanceCount },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Warranty status */}
            {asset.warrantyExpiry && (
              <Card title="Warranty">
                {(() => {
                  const exp  = new Date(asset.warrantyExpiry);
                  const now  = new Date();
                  const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
                  const expired = days < 0;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Badge variant={expired ? 'danger' : days < 90 ? 'warning' : 'success'} dot>
                        {expired ? 'Expired' : `Expires in ${days} days`}
                      </Badge>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDate(asset.warrantyExpiry)}
                      </span>
                    </div>
                  );
                })()}
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card title="Asset History" subtitle="Complete immutable event ledger">
          <AssetHistoryTimeline events={events ?? []} loading={historyLoading} />
        </Card>
      )}

      {activeTab === 'qr' && (
        <Card title="QR Code" subtitle="Scan or download the asset QR code">
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <div
              style={{
                background: '#fff', padding: 24,
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              }}
            >
              <img
                src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/assets/${asset.id}/qr?format=svg`}
                alt={`QR for ${asset.assetTag}`}
                style={{ width: 280, height: 280 }}
              />
              <div
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)',
                  fontWeight: 700, color: '#1e293b', letterSpacing: '0.08em',
                }}
              >
                {asset.assetTag}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={() => setShowQr(true)} leftIcon={<QrCode size={14} />}>
              Open QR Modal
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'depreciation' && (
        <Card title="Depreciation Analysis" subtitle="Straight-line method calculation">
          <DepreciationCard data={depreciation} loading={depLoading} />
        </Card>
      )}

      {/* ─── Modals ───────────────────────────────────────────── */}

      {/* QR Modal */}
      <QrCodeModal
        open={showQr}
        onClose={() => setShowQr(false)}
        assetId={asset.id}
        assetTag={asset.assetTag}
        assetName={asset.name}
      />

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Asset"
        description={`${asset.assetTag} — ${asset.name}`}
        size="lg"
      >
        <AssetForm
          mode="edit"
          initialValues={{
            name:          asset.name,
            description:   asset.description ?? '',
            categoryId:    asset.category.id,
            departmentId:  asset.department?.id,
            serialNumber:  asset.serialNumber ?? '',
            manufacturer:  asset.manufacturer ?? '',
            model:         asset.model ?? '',
            location:      asset.location ?? '',
            condition:     asset.condition,
            purchaseDate:  asset.purchaseDate ?? '',
            purchaseCost:  asset.purchaseCost ?? undefined,
            warrantyExpiry: asset.warrantyExpiry ?? '',
          }}
          categories={categoryOptions}
          departments={deptOptions}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
          loading={updateMutation.isPending}
        />
      </Modal>

      {/* Change Status Modal */}
      <Modal
        open={showStatus}
        onClose={() => setShowStatus(false)}
        title="Change Asset Status"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowStatus(false)} disabled={changeStatusMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusChange}
              loading={changeStatusMutation.isPending}
              disabled={!newStatus}
            >
              Apply
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Current: <StatusBadge status={asset.status} />
          </div>
          <Select
            id="new-status"
            label="New Status"
            placeholder="Select new status"
            options={STATUS_OPTIONS.filter((o) => o.value !== asset.status)}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <Textarea
            id="status-note"
            label="Note (optional)"
            placeholder="Reason for status change…"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Retire Modal */}
      <Modal
        open={showRetire}
        onClose={() => setShowRetire(false)}
        title="Retire Asset"
        description="This action is irreversible. The asset will be permanently retired."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRetire(false)} disabled={retireMutation.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRetire} loading={retireMutation.isPending}>
              Confirm Retire
            </Button>
          </>
        }
      >
        <Textarea
          id="retire-reason"
          label="Reason for Retirement"
          placeholder="Describe why this asset is being retired (min 10 characters)…"
          required
          value={retireReason}
          onChange={(e) => setRetireReason(e.target.value)}
          rows={4}
        />
      </Modal>
    </div>
  );
}

// ─── Detail sub-components ───────────────────────────────────────────────────

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}
    >
      {children}
    </div>
  );
}

function DetailItem({
  icon, label, value, mono = false,
}: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)' }}>
        {icon}
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: 'var(--text-sm)',
          color: value === '—' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          fontFamily: mono && value !== '—' ? 'var(--font-mono)' : undefined,
          fontWeight: mono && value !== '—' ? 600 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

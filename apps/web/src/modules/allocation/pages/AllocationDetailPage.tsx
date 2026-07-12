import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  RotateCcw,
  Package,
  User,
  Calendar,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { AssetCondition, type AllocationStatus } from '@assetflow/shared';
import {
  useAllocation,
  useRevokeAllocation,
  useRequestReturn,
  useProcessReturn,
  useDecideTransfer,
} from '../hooks/use-allocations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`;
}

const STATUS_COLORS: Record<AllocationStatus, { color: string; bg: string }> = {
  ACTIVE:           { color: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
  RETURN_REQUESTED: { color: 'var(--color-warning)',  bg: 'var(--color-warning-bg)' },
  RETURNED:         { color: 'var(--color-info)',     bg: 'var(--color-info-bg)' },
  OVERDUE:          { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)' },
  REVOKED:          { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' },
};

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: '1px solid var(--color-border)',
      gap: 16,
    }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', flexShrink: 0, minWidth: 140 }}>
        {label}
      </span>
      <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', textAlign: 'right' }}>
        {children}
      </span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
      }}>
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 20px 16px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Return Request Modal ─────────────────────────────────────────────────────

function RequestReturnModal({
  allocationId,
  open,
  onClose,
}: { allocationId: string; open: boolean; onClose: () => void }) {
  const [condition, setCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [note, setNote] = useState('');
  const { mutateAsync, isPending } = useRequestReturn();
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      await mutateAsync({ allocationId, reportedCondition: condition, note: note || undefined });
      toast.success('Return requested', 'Your return request has been submitted.');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request return';
      toast.error('Error', msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Request Return" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Asset Condition at Return *
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as AssetCondition)}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Any remarks about the asset condition…"
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isPending} onClick={handleSubmit} id="submit-return-btn">
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Process Return Modal ─────────────────────────────────────────────────────

function ProcessReturnModal({
  returnId,
  open,
  onClose,
}: { returnId: string; open: boolean; onClose: () => void }) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const { mutateAsync, isPending } = useProcessReturn(returnId);
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      await mutateAsync({ decision, note: note || undefined });
      if (decision === 'approve') {
        toast.success('Return approved', 'The return request has been approved.');
      } else {
        toast.warning('Return rejected', 'The return request has been rejected.');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process return';
      toast.error('Error', msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Process Return Request" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['approve', 'reject'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${decision === d ? (d === 'approve' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                background: decision === d ? (d === 'approve' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)') : 'transparent',
                color: decision === d ? (d === 'approve' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-secondary)',
                fontWeight: 600, fontSize: 'var(--text-sm)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textTransform: 'capitalize',
              }}
            >
              {d === 'approve' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {d}
            </button>
          ))}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Decision Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Reason for your decision…"
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === 'approve' ? 'success' : 'danger'}
            loading={isPending}
            onClick={handleSubmit}
            id="process-return-btn"
          >
            {decision === 'approve' ? 'Approve Return' : 'Reject Return'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Decide Transfer Modal ────────────────────────────────────────────────────

function DecideTransferModal({
  transferId,
  open,
  onClose,
}: { transferId: string; open: boolean; onClose: () => void }) {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const { mutateAsync, isPending } = useDecideTransfer(transferId);
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      await mutateAsync({ decision, decisionNote: note || undefined });
      if (decision === 'approve') {
        toast.success(`Transfer approved`, 'The transfer request has been approved.');
      } else {
        toast.warning(`Transfer rejected`, 'The transfer request has been rejected.');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decide transfer';
      toast.error('Error', msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Decide Transfer Request" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['approve', 'reject'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDecision(d)}
              style={{
                flex: 1, padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${decision === d ? (d === 'approve' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                background: decision === d ? (d === 'approve' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)') : 'transparent',
                color: decision === d ? (d === 'approve' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-secondary)',
                fontWeight: 600, fontSize: 'var(--text-sm)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textTransform: 'capitalize',
              }}
            >
              {d === 'approve' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {d}
            </button>
          ))}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Decision Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Reason for your decision…"
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={decision === 'approve' ? 'success' : 'danger'}
            loading={isPending}
            onClick={handleSubmit}
            id="decide-transfer-btn"
          >
            {decision === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AllocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: allocation, isLoading, isError } = useAllocation(id);
  const toast = useToast();

  const [returnModal, setReturnModal]     = useState(false);
  const [processModal, setProcessModal]   = useState<{ open: boolean; returnId: string }>({ open: false, returnId: '' });
  const [transferModal, setTransferModal] = useState<{ open: boolean; transferId: string }>({ open: false, transferId: '' });

  const { mutateAsync: revokeAlloc, isPending: revoking } = useRevokeAllocation(id!);

  const handleRevoke = async () => {
    const reason = window.prompt('Enter reason for revoking this allocation:');
    if (!reason || reason.trim().length < 5) return;
    try {
      await revokeAlloc({ reason });
      toast.success('Allocation revoked', 'The allocation has been revoked.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke';
      toast.error('Error', msg);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (isError || !allocation) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>Allocation not found.</p>
        <Button variant="ghost" onClick={() => navigate('/allocations')} style={{ marginTop: 16 } as React.CSSProperties}>
          Back to Allocations
        </Button>
      </div>
    );
  }

  const sc = STATUS_COLORS[allocation.status];
  const isActive = allocation.status === 'ACTIVE';
  const pendingReturn = allocation.returns.find((r) => r.status === 'REQUESTED');
  const pendingTransfer = allocation.pendingTransfer;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
      padding: 'var(--space-6)',
      animation: 'fadeIn 0.3s ease both',
      maxWidth: 900,
    }}>
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate('/allocations')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
            background: 'none', border: 'none', cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Back to Allocations
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Allocation Detail
              </h1>
              <span style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)', fontWeight: 700,
                color: sc.color, background: sc.bg,
              }}>
                {allocation.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {allocation.id}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isActive && !pendingReturn && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw size={14} />}
                onClick={() => setReturnModal(true)}
                id="request-return-btn"
              >
                Request Return
              </Button>
            )}
            {isActive && (
              <Button
                variant="danger"
                size="sm"
                loading={revoking}
                leftIcon={<XCircle size={14} />}
                onClick={handleRevoke}
                id="revoke-allocation-btn"
              >
                Revoke
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pending alerts */}
      {pendingReturn && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--color-warning-bg)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-md)',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-warning)' }}>
            <Clock size={16} />
            <span style={{ fontSize: 'var(--text-sm)' }}>A return request is pending approval.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setProcessModal({ open: true, returnId: pendingReturn.id })}
            id="process-pending-return-btn"
          >
            Process
          </Button>
        </div>
      )}

      {pendingTransfer && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--color-info-bg)',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 'var(--radius-md)',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-info)' }}>
            <ArrowLeftRight size={16} />
            <span style={{ fontSize: 'var(--text-sm)' }}>
              A transfer to <strong>{fullName(pendingTransfer.toUser)}</strong> is pending approval.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTransferModal({ open: true, transferId: pendingTransfer.id })}
            id="decide-pending-transfer-btn"
          >
            Decide
          </Button>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Asset info */}
        <SectionCard title="Asset" icon={<Package size={15} />}>
          <InfoRow label="Name">
            <Link to={`/assets/${allocation.asset.id}`} style={{ color: 'var(--color-accent)' }}>
              {allocation.asset.name}
            </Link>
          </InfoRow>
          <InfoRow label="Asset Tag">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
              {allocation.asset.assetTag}
            </span>
          </InfoRow>
          <InfoRow label="Category">{allocation.asset.category.name}</InfoRow>
          <InfoRow label="Department">{allocation.asset.department?.name ?? '—'}</InfoRow>
          <InfoRow label="Location">{allocation.asset.location ?? '—'}</InfoRow>
          <InfoRow label="Condition">
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-bg-elevated)',
              fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
            }}>
              {allocation.asset.condition}
            </span>
          </InfoRow>
        </SectionCard>

        {/* Holder info */}
        <SectionCard title="Holder" icon={<User size={15} />}>
          <InfoRow label="Name">{fullName(allocation.holder)}</InfoRow>
          <InfoRow label="Email">{allocation.holder.email}</InfoRow>
          <InfoRow label="Job Title">{allocation.holder.jobTitle ?? '—'}</InfoRow>
          <InfoRow label="Issued By">{fullName(allocation.issuedBy)}</InfoRow>
        </SectionCard>
      </div>

      {/* Allocation timeline */}
      <SectionCard title="Allocation Timeline" icon={<Calendar size={15} />}>
        <InfoRow label="Allocated At">{fmt(allocation.allocatedAt)}</InfoRow>
        <InfoRow label="Due Date">
          {allocation.dueDate ? (
            <span style={{ color: new Date(allocation.dueDate) < new Date() && isActive ? 'var(--color-danger)' : 'inherit' }}>
              {fmt(allocation.dueDate)}
              {new Date(allocation.dueDate) < new Date() && isActive && (
                <span style={{ marginLeft: 6, fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                  (Overdue)
                </span>
              )}
            </span>
          ) : '—'}
        </InfoRow>
        {allocation.returnedAt && <InfoRow label="Returned At">{fmt(allocation.returnedAt)}</InfoRow>}
        <InfoRow label="Note">{allocation.note ?? '—'}</InfoRow>
      </SectionCard>

      {/* Return history */}
      {allocation.returns.length > 0 && (
        <SectionCard title="Return History" icon={<ClipboardCheck size={15} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
            {allocation.returns.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '12px 16px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Reported condition: <span style={{ color: 'var(--color-accent)' }}>{r.reportedCondition}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    By {fullName(r.submittedBy)} · {fmt(r.createdAt)}
                  </div>
                  {r.note && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{r.note}</div>}
                </div>
                <div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                    color: r.status === 'COMPLETED' ? 'var(--color-success)' :
                           r.status === 'REJECTED' ? 'var(--color-danger)' : 'var(--color-warning)',
                    background: r.status === 'COMPLETED' ? 'var(--color-success-bg)' :
                                r.status === 'REJECTED' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                  }}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Modals */}
      <RequestReturnModal
        allocationId={allocation.id}
        open={returnModal}
        onClose={() => setReturnModal(false)}
      />

      {processModal.open && (
        <ProcessReturnModal
          returnId={processModal.returnId}
          open
          onClose={() => setProcessModal({ open: false, returnId: '' })}
        />
      )}

      {transferModal.open && (
        <DecideTransferModal
          transferId={transferModal.transferId}
          open
          onClose={() => setTransferModal({ open: false, transferId: '' })}
        />
      )}
    </div>
  );
}

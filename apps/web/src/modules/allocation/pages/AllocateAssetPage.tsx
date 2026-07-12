import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useIssueAllocation } from '../hooks/use-allocations';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';

// ─── Supporting data types ────────────────────────────────────────────────────

interface AssetOption { id: string; assetTag: string; name: string; status: string }
interface UserOption  { id: string; firstName: string; lastName: string; email: string; jobTitle: string | null }

type ApiResponse<T> = { success: boolean; data: T };

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label, required, children, hint,
}: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AllocateAssetPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [assetId,  setAssetId]  = useState('');
  const [holderId, setHolderId] = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [note,     setNote]     = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // ── Fetch available assets ──────────────────────────────────────────────────
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', 'available'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<{ items: AssetOption[] }>>('/assets?status=AVAILABLE&limit=200');
      return r.data.data.items;
    },
  });

  // ── Fetch active users ──────────────────────────────────────────────────────
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: async () => {
      const r = await apiClient.get<ApiResponse<{ items: UserOption[] }>>('/users?status=ACTIVE&limit=200');
      return r.data.data.items;
    },
  });

  const { mutateAsync, isPending } = useIssueAllocation();

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!assetId)  e.assetId  = 'Please select an asset';
    if (!holderId) e.holderId = 'Please select a holder';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const allocation = await mutateAsync({
        assetId,
        holderId,
        dueDate: dueDate || undefined,
        note:    note || undefined,
      });
      toast.success('Allocation issued', `Asset allocated to ${users?.find((u) => u.id === holderId)?.firstName ?? 'user'}`);
      navigate(`/allocations/${allocation.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue allocation';
      toast.error('Error', msg);
    }
  };

  const selectedAsset = assets?.find((a) => a.id === assetId);
  const selectedUser  = users?.find((u)  => u.id === holderId);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
      padding: 'var(--space-6)',
      animation: 'fadeIn 0.3s ease both',
      maxWidth: 720,
    }}>
      {/* Back link */}
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
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Issue Allocation
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Assign an available asset to an employee. Only assets with status AVAILABLE can be allocated.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Asset selection */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            <Package size={16} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>Asset</span>
          </div>

          <Field label="Select Asset" required hint="Only AVAILABLE assets are shown.">
            {assetsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <Spinner size={14} /> <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Loading assets…</span>
              </div>
            ) : (
              <select
                id="asset-select"
                value={assetId}
                onChange={(e) => { setAssetId(e.target.value); setErrors((x) => ({ ...x, assetId: '' })); }}
                style={{ ...inputStyle, border: errors.assetId ? '1px solid var(--color-danger)' : '1px solid var(--color-border)' }}
              >
                <option value="">— Select an asset —</option>
                {(assets ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                ))}
              </select>
            )}
            {errors.assetId && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: 4 }}>{errors.assetId}</p>}
          </Field>

          {selectedAsset && (
            <div style={{
              padding: '10px 14px', background: 'var(--color-accent-light)',
              border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)', color: 'var(--color-accent)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <Package size={14} />
              <span><strong>{selectedAsset.name}</strong> · {selectedAsset.assetTag} · Status: {selectedAsset.status}</span>
            </div>
          )}
        </div>

        {/* Holder selection */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            <User size={16} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>Holder</span>
          </div>

          <Field label="Assign To" required hint="Select the employee who will hold this asset.">
            {usersLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <Spinner size={14} /> <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Loading users…</span>
              </div>
            ) : (
              <select
                id="holder-select"
                value={holderId}
                onChange={(e) => { setHolderId(e.target.value); setErrors((x) => ({ ...x, holderId: '' })); }}
                style={{ ...inputStyle, border: errors.holderId ? '1px solid var(--color-danger)' : '1px solid var(--color-border)' }}
              >
                <option value="">— Select an employee —</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            )}
            {errors.holderId && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: 4 }}>{errors.holderId}</p>}
          </Field>

          {selectedUser && (
            <div style={{
              padding: '10px 14px', background: 'var(--color-success-bg)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)', color: 'var(--color-success)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <User size={14} />
              <span><strong>{selectedUser.firstName} {selectedUser.lastName}</strong> · {selectedUser.jobTitle ?? 'No title'}</span>
            </div>
          )}
        </div>

        {/* Optional fields */}
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
            <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>Optional Details</span>
          </div>

          <Field label="Due Date" hint="Set an expected return date for this allocation.">
            <input
              id="due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
              min={new Date().toISOString().split('T')[0]}
            />
          </Field>

          <Field label="Note" hint="Internal note about this allocation.">
            <textarea
              id="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Assigned for project alpha work from home setup…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="ghost" type="button" onClick={() => navigate('/allocations')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={isPending}
            id="submit-allocation-btn"
          >
            Issue Allocation
          </Button>
        </div>
      </form>
    </div>
  );
}

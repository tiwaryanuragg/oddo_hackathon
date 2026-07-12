import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AssetForm } from '../components/AssetForm';
import { useRegisterAsset } from '../hooks/use-assets';
import { useToast } from '../../../components/ui/Toast';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import type { AxiosError } from 'axios';
import type { RegisterAssetPayload, UpdateAssetPayload } from '../api/assets.api';

interface Option { value: string; label: string }

export function AssetRegisterPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const { mutateAsync, isPending } = useRegisterAsset();

  const { data: catData } = useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: { id: string; name: string }[] }>('/categories?view=flat');
      return r.data.data;
    },
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: { id: string; name: string; code: string }[] }>('/departments');
      return r.data.data;
    },
  });

  const categoryOptions: Option[] = (catData ?? []).map((c) => ({ value: c.id, label: c.name }));
  const deptOptions: Option[]     = (deptData ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }));

  const handleSubmit = async (values: RegisterAssetPayload | UpdateAssetPayload) => {
    // Safe cast: in register mode, the form always produces a full RegisterAssetPayload
    const registerPayload = values as RegisterAssetPayload;
    try {
      const asset = await mutateAsync(registerPayload);
      toast.success('Asset registered!', `${asset.assetTag} — ${asset.name} has been added.`);
      navigate(`/assets/${asset.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      toast.error(
        'Registration failed',
        axiosErr.response?.data?.message ?? 'An unexpected error occurred.',
      );
    }
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        animation: 'fadeIn 0.3s ease both',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={15} />}
          onClick={() => navigate('/assets')}
        >
          Back
        </Button>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Register New Asset</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 3 }}>
            Fill in the details below to add a new asset to the registry
          </p>
        </div>
      </div>

      {/* Notice banner */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-5)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-light)',
          border: '1px solid var(--color-accent)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 600 }}>ℹ</span>
        Asset will be created in <strong>DRAFT</strong> status. Publish it to make it available for
        allocation or booking.
      </div>

      {/* Form */}
      <AssetForm
        mode="register"
        categories={categoryOptions}
        departments={deptOptions}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/assets')}
        loading={isPending}
      />
    </div>
  );
}

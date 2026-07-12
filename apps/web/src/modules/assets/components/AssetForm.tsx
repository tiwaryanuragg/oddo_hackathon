import React from 'react';
import { AssetCondition } from '@assetflow/shared';
import { Input, Select, Textarea } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { RegisterAssetPayload, UpdateAssetPayload } from '../api/assets.api';

interface CategoryOption { value: string; label: string }
interface DeptOption     { value: string; label: string }

interface AssetFormProps {
  mode:         'register' | 'edit';
  initialValues?: Partial<RegisterAssetPayload>;
  categories:   CategoryOption[];
  departments:  DeptOption[];
  onSubmit:     (values: RegisterAssetPayload | UpdateAssetPayload) => Promise<void>;
  onCancel:     () => void;
  loading:      boolean;
}

const CONDITION_OPTIONS = [
  { value: AssetCondition.NEW,     label: 'New'     },
  { value: AssetCondition.GOOD,    label: 'Good'    },
  { value: AssetCondition.FAIR,    label: 'Fair'    },
  { value: AssetCondition.POOR,    label: 'Poor'    },
  { value: AssetCondition.DAMAGED, label: 'Damaged' },
];

type FormValues = {
  name:          string;
  description:   string;
  categoryId:    string;
  departmentId:  string;
  serialNumber:  string;
  manufacturer:  string;
  model:         string;
  location:      string;
  condition:     string;
  purchaseDate:  string;
  purchaseCost:  string;
  warrantyExpiry: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim())       errors.name = 'Asset name is required';
  if (!values.categoryId)        errors.categoryId = 'Category is required';
  if (values.purchaseCost && isNaN(Number(values.purchaseCost)))
    errors.purchaseCost = 'Must be a valid number';
  if (values.purchaseCost && Number(values.purchaseCost) < 0)
    errors.purchaseCost = 'Cannot be negative';
  return errors;
}

export function AssetForm({
  mode, initialValues, categories, departments,
  onSubmit, onCancel, loading,
}: AssetFormProps) {
  const [values, setValues] = React.useState<FormValues>({
    name:          initialValues?.name ?? '',
    description:   initialValues?.description ?? '',
    categoryId:    initialValues?.categoryId ?? '',
    departmentId:  initialValues?.departmentId ?? '',
    serialNumber:  initialValues?.serialNumber ?? '',
    manufacturer:  initialValues?.manufacturer ?? '',
    model:         initialValues?.model ?? '',
    location:      initialValues?.location ?? '',
    condition:     initialValues?.condition ?? AssetCondition.NEW,
    purchaseDate:  initialValues?.purchaseDate
      ? new Date(initialValues.purchaseDate).toISOString().split('T')[0]!
      : '',
    purchaseCost:  initialValues?.purchaseCost?.toString() ?? '',
    warrantyExpiry: initialValues?.warrantyExpiry
      ? new Date(initialValues.warrantyExpiry).toISOString().split('T')[0]!
      : '',
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof FormValues, boolean>>>({});

  const set = (field: keyof FormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (touched[field]) {
      const errs = validate({ ...values, [field]: value });
      setErrors((e) => ({ ...e, [field]: errs[field] }));
    }
  };

  const touch = (field: keyof FormValues) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const errs = validate(values);
    setErrors((e) => ({ ...e, [field]: errs[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.keys(values).reduce<Partial<Record<keyof FormValues, boolean>>>(
      (acc, k) => ({ ...acc, [k]: true }),
      {},
    );
    setTouched(allTouched);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload: RegisterAssetPayload = {
      name:         values.name.trim(),
      description:  values.description.trim() || undefined,
      categoryId:   values.categoryId,
      departmentId: values.departmentId || undefined,
      serialNumber: values.serialNumber.trim() || undefined,
      manufacturer: values.manufacturer.trim() || undefined,
      model:        values.model.trim() || undefined,
      location:     values.location.trim() || undefined,
      condition:    values.condition as AssetCondition,
      purchaseDate: values.purchaseDate || undefined,
      purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
      warrantyExpiry: values.warrantyExpiry || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

        {/* Section: Basic Info */}
        <Card title="Basic Information" subtitle="Core identification details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              id="asset-name"
              label="Asset Name"
              placeholder="e.g., Dell Latitude 5540 Laptop"
              required
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => touch('name')}
              error={touched.name ? errors.name : undefined}
            />
            <Textarea
              id="asset-description"
              label="Description"
              placeholder="Optional — add any relevant notes about this asset…"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Select
                id="asset-category"
                label="Category"
                placeholder="Select a category"
                required
                options={categories}
                value={values.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                onBlur={() => touch('categoryId')}
                error={touched.categoryId ? errors.categoryId : undefined}
              />
              <Select
                id="asset-department"
                label="Department"
                placeholder="No department"
                options={departments}
                value={values.departmentId}
                onChange={(e) => set('departmentId', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Select
                id="asset-condition"
                label="Condition"
                options={CONDITION_OPTIONS}
                value={values.condition}
                onChange={(e) => set('condition', e.target.value)}
              />
              <Input
                id="asset-location"
                label="Location"
                placeholder="e.g., Floor 2, Desk 14"
                value={values.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Section: Hardware Details */}
        <Card title="Hardware Details" subtitle="Manufacturer, model, and serial number">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input
              id="asset-manufacturer"
              label="Manufacturer"
              placeholder="e.g., Dell, Apple, HP"
              value={values.manufacturer}
              onChange={(e) => set('manufacturer', e.target.value)}
            />
            <Input
              id="asset-model"
              label="Model"
              placeholder="e.g., Latitude 5540"
              value={values.model}
              onChange={(e) => set('model', e.target.value)}
            />
            <Input
              id="asset-serial"
              label="Serial Number"
              placeholder="Unique hardware serial"
              value={values.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
            />
          </div>
        </Card>

        {/* Section: Financial */}
        <Card title="Financial Details" subtitle="Cost, warranty, and depreciation basis">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Input
              id="asset-purchase-date"
              label="Purchase Date"
              type="date"
              value={values.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
            />
            <Input
              id="asset-purchase-cost"
              label="Purchase Cost (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={values.purchaseCost}
              onChange={(e) => set('purchaseCost', e.target.value)}
              onBlur={() => touch('purchaseCost')}
              error={touched.purchaseCost ? errors.purchaseCost : undefined}
            />
            <Input
              id="asset-warranty"
              label="Warranty Expiry"
              type="date"
              value={values.warrantyExpiry}
              onChange={(e) => set('warrantyExpiry', e.target.value)}
              hint="Leave blank if no warranty"
            />
          </div>
        </Card>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-2)',
          }}
        >
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {mode === 'register' ? 'Register Asset' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}

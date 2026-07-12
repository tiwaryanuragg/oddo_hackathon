import type { AssetFull, AssetEventFull } from './asset.repository.js';
import type { AssetStatus, AssetCondition } from '@assetflow/shared';

// ─── Asset DTOs ───────────────────────────────────────────────────────────────

export interface AssetUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface AssetCategoryRef {
  id: string;
  name: string;
  slug: string;
  defaultDepreciationRate: number | null;
  defaultUsefulLifeMonths: number | null;
}

export interface AssetDepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface AssetDto {
  id: string;
  assetTag: string;
  name: string;
  description: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  currentValue: number | null;
  warrantyExpiry: string | null;
  qrCodeUrl: string | null;
  category: AssetCategoryRef;
  department: AssetDepartmentRef | null;
  assignedTo: AssetUserRef | null;
  registeredBy: Pick<AssetUserRef, 'id' | 'firstName' | 'lastName' | 'email'>;
  eventCount: number;
  allocationCount: number;
  maintenanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetEventDto {
  id: string;
  assetId: string;
  type: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  actor: Pick<AssetUserRef, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'> | null;
  createdAt: string;
}

export interface DepreciationDto {
  assetId: string;
  purchaseCost: number | null;
  purchaseDate: string | null;
  usefulLifeMonths: number | null;
  annualDepreciationRate: number | null;
  currentBookValue: number | null;
  totalDepreciation: number | null;
  depreciationPercent: number | null;
  remainingLifeMonths: number | null;
  isFullyDepreciated: boolean;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function toAssetDto(a: AssetFull): AssetDto {
  return {
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    description: a.description,
    status: a.status as AssetStatus,
    condition: a.condition as AssetCondition,
    serialNumber: a.serialNumber,
    manufacturer: a.manufacturer,
    model: a.model,
    location: a.location,
    purchaseDate: a.purchaseDate?.toISOString() ?? null,
    purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : null,
    currentValue: a.currentValue ? Number(a.currentValue) : null,
    warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    qrCodeUrl: a.qrCodeUrl,
    category: {
      id: a.category.id,
      name: a.category.name,
      slug: a.category.slug,
      defaultDepreciationRate: a.category.defaultDepreciationRate
        ? Number(a.category.defaultDepreciationRate)
        : null,
      defaultUsefulLifeMonths: a.category.defaultUsefulLifeMonths,
    },
    department: a.department
      ? { id: a.department.id, name: a.department.name, code: a.department.code }
      : null,
    assignedTo: a.assignedTo
      ? {
          id: a.assignedTo.id,
          firstName: a.assignedTo.firstName,
          lastName: a.assignedTo.lastName,
          email: a.assignedTo.email,
          avatarUrl: a.assignedTo.avatarUrl ?? null,
        }
      : null,
    registeredBy: {
      id: a.registeredBy.id,
      firstName: a.registeredBy.firstName,
      lastName: a.registeredBy.lastName,
      email: a.registeredBy.email,
    },
    eventCount: a._count.events,
    allocationCount: a._count.allocations,
    maintenanceCount: a._count.maintenanceRequests,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toAssetEventDto(e: AssetEventFull): AssetEventDto {
  return {
    id: e.id,
    assetId: e.assetId,
    type: e.type,
    fromStatus: (e.fromStatus as AssetStatus) ?? null,
    toStatus: (e.toStatus as AssetStatus) ?? null,
    note: e.note,
    metadata: (e.metadata as Record<string, unknown>) ?? null,
    actor: e.actor
      ? {
          id: e.actor.id,
          firstName: e.actor.firstName,
          lastName: e.actor.lastName,
          email: e.actor.email,
          avatarUrl: e.actor.avatarUrl ?? null,
        }
      : null,
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * Straight-line depreciation calculation.
 * currentValue = purchaseCost - (purchaseCost / usefulLifeYears) × yearsElapsed
 */
export function calcDepreciation(asset: AssetFull): DepreciationDto {
  const purchaseCost = asset.purchaseCost ? Number(asset.purchaseCost) : null;
  const purchaseDate = asset.purchaseDate ?? null;

  const usefulLifeMonths =
    asset.category.defaultUsefulLifeMonths ?? 60; // 5 years default

  const annualRate =
    asset.category.defaultDepreciationRate
      ? Number(asset.category.defaultDepreciationRate)
      : (100 / (usefulLifeMonths / 12));

  if (!purchaseCost || !purchaseDate) {
    return {
      assetId: asset.id,
      purchaseCost,
      purchaseDate: purchaseDate?.toISOString() ?? null,
      usefulLifeMonths,
      annualDepreciationRate: annualRate,
      currentBookValue: purchaseCost,
      totalDepreciation: null,
      depreciationPercent: null,
      remainingLifeMonths: null,
      isFullyDepreciated: false,
    };
  }

  const now = new Date();
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const monthsElapsed = Math.max(
    0,
    (now.getTime() - purchaseDate.getTime()) / msPerMonth,
  );

  const monthlyDepreciation = purchaseCost / usefulLifeMonths;
  const totalDepreciation = Math.min(
    monthlyDepreciation * monthsElapsed,
    purchaseCost,
  );
  const currentBookValue = Math.max(0, purchaseCost - totalDepreciation);
  const depreciationPercent = Math.min(100, (monthsElapsed / usefulLifeMonths) * 100);
  const remainingLifeMonths = Math.max(0, usefulLifeMonths - monthsElapsed);
  const isFullyDepreciated = currentBookValue <= 0;

  return {
    assetId: asset.id,
    purchaseCost,
    purchaseDate: purchaseDate.toISOString(),
    usefulLifeMonths,
    annualDepreciationRate: annualRate,
    currentBookValue: Number(currentBookValue.toFixed(2)),
    totalDepreciation: Number(totalDepreciation.toFixed(2)),
    depreciationPercent: Number(depreciationPercent.toFixed(2)),
    remainingLifeMonths: Number(remainingLifeMonths.toFixed(1)),
    isFullyDepreciated,
  };
}

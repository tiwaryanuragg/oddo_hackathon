import { apiClient } from '../../../lib/api-client';
import type { AssetStatus, AssetCondition } from '@assetflow/shared';

// ─── Types (mirroring backend DTOs) ──────────────────────────────────────────

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

export interface Asset {
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
  registeredBy: Omit<AssetUserRef, 'avatarUrl'>;
  eventCount: number;
  allocationCount: number;
  maintenanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetEvent {
  id: string;
  assetId: string;
  type: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  actor: AssetUserRef | null;
  createdAt: string;
}

export interface DepreciationInfo {
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

export interface AssetListFilters {
  search?: string;
  status?: string;
  condition?: string;
  categoryId?: string;
  departmentId?: string;
  assignedToId?: string;
  purchasedAfter?: string;
  purchasedBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedAssets {
  items: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RegisterAssetPayload {
  name: string;
  description?: string;
  categoryId: string;
  departmentId?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  condition?: AssetCondition;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
}

export interface UpdateAssetPayload extends Partial<RegisterAssetPayload> {
  assignedToId?: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

type ApiResponse<T> = { success: boolean; data: T };

export const assetsApi = {
  list: async (filters: AssetListFilters = {}): Promise<PaginatedAssets> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null),
    );
    const { data } = await apiClient.get<ApiResponse<PaginatedAssets>>('/assets', { params });
    return data.data;
  },

  get: async (id: string): Promise<Asset> => {
    const { data } = await apiClient.get<ApiResponse<Asset>>(`/assets/${id}`);
    return data.data;
  },

  register: async (payload: RegisterAssetPayload): Promise<Asset> => {
    const { data } = await apiClient.post<ApiResponse<Asset>>('/assets', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateAssetPayload): Promise<Asset> => {
    const { data } = await apiClient.patch<ApiResponse<Asset>>(`/assets/${id}`, payload);
    return data.data;
  },

  changeStatus: async (id: string, status: AssetStatus, note?: string): Promise<Asset> => {
    const { data } = await apiClient.patch<ApiResponse<Asset>>(`/assets/${id}/status`, { status, note });
    return data.data;
  },

  retire: async (id: string, reason: string): Promise<Asset> => {
    const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/retire`, { reason });
    return data.data;
  },

  getHistory: async (id: string): Promise<AssetEvent[]> => {
    const { data } = await apiClient.get<ApiResponse<AssetEvent[]>>(`/assets/${id}/history`);
    return data.data;
  },

  getQrUrl: (id: string, format: 'svg' | 'png' = 'svg'): string =>
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/assets/${id}/qr?format=${format}`,

  getDepreciation: async (id: string): Promise<DepreciationInfo> => {
    const { data } = await apiClient.get<ApiResponse<DepreciationInfo>>(
      `/assets/${id}/depreciation`,
    );
    return data.data;
  },
};

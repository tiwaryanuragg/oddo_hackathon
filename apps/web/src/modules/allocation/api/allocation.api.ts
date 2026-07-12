import { apiClient } from '../../../lib/api-client';
import type {
  AllocationStatus,
  TransferStatus,
  ReturnStatus,
  AssetCondition,
  AssetStatus,
} from '@assetflow/shared';

// ─── Shared reference types ───────────────────────────────────────────────────

export interface UserRefDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}

export interface AssetRefDto {
  id: string;
  assetTag: string;
  name: string;
  status: AssetStatus;
  condition: AssetCondition;
  location: string | null;
  category: { id: string; name: string };
  department: { id: string; name: string; code: string } | null;
}

// ─── Return DTO ───────────────────────────────────────────────────────────────

export interface ReturnDto {
  id: string;
  allocationId: string;
  status: ReturnStatus;
  reportedCondition: AssetCondition;
  note: string | null;
  decidedAt: string | null;
  submittedBy: UserRefDto;
  processedBy: UserRefDto | null;
  createdAt: string;
  updatedAt: string;
  allocation?: {
    id: string;
    status: AllocationStatus;
    asset: AssetRefDto;
    holder: UserRefDto;
  };
}

// ─── Allocation DTO ───────────────────────────────────────────────────────────

export interface AllocationDto {
  id: string;
  asset: AssetRefDto;
  holder: UserRefDto;
  issuedBy: UserRefDto;
  status: AllocationStatus;
  allocatedAt: string;
  dueDate: string | null;
  returnedAt: string | null;
  note: string | null;
  returns: ReturnDto[];
  pendingTransfer: TransferDto | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Transfer DTO ─────────────────────────────────────────────────────────────

export interface TransferDto {
  id: string;
  asset: AssetRefDto;
  allocationId: string | null;
  status: TransferStatus;
  fromUser: UserRefDto;
  toUser: UserRefDto;
  requestedBy: UserRefDto;
  approver: UserRefDto | null;
  reason: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Paginated wrapper ────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Filters / query types ────────────────────────────────────────────────────

export interface AllocationFilters {
  status?: AllocationStatus;
  holderId?: string;
  assetId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'allocatedAt' | 'dueDate' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface TransferFilters {
  status?: TransferStatus;
  assetId?: string;
  fromUserId?: string;
  toUserId?: string;
  page?: number;
  limit?: number;
}

export interface ReturnFilters {
  status?: ReturnStatus;
  allocationId?: string;
  page?: number;
  limit?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface IssueAllocationPayload {
  assetId: string;
  holderId: string;
  dueDate?: string;
  note?: string;
}

export interface RevokeAllocationPayload {
  reason: string;
}

export interface CreateTransferPayload {
  assetId: string;
  toUserId: string;
  reason?: string;
}

export interface DecideTransferPayload {
  decision: 'approve' | 'reject';
  decisionNote?: string;
}

export interface RequestReturnPayload {
  allocationId: string;
  reportedCondition: AssetCondition;
  note?: string;
}

export interface ProcessReturnPayload {
  decision: 'approve' | 'reject';
  note?: string;
}

// ─── API helper ───────────────────────────────────────────────────────────────

type ApiResponse<T> = { success: boolean; data: T };

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  );
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const allocationApi = {
  // ── Allocations ────────────────────────────────────────────────────────────

  listAllocations: async (filters: AllocationFilters = {}): Promise<Paginated<AllocationDto>> => {
    const { data } = await apiClient.get<ApiResponse<Paginated<AllocationDto>>>(
      '/allocations',
      { params: clean(filters as Record<string, unknown>) },
    );
    return data.data;
  },

  getAllocation: async (id: string): Promise<AllocationDto> => {
    const { data } = await apiClient.get<ApiResponse<AllocationDto>>(`/allocations/${id}`);
    return data.data;
  },

  issueAllocation: async (payload: IssueAllocationPayload): Promise<AllocationDto> => {
    const { data } = await apiClient.post<ApiResponse<AllocationDto>>('/allocations', payload);
    return data.data;
  },

  revokeAllocation: async (id: string, payload: RevokeAllocationPayload): Promise<AllocationDto> => {
    const { data } = await apiClient.delete<ApiResponse<AllocationDto>>(
      `/allocations/${id}`,
      { data: payload },
    );
    return data.data;
  },

  // ── Transfers ──────────────────────────────────────────────────────────────

  listTransfers: async (filters: TransferFilters = {}): Promise<Paginated<TransferDto>> => {
    const { data } = await apiClient.get<ApiResponse<Paginated<TransferDto>>>(
      '/allocations/transfers',
      { params: clean(filters as Record<string, unknown>) },
    );
    return data.data;
  },

  getTransfer: async (id: string): Promise<TransferDto> => {
    const { data } = await apiClient.get<ApiResponse<TransferDto>>(
      `/allocations/transfers/${id}`,
    );
    return data.data;
  },

  requestTransfer: async (payload: CreateTransferPayload): Promise<TransferDto> => {
    const { data } = await apiClient.post<ApiResponse<TransferDto>>(
      '/allocations/transfers',
      payload,
    );
    return data.data;
  },

  decideTransfer: async (id: string, payload: DecideTransferPayload): Promise<TransferDto> => {
    const { data } = await apiClient.patch<ApiResponse<TransferDto>>(
      `/allocations/transfers/${id}/decide`,
      payload,
    );
    return data.data;
  },

  cancelTransfer: async (id: string): Promise<TransferDto> => {
    const { data } = await apiClient.delete<ApiResponse<TransferDto>>(
      `/allocations/transfers/${id}`,
    );
    return data.data;
  },

  // ── Returns ────────────────────────────────────────────────────────────────

  listReturns: async (filters: ReturnFilters = {}): Promise<Paginated<ReturnDto>> => {
    const { data } = await apiClient.get<ApiResponse<Paginated<ReturnDto>>>(
      '/allocations/returns',
      { params: clean(filters as Record<string, unknown>) },
    );
    return data.data;
  },

  getReturn: async (id: string): Promise<ReturnDto> => {
    const { data } = await apiClient.get<ApiResponse<ReturnDto>>(
      `/allocations/returns/${id}`,
    );
    return data.data;
  },

  requestReturn: async (payload: RequestReturnPayload): Promise<ReturnDto> => {
    const { data } = await apiClient.post<ApiResponse<ReturnDto>>(
      '/allocations/returns',
      payload,
    );
    return data.data;
  },

  processReturn: async (id: string, payload: ProcessReturnPayload): Promise<ReturnDto> => {
    const { data } = await apiClient.patch<ApiResponse<ReturnDto>>(
      `/allocations/returns/${id}/process`,
      payload,
    );
    return data.data;
  },
};

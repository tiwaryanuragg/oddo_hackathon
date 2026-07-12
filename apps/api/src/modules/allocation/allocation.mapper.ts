import type {
  AllocationFull,
  TransferFull,
  ReturnFull,
} from './allocation.repository.js';
import type { AssetCondition, AssetStatus } from '@assetflow/shared';
import type { AllocationStatus, TransferStatus, ReturnStatus } from '@assetflow/shared';

// ─── User reference ───────────────────────────────────────────────────────────

export interface UserRefDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}

// ─── Asset reference ──────────────────────────────────────────────────────────

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
  // When coming from a standalone return query, include allocation context
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

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapUserRef(u: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}): UserRefDto {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    avatarUrl: u.avatarUrl,
    jobTitle: u.jobTitle,
    departmentId: u.departmentId,
  };
}

function mapAssetRef(a: {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  condition: string;
  location: string | null;
  category: { id: string; name: string };
  department: { id: string; name: string; code: string } | null;
}): AssetRefDto {
  return {
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    status: a.status as AssetStatus,
    condition: a.condition as AssetCondition,
    location: a.location,
    category: a.category,
    department: a.department,
  };
}

function mapReturnDto(r: {
  id: string;
  allocationId: string;
  status: string;
  reportedCondition: string;
  note: string | null;
  decidedAt: Date | null;
  submittedBy: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null; jobTitle: string | null; departmentId: string | null };
  processedBy: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null; jobTitle: string | null; departmentId: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}): ReturnDto {
  return {
    id: r.id,
    allocationId: r.allocationId,
    status: r.status as ReturnStatus,
    reportedCondition: r.reportedCondition as AssetCondition,
    note: r.note,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    submittedBy: mapUserRef(r.submittedBy),
    processedBy: r.processedBy ? mapUserRef(r.processedBy) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toAllocationDto(a: AllocationFull): AllocationDto {
  const pendingTransfer = a.transferRequests[0]
    ? mapTransferFromAllocationInclude(a.transferRequests[0])
    : null;

  return {
    id: a.id,
    asset: mapAssetRef(a.asset),
    holder: mapUserRef(a.holder),
    issuedBy: mapUserRef(a.issuedBy),
    status: a.status as AllocationStatus,
    allocatedAt: a.allocatedAt.toISOString(),
    dueDate: a.dueDate?.toISOString() ?? null,
    returnedAt: a.returnedAt?.toISOString() ?? null,
    note: a.note,
    returns: a.returns.map(mapReturnDto),
    pendingTransfer,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function mapTransferFromAllocationInclude(t: AllocationFull['transferRequests'][number]): TransferDto {
  return {
    id: t.id,
    asset: mapAssetRef(t as never), // asset is on the parent allocation
    allocationId: (t as { allocationId?: string | null }).allocationId ?? null,
    status: t.status as TransferStatus,
    fromUser: mapUserRef(t.fromUser),
    toUser: mapUserRef(t.toUser),
    requestedBy: mapUserRef(t as never),
    approver: null,
    reason: t.reason,
    decisionNote: (t as { decisionNote?: string | null }).decisionNote ?? null,
    decidedAt: (t as { decidedAt?: Date | null }).decidedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toTransferDto(t: TransferFull): TransferDto {
  return {
    id: t.id,
    asset: mapAssetRef(t.asset),
    allocationId: t.allocationId,
    status: t.status as TransferStatus,
    fromUser: mapUserRef(t.fromUser),
    toUser: mapUserRef(t.toUser),
    requestedBy: mapUserRef(t.requestedBy),
    approver: t.approver ? mapUserRef(t.approver) : null,
    reason: t.reason,
    decisionNote: t.decisionNote,
    decidedAt: t.decidedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toReturnDto(r: ReturnFull): ReturnDto {
  return {
    id: r.id,
    allocationId: r.allocationId,
    status: r.status as ReturnStatus,
    reportedCondition: r.reportedCondition as AssetCondition,
    note: r.note,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    submittedBy: mapUserRef(r.submittedBy),
    processedBy: r.processedBy ? mapUserRef(r.processedBy) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    allocation: {
      id: r.allocation.id,
      status: r.allocation.status as AllocationStatus,
      asset: mapAssetRef(r.allocation.asset),
      holder: mapUserRef(r.allocation.holder),
    },
  };
}

// ─── Paginated wrappers ───────────────────────────────────────────────────────

export interface PaginatedAllocations {
  items: AllocationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedTransfers {
  items: TransferDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedReturns {
  items: ReturnDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
